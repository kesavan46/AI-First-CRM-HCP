"""
LangGraph CRM agent — wires the five CRM tools into a ReAct loop.

Architecture
────────────

  User message
      │
      ▼
  ┌──────────┐   tool call?   ┌──────────────┐
  │  agent   │──────────────►│  tool_node   │
  │ (LLM)   │◄──────────────│  (5 tools)   │
  └──────────┘  tool result  └──────────────┘
      │
      │  no more tool calls
      ▼
    END  →  final assistant message

The agent node calls the LLM with the full conversation history plus the
tool schemas.  The LLM decides which tool to call (or whether to respond
directly).  The tool node executes the requested tool and returns the result
as a ToolMessage.  The loop repeats until the LLM produces a plain text
response with no tool call.

Usage
─────
    # Single-turn (CLI / tests)
    from app.agents.crm_agent import run_crm_agent
    response = await run_crm_agent("Log a visit with Dr. Mehta at AIIMS today.")

    # Multi-turn (FastAPI streaming endpoint)
    from app.agents.crm_agent import crm_graph
    async for chunk in crm_graph.astream({"messages": [HumanMessage(...)]}, ...):
        ...

    # Interactive CLI
    python -m app.agents.crm_agent
"""

from __future__ import annotations

import asyncio
import logging
from typing import Annotated, Any

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from typing_extensions import TypedDict

from app.agents.crm_tools import (
    doctor_profile,
    edit_interaction,
    follow_up_reminders,
    log_interaction,
    search_interactions,
)
from app.core.llm import get_llm

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Tool registry
# ─────────────────────────────────────────────────────────────────────────────

CRM_TOOLS = [
    log_interaction,
    edit_interaction,
    search_interactions,
    doctor_profile,
    follow_up_reminders,
]

# ─────────────────────────────────────────────────────────────────────────────
# System prompt
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are an AI assistant for a medical sales CRM.
You help pharmaceutical reps manage their doctor interactions efficiently.

You have access to five tools:

1. log_interaction       — Record a new interaction from natural language.
2. edit_interaction      — Update an existing interaction by its UUID.
3. search_interactions   — Find interactions by doctor name or date range.
4. doctor_profile        — View a doctor's full history and pending follow-ups.
5. follow_up_reminders   — See upcoming follow-up reminders.

Guidelines:
- Always use a tool when the user asks to log, update, search, or retrieve data.
- When logging, pass the user's raw message verbatim as natural_language_input.
- For edits, confirm the interaction UUID with the user if it is ambiguous.
- Present tool results in a clean, readable format.
- If a tool returns an error, explain it clearly and suggest a fix.
- Do not invent interaction IDs or doctor names — only use what the user provides.
"""

# ─────────────────────────────────────────────────────────────────────────────
# State schema
# ─────────────────────────────────────────────────────────────────────────────

class CRMAgentState(TypedDict):
    """
    Shared state for the CRM agent graph.

    messages: Full conversation history, automatically merged by add_messages
              so each node only needs to return the new messages it produces.
    """
    messages: Annotated[list[BaseMessage], add_messages]


# ─────────────────────────────────────────────────────────────────────────────
# Node: agent (LLM with bound tools)
# ─────────────────────────────────────────────────────────────────────────────

async def agent_node(
    state: CRMAgentState, config: RunnableConfig
) -> dict[str, Any]:
    """
    Call the LLM with the current message history and tool schemas.

    The LLM either:
      a) requests a tool call  → LangGraph routes to tool_node
      b) produces a final text → LangGraph routes to END
    """
    llm = get_llm(temperature=0.2)
    llm_with_tools = llm.bind_tools(CRM_TOOLS)

    messages = state["messages"]

    # Prepend the system prompt if this is the start of the conversation
    if not any(isinstance(m, SystemMessage) for m in messages):
        messages = [SystemMessage(content=SYSTEM_PROMPT)] + messages

    try:
        response: AIMessage = await llm_with_tools.ainvoke(messages, config)
        return {"messages": [response]}
    except Exception as exc:
        logger.error("agent_node LLM call failed: %s", exc)
        error_msg = AIMessage(
            content=f"I encountered an error while processing your request: {exc}"
        )
        return {"messages": [error_msg]}


# ─────────────────────────────────────────────────────────────────────────────
# Router: should we call a tool or are we done?
# ─────────────────────────────────────────────────────────────────────────────

def _should_call_tools(state: CRMAgentState) -> str:
    """
    Inspect the last message. If the LLM requested tool calls, continue to
    the tool node. Otherwise we are done.
    """
    last = state["messages"][-1]
    if isinstance(last, AIMessage) and last.tool_calls:
        return "tools"
    return "end"


# ─────────────────────────────────────────────────────────────────────────────
# Graph assembly
# ─────────────────────────────────────────────────────────────────────────────

def _build_crm_graph() -> StateGraph:
    """Build and compile the CRM ReAct graph."""
    builder = StateGraph(CRMAgentState)

    # ── Nodes ──────────────────────────────────────────────────────────────────
    builder.add_node("agent", agent_node)
    builder.add_node("tools", ToolNode(CRM_TOOLS))

    # ── Entry ──────────────────────────────────────────────────────────────────
    builder.add_edge(START, "agent")

    # ── ReAct loop ─────────────────────────────────────────────────────────────
    builder.add_conditional_edges(
        "agent",
        _should_call_tools,
        {"tools": "tools", "end": END},
    )
    # After tool execution, always go back to the agent
    builder.add_edge("tools", "agent")

    return builder.compile()


# ── Singleton compiled graph ───────────────────────────────────────────────────
crm_graph = _build_crm_graph()


# ─────────────────────────────────────────────────────────────────────────────
# Public helper: single-turn invocation
# ─────────────────────────────────────────────────────────────────────────────

async def run_crm_agent(user_message: str) -> str:
    """
    Invoke the CRM agent with a single user message and return the final
    assistant response as a plain string.

    Args:
        user_message: The user's natural language request.

    Returns:
        The agent's final text response.

    Example:
        response = await run_crm_agent(
            "Log a call with Dr. Priya Mehta at AIIMS. "
            "Discussed Cardivol 10mg. She wants samples. Follow up next Friday."
        )
        print(response)
    """
    initial_state: CRMAgentState = {
        "messages": [HumanMessage(content=user_message)]
    }

    final_state = await crm_graph.ainvoke(initial_state)
    messages: list[BaseMessage] = final_state["messages"]

    # Return the last AI message content
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and msg.content:
            return str(msg.content)

    return "No response generated."


# ─────────────────────────────────────────────────────────────────────────────
# Interactive CLI  —  python -m app.agents.crm_agent
# ─────────────────────────────────────────────────────────────────────────────

async def _interactive_loop() -> None:
    """Run an interactive multi-turn chat loop in the terminal."""
    print("=" * 60)
    print(" Medical CRM Agent  (type 'quit' or 'exit' to stop)")
    print("=" * 60)

    history: list[BaseMessage] = [SystemMessage(content=SYSTEM_PROMPT)]

    while True:
        try:
            user_input = input("\nYou: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not user_input:
            continue
        if user_input.lower() in {"quit", "exit", "bye"}:
            print("Goodbye!")
            break

        history.append(HumanMessage(content=user_input))

        state: CRMAgentState = {"messages": history}
        final_state = await crm_graph.ainvoke(state)
        history = final_state["messages"]

        # Print the last AI response
        for msg in reversed(history):
            if isinstance(msg, AIMessage) and msg.content:
                print(f"\nAgent: {msg.content}")
                break


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )
    asyncio.run(_interactive_loop())
