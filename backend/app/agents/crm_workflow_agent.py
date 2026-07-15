"""
CRM Workflow Agent — explicit step-by-step LangGraph pipeline.

Graph topology
──────────────

  START
    │
    ▼
  understand_request          Classify user intent into one of five categories.
    │
    ├─ needs_clarification ──► clarify ──► (back to understand_request)
    │
    └─ intent_clear ──────────►
                               │
                               ▼
                             choose_tool     Map intent → specific CRM tool.
                               │
                               ├─ unknown ──► unknown_tool ──► return_response
                               │
                               └─ known ─────►
                                              │
                                              ▼
                                           execute_tool   Run the chosen tool.
                                              │
                                              ├─ error ──► handle_error ──► return_response
                                              │
                                              └─ ok ─────► return_response
                                                              │
                                                              ▼
                                                            END

Every transition that branches is driven by a conditional edge function.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
from typing import Annotated, Any, Optional

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.tools import BaseTool
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from typing_extensions import TypedDict

from app.agents.crm_tools import (
    doctor_profile,
    edit_interaction,
    follow_up_reminders,
    log_interaction,
    search_interactions,
)
from app.core.llm import get_llm, get_llm_deterministic

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — Tool registry
# ══════════════════════════════════════════════════════════════════════════════

# Map tool name strings → actual tool callables so execute_tool can dispatch.
TOOL_REGISTRY: dict[str, BaseTool] = {
    "log_interaction":     log_interaction,
    "edit_interaction":    edit_interaction,
    "search_interactions": search_interactions,
    "doctor_profile":      doctor_profile,
    "follow_up_reminders": follow_up_reminders,
}

# Human-readable description injected into LLM prompts.
TOOL_DESCRIPTIONS = """
Available tools:
  • log_interaction       — Record a new doctor interaction from natural language.
  • edit_interaction      — Update fields of an existing interaction by UUID.
  • search_interactions   — Search interactions by doctor name or date range.
  • doctor_profile        — View a doctor's full history and pending follow-ups.
  • follow_up_reminders   — List upcoming follow-up reminders (configurable window).
"""

# ── Intent labels ──────────────────────────────────────────────────────────────
KNOWN_INTENTS = {
    "log_interaction",
    "edit_interaction",
    "search_interactions",
    "doctor_profile",
    "follow_up_reminders",
}


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — State schema
# ══════════════════════════════════════════════════════════════════════════════

class WorkflowState(TypedDict):
    """
    Shared mutable state passed between every node.

    ── Conversation ──────────────────────────────────────────────────────────
    messages          Full history (HumanMessage / AIMessage / SystemMessage).
                      Merged automatically by add_messages.

    ── Node outputs ──────────────────────────────────────────────────────────
    user_message      Raw text of the latest user turn.
    intent            Intent label set by understand_request.
                      One of KNOWN_INTENTS, or "unknown".
    clarification_needed
                      True when understand_request cannot confidently classify.
    clarification_question
                      The question to ask the user (set alongside the flag).

    selected_tool     Name of the tool chosen by choose_tool.
    tool_input        Dict of kwargs to pass into the chosen tool.

    tool_result       String output returned by execute_tool on success.
    error             Error description set on any failure; drives error routing.

    final_response    The polished reply produced by return_response.
    """

    # Conversation history
    messages: Annotated[list, add_messages]

    # Pipeline fields
    user_message:            str
    intent:                  Optional[str]
    clarification_needed:    bool
    clarification_question:  Optional[str]
    selected_tool:           Optional[str]
    tool_input:              Optional[dict]
    tool_result:             Optional[str]
    error:                   Optional[str]
    final_response:          Optional[str]


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — Helper: JSON extraction
# ══════════════════════════════════════════════════════════════════════════════

def _extract_json(text: str) -> dict:
    """
    Pull the first JSON object from *text*, stripping markdown fences.
    Raises ValueError if no valid JSON object is found.
    """
    text = re.sub(r"^```(?:json)?\s*", "", text.strip())
    text = re.sub(r"\s*```$", "", text)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"No JSON object found in LLM output:\n{text}")
    return json.loads(match.group())


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — Nodes
# ══════════════════════════════════════════════════════════════════════════════

# ─────────────────────────────────────────────────────────────────────────────
# Node 1 — understand_request
# ─────────────────────────────────────────────────────────────────────────────

async def understand_request(state: WorkflowState) -> dict[str, Any]:
    """
    Classify the user's message into one of the five CRM intents.

    The LLM is asked to return a JSON object with two keys:
        intent               — one of KNOWN_INTENTS or "unknown"
        clarification_needed — true | false
        clarification_question — string if clarification_needed else null

    If the model cannot determine intent confidently it sets
    clarification_needed=true and provides a clarifying question.

    Reads:  user_message (or last HumanMessage if not set)
    Writes: intent, clarification_needed, clarification_question
    """
    # Resolve the current user message
    user_msg: str = state.get("user_message", "")
    if not user_msg:
        for m in reversed(state.get("messages", [])):
            if isinstance(m, HumanMessage):
                user_msg = m.content
                break

    prompt = f"""You are the intent-classification layer of a medical CRM assistant.
{TOOL_DESCRIPTIONS}
Classify the user's request into exactly one intent from the list above.

Rules:
1. If the request clearly maps to one intent, set clarification_needed to false.
2. If the request is ambiguous or missing required information, set
   clarification_needed to true and write a short clarifying question.
3. Return ONLY a JSON object — no markdown, no explanation.

JSON schema:
{{
  "intent": "<one of the five intent names, or 'unknown'>",
  "clarification_needed": <true|false>,
  "clarification_question": "<question string or null>"
}}

User request:
\"\"\"{user_msg}\"\"\"
"""

    try:
        llm = get_llm_deterministic()
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        data = _extract_json(response.content)

        intent: str = data.get("intent", "unknown")
        if intent not in KNOWN_INTENTS:
            intent = "unknown"

        clarification_needed: bool = bool(data.get("clarification_needed", False))
        clarification_question: Optional[str] = data.get("clarification_question")

        logger.info(
            "understand_request → intent=%s, clarification=%s",
            intent,
            clarification_needed,
        )
        return {
            "user_message": user_msg,
            "intent": intent,
            "clarification_needed": clarification_needed,
            "clarification_question": clarification_question,
            # Reset downstream fields so stale values don't leak between turns
            "selected_tool": None,
            "tool_input": None,
            "tool_result": None,
            "error": None,
            "final_response": None,
        }

    except Exception as exc:
        logger.error("understand_request failed: %s", exc)
        return {
            "user_message": user_msg,
            "intent": "unknown",
            "clarification_needed": False,
            "clarification_question": None,
            "error": f"Intent classification failed: {exc}",
        }


# ─────────────────────────────────────────────────────────────────────────────
# Node 2 — clarify
# ─────────────────────────────────────────────────────────────────────────────

async def clarify(state: WorkflowState) -> dict[str, Any]:
    """
    Ask the user a clarifying question when the intent is ambiguous.

    In a real application this node would pause the graph and wait for the
    user's follow-up message (using LangGraph's interrupt mechanism).
    Here it surfaces the question as the final_response so the API/CLI
    layer can return it to the user and resume on the next turn.

    Reads:  clarification_question
    Writes: final_response, messages
    """
    question = (
        state.get("clarification_question")
        or "Could you please provide more details about what you'd like to do?"
    )
    clarification_msg = AIMessage(content=question)
    return {
        "final_response": question,
        "messages": [clarification_msg],
    }


# ─────────────────────────────────────────────────────────────────────────────
# Node 3 — choose_tool
# ─────────────────────────────────────────────────────────────────────────────

async def choose_tool(state: WorkflowState) -> dict[str, Any]:
    """
    Map the classified intent to a specific tool and build its input arguments.

    The LLM is given the user message and the intent label and must return a
    JSON object containing:
        tool_name   — one of TOOL_REGISTRY keys (should match intent)
        tool_input  — dict of keyword arguments for that tool

    Reads:  user_message, intent
    Writes: selected_tool, tool_input
    """
    user_msg = state.get("user_message", "")
    intent = state.get("intent", "unknown")

    # Tool-specific argument hints injected into the prompt
    arg_hints = {
        "log_interaction": (
            'tool_input must contain:\n'
            '  "natural_language_input": "<the user\'s raw message verbatim>"'
        ),
        "edit_interaction": (
            'tool_input must contain:\n'
            '  "interaction_id": "<UUID string>"\n'
            '  and at least one optional field to update:\n'
            '  "interaction_type", "products_discussed", "summary",\n'
            '  "notes", "follow_up_date" (YYYY-MM-DD), "status"'
        ),
        "search_interactions": (
            'tool_input may contain any of:\n'
            '  "doctor_name": "<partial name>"\n'
            '  "date_from": "YYYY-MM-DD"\n'
            '  "date_to": "YYYY-MM-DD"\n'
            '  "interaction_type": "visit|call|email|conference|virtual"\n'
            '  "limit": <int, default 10>'
        ),
        "doctor_profile": (
            'tool_input must contain:\n'
            '  "doctor_name": "<partial or full name>"'
        ),
        "follow_up_reminders": (
            'tool_input may contain:\n'
            '  "days_ahead": <int, default 7>\n'
            '  "doctor_name": "<optional filter>"'
        ),
    }

    hint = arg_hints.get(intent, "tool_input should be an empty dict {}.")

    prompt = f"""You are the tool-selection layer of a medical CRM assistant.
The user's intent has been classified as: "{intent}"

{hint}

Extract the tool arguments from the user's message.
Return ONLY a JSON object — no markdown, no explanation.

JSON schema:
{{
  "tool_name": "{intent}",
  "tool_input": {{ ... }}
}}

User message:
\"\"\"{user_msg}\"\"\"
"""

    try:
        llm = get_llm_deterministic()
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        data = _extract_json(response.content)

        tool_name: str = data.get("tool_name", intent)
        tool_input: dict = data.get("tool_input", {})

        # Ensure tool_input is always a dict
        if not isinstance(tool_input, dict):
            tool_input = {}

        logger.info("choose_tool → tool=%s, input=%s", tool_name, tool_input)
        return {"selected_tool": tool_name, "tool_input": tool_input}

    except Exception as exc:
        logger.error("choose_tool failed: %s", exc)
        return {
            "selected_tool": None,
            "tool_input": {},
            "error": f"Tool selection failed: {exc}",
        }


# ─────────────────────────────────────────────────────────────────────────────
# Node 4 — unknown_tool
# ─────────────────────────────────────────────────────────────────────────────

async def unknown_tool(state: WorkflowState) -> dict[str, Any]:
    """
    Handle requests that don't match any known tool.

    Produces a polite message listing what the agent can do.

    Reads:  user_message
    Writes: error, tool_result
    """
    supported = "\n".join(f"  • {name}" for name in TOOL_REGISTRY)
    message = (
        f"I'm not sure how to help with that. "
        f"Here's what I can do:\n{supported}\n\n"
        f"Please rephrase your request with one of these actions."
    )
    return {"tool_result": message, "error": None}


# ─────────────────────────────────────────────────────────────────────────────
# Node 5 — execute_tool
# ─────────────────────────────────────────────────────────────────────────────

async def execute_tool(state: WorkflowState) -> dict[str, Any]:
    """
    Invoke the selected tool with the extracted input arguments.

    Tool functions are LangChain @tool callables — they are invoked via
    .ainvoke(input_dict) which handles argument mapping automatically.

    Reads:  selected_tool, tool_input
    Writes: tool_result  on success
            error        on failure
    """
    tool_name: str = state.get("selected_tool", "")
    tool_input: dict = state.get("tool_input") or {}

    tool = TOOL_REGISTRY.get(tool_name)
    if not tool:
        return {"error": f"Tool '{tool_name}' not found in registry."}

    try:
        logger.info("execute_tool → calling %s(%s)", tool_name, tool_input)
        result: str = await tool.ainvoke(tool_input)
        logger.info("execute_tool → %s completed successfully", tool_name)
        return {"tool_result": str(result), "error": None}

    except Exception as exc:
        logger.error("execute_tool → %s raised: %s", tool_name, exc)
        return {
            "tool_result": None,
            "error": f"Tool '{tool_name}' raised an exception: {exc}",
        }


# ─────────────────────────────────────────────────────────────────────────────
# Node 6 — handle_error
# ─────────────────────────────────────────────────────────────────────────────

async def handle_error(state: WorkflowState) -> dict[str, Any]:
    """
    Format an execution error into a user-friendly message and log it.

    Reads:  error, selected_tool
    Writes: tool_result  (formatted error message passed to return_response)
    """
    error = state.get("error", "An unknown error occurred.")
    tool_name = state.get("selected_tool", "unknown tool")

    logger.error("handle_error: tool=%s  error=%s", tool_name, error)

    friendly = (
        f"Something went wrong while running '{tool_name}'.\n\n"
        f"Details: {error}\n\n"
        f"Please check your input and try again. "
        f"If the problem persists, verify your database connection."
    )
    return {"tool_result": friendly}


# ─────────────────────────────────────────────────────────────────────────────
# Node 7 — return_response
# ─────────────────────────────────────────────────────────────────────────────

async def return_response(state: WorkflowState) -> dict[str, Any]:
    """
    Format the raw tool output into a clean, conversational final response.

    The LLM is asked to present the result naturally without inventing data.
    If tool_result is already a plain error/clarification string (e.g. from
    unknown_tool or handle_error), it is passed through with light wrapping.

    Reads:  tool_result, intent, user_message
    Writes: final_response, messages
    """
    tool_result: str = state.get("tool_result") or "No result was produced."
    intent: str = state.get("intent") or "unknown"
    user_msg: str = state.get("user_message", "")

    prompt = f"""You are the response-formatting layer of a medical CRM assistant.
The user asked: \"\"\"{user_msg}\"\"\"
The intent was: {intent}

The tool returned the following raw output:
---
{tool_result}
---

Instructions:
- Present the information clearly and conversationally.
- Do NOT add, invent, or infer any data not present in the tool output.
- If the output is already a well-formatted list or table, keep that structure.
- Keep the tone professional and concise.
- If the output describes an error, acknowledge it and suggest next steps.
"""

    try:
        llm = get_llm(temperature=0.3)
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        final: str = response.content.strip()
    except Exception as exc:
        # Fallback: return raw tool result if LLM formatting fails
        logger.warning("return_response LLM call failed (%s), using raw result", exc)
        final = tool_result

    ai_msg = AIMessage(content=final)
    return {
        "final_response": final,
        "messages": [ai_msg],
    }



# ══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — Conditional edge functions
# ══════════════════════════════════════════════════════════════════════════════

def route_after_understanding(state: WorkflowState) -> str:
    """
    Conditional edge after understand_request.

    ┌──────────────────────────────┬────────────────────┐
    │ Condition                    │ Route to           │
    ├──────────────────────────────┼────────────────────┤
    │ clarification_needed = True  │ "clarify"          │
    │ error is set                 │ "return_response"  │
    │ intent is clear              │ "choose_tool"      │
    └──────────────────────────────┴────────────────────┘
    """
    if state.get("error"):
        return "return_response"
    if state.get("clarification_needed"):
        return "clarify"
    return "choose_tool"


def route_after_choosing(state: WorkflowState) -> str:
    """
    Conditional edge after choose_tool.

    ┌───────────────────────────────────────┬────────────────────┐
    │ Condition                             │ Route to           │
    ├───────────────────────────────────────┼────────────────────┤
    │ error is set (tool selection failed)  │ "return_response"  │
    │ selected_tool is None / "unknown"     │ "unknown_tool"     │
    │ selected_tool is in TOOL_REGISTRY     │ "execute_tool"     │
    └───────────────────────────────────────┴────────────────────┘
    """
    if state.get("error"):
        return "return_response"
    tool = state.get("selected_tool")
    if not tool or tool not in TOOL_REGISTRY:
        return "unknown_tool"
    return "execute_tool"


def route_after_execution(state: WorkflowState) -> str:
    """
    Conditional edge after execute_tool.

    ┌────────────────────────────┬────────────────────┐
    │ Condition                  │ Route to           │
    ├────────────────────────────┼────────────────────┤
    │ error is set               │ "handle_error"     │
    │ no error                   │ "return_response"  │
    └────────────────────────────┴────────────────────┘
    """
    if state.get("error"):
        return "handle_error"
    return "return_response"


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 6 — Graph assembly
# ══════════════════════════════════════════════════════════════════════════════

def _build_workflow_graph() -> StateGraph:
    """
    Assemble and compile the CRM workflow graph.

    Node registration order does not affect execution order;
    only the edges determine the flow.
    """
    builder = StateGraph(WorkflowState)

    # ── Register every node ────────────────────────────────────────────────────
    builder.add_node("understand_request", understand_request)
    builder.add_node("clarify",            clarify)
    builder.add_node("choose_tool",        choose_tool)
    builder.add_node("unknown_tool",       unknown_tool)
    builder.add_node("execute_tool",       execute_tool)
    builder.add_node("handle_error",       handle_error)
    builder.add_node("return_response",    return_response)

    # ── Entry point ────────────────────────────────────────────────────────────
    builder.add_edge(START, "understand_request")

    # ── Conditional edge 1: after understanding ────────────────────────────────
    # Routes to: clarify | choose_tool | return_response (on error)
    builder.add_conditional_edges(
        "understand_request",
        route_after_understanding,
        {
            "clarify":          "clarify",
            "choose_tool":      "choose_tool",
            "return_response":  "return_response",
        },
    )

    # clarify always loops back to understand_request so the agent can
    # re-classify once the user provides the missing information.
    builder.add_edge("clarify", END)  # surface question; resume on next turn

    # ── Conditional edge 2: after tool selection ───────────────────────────────
    # Routes to: execute_tool | unknown_tool | return_response (on error)
    builder.add_conditional_edges(
        "choose_tool",
        route_after_choosing,
        {
            "execute_tool":    "execute_tool",
            "unknown_tool":    "unknown_tool",
            "return_response": "return_response",
        },
    )

    # unknown_tool feeds directly into response formatting
    builder.add_edge("unknown_tool", "return_response")

    # ── Conditional edge 3: after tool execution ───────────────────────────────
    # Routes to: handle_error | return_response
    builder.add_conditional_edges(
        "execute_tool",
        route_after_execution,
        {
            "handle_error":    "handle_error",
            "return_response": "return_response",
        },
    )

    # handle_error feeds into return_response for uniform output formatting
    builder.add_edge("handle_error", "return_response")

    # ── Exit ───────────────────────────────────────────────────────────────────
    builder.add_edge("return_response", END)

    return builder.compile()


# ── Singleton compiled graph ───────────────────────────────────────────────────
workflow_graph = _build_workflow_graph()


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 7 — Public API
# ══════════════════════════════════════════════════════════════════════════════

async def run_workflow_agent(user_message: str) -> str:
    """
    Invoke the CRM workflow agent with a single user message.

    Runs the full pipeline:
        understand → choose → execute → respond

    Args:
        user_message: Natural language request from the user.

    Returns:
        The agent's final formatted response string.

    Example:
        result = await run_workflow_agent(
            "Show me follow-up reminders for the next 14 days."
        )
        print(result)
    """
    initial: WorkflowState = {
        "messages":               [HumanMessage(content=user_message)],
        "user_message":           user_message,
        "intent":                 None,
        "clarification_needed":   False,
        "clarification_question": None,
        "selected_tool":          None,
        "tool_input":             None,
        "tool_result":            None,
        "error":                  None,
        "final_response":         None,
    }

    final_state: WorkflowState = await workflow_graph.ainvoke(initial)
    return final_state.get("final_response") or "No response generated."


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 8 — Interactive CLI   python -m app.agents.crm_workflow_agent
# ══════════════════════════════════════════════════════════════════════════════

async def _cli() -> None:
    """Interactive terminal session for the workflow agent."""
    print("=" * 62)
    print("  Medical CRM Workflow Agent")
    print("  Type 'quit' or 'exit' to stop.")
    print("=" * 62)
    print("\nExamples:")
    print("  • Log a visit with Dr. Priya Sharma at Apollo. Discussed Cardivol.")
    print("  • Search interactions with Dr. Mehta from last week.")
    print("  • Show Dr. Kapoor's profile.")
    print("  • What follow-ups are due in the next 10 days?")
    print()

    while True:
        try:
            user_input = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not user_input:
            continue
        if user_input.lower() in {"quit", "exit", "bye"}:
            print("Goodbye!")
            break

        response = await run_workflow_agent(user_input)
        print(f"\nAgent: {response}\n")


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    asyncio.run(_cli())
