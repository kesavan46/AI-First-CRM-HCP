"""
LangGraph node functions for the Interaction Analysis pipeline.

Each node:
  1. Reads what it needs from state
  2. Builds a focused prompt
  3. Calls exactly one tool (the LLM call lives in the tool)
  4. Returns a dict with ONLY the fields it populates
  5. On any exception → returns {"error": "<reason>"} to short-circuit the graph

Node order (defined in interaction_graph.py):
    summarise_node → sentiment_node → action_items_node → follow_up_node

The LLM instance is created fresh per node call so each node can
independently use a different model or temperature in the future.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.agents.state import InteractionAnalysisState
from app.agents.tools import (
    action_items_tool,
    follow_up_tool,
    sentiment_tool,
    summarise_tool,
)
from app.core.llm import get_llm, get_llm_deterministic


# ─────────────────────────────────────────────────────────────────────────────
# Node 1 — Summarise
# ─────────────────────────────────────────────────────────────────────────────

async def summarise_node(state: InteractionAnalysisState) -> dict[str, Any]:
    """
    Produce a 2-4 sentence professional summary of the interaction notes.

    Reads:   raw_notes, interaction_type, doctor_name
    Writes:  summary
    """
    if state.get("error"):
        return {}  # prior node already failed — skip silently

    doctor_ctx = f" with Dr. {state['doctor_name']}" if state.get("doctor_name") else ""
    prompt = (
        f"You are a medical CRM assistant. "
        f"Summarise the following {state['interaction_type']} interaction{doctor_ctx} "
        f"in 2 to 4 concise, professional sentences. "
        f"Focus on what was discussed, the doctor's response, and any outcomes. "
        f"Do not add information that is not in the notes.\n\n"
        f"Interaction Notes:\n{state['raw_notes']}"
    )

    try:
        summary: str = await summarise_tool.ainvoke({"llm": get_llm(), "prompt": prompt})
        return {"summary": summary}
    except Exception as exc:
        return {"error": f"summarise_node failed: {exc}"}


# ─────────────────────────────────────────────────────────────────────────────
# Node 2 — Sentiment
# ─────────────────────────────────────────────────────────────────────────────

async def sentiment_node(state: InteractionAnalysisState) -> dict[str, Any]:
    """
    Classify the overall sentiment of the interaction.

    Uses both the raw notes and the generated summary (if available)
    to improve classification accuracy.

    Reads:   raw_notes, summary (optional)
    Writes:  sentiment  →  "positive" | "neutral" | "negative"
    """
    if state.get("error"):
        return {}

    context = state.get("summary") or state["raw_notes"]
    prompt = (
        "Classify the sentiment of the following medical rep interaction. "
        "Reply with EXACTLY one word — positive, neutral, or negative — "
        "and nothing else.\n\n"
        f"Interaction:\n{context}"
    )

    try:
        # Lower temperature → more deterministic single-word output
        sentiment: str = await sentiment_tool.ainvoke(
            {"llm": get_llm_deterministic(), "prompt": prompt}
        )
        return {"sentiment": sentiment}
    except Exception as exc:
        return {"error": f"sentiment_node failed: {exc}"}


# ─────────────────────────────────────────────────────────────────────────────
# Node 3 — Action Items
# ─────────────────────────────────────────────────────────────────────────────

async def action_items_node(state: InteractionAnalysisState) -> dict[str, Any]:
    """
    Extract concrete, actionable follow-up tasks from the interaction.

    Uses both raw notes and summary to avoid missing implicit actions.

    Reads:   raw_notes, summary (optional)
    Writes:  action_items  →  list[str]
    """
    if state.get("error"):
        return {}

    notes_section = state["raw_notes"]
    summary_section = (
        f"\nSummary:\n{state['summary']}" if state.get("summary") else ""
    )

    prompt = (
        "You are a medical CRM assistant. Extract all follow-up action items "
        "from the interaction notes below. "
        "Return each action item on its own line starting with a dash (-). "
        "Each item must be a specific, concrete task (e.g. 'Send clinical study PDF to doctor'). "
        "If there are no clear action items, return exactly: - No action items identified.\n\n"
        f"Notes:\n{notes_section}"
        f"{summary_section}"
    )

    try:
        items: list[str] = await action_items_tool.ainvoke(
            {"llm": get_llm(), "prompt": prompt}
        )
        return {"action_items": items}
    except Exception as exc:
        return {"error": f"action_items_node failed: {exc}"}


# ─────────────────────────────────────────────────────────────────────────────
# Node 4 — Follow-up Date
# ─────────────────────────────────────────────────────────────────────────────

async def follow_up_node(state: InteractionAnalysisState) -> dict[str, Any]:
    """
    Suggest an appropriate follow-up date based on sentiment, interaction
    type, and any explicit date mentions in the notes.

    Urgency heuristic (baked into the prompt):
        negative sentiment   → 3-5 days
        neutral sentiment    → 10-14 days
        positive sentiment   → 14-21 days

    Reads:   sentiment, interaction_type, raw_notes
    Writes:  follow_up_date  →  datetime (UTC)
    """
    if state.get("error"):
        return {}

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    sentiment = state.get("sentiment", "neutral")

    urgency_hint = {
        "negative": "3 to 5 days (the doctor needs prompt follow-up)",
        "neutral":  "10 to 14 days",
        "positive": "14 to 21 days (relationship is strong)",
    }.get(sentiment, "14 days")

    prompt = (
        f"You are scheduling a follow-up for a medical rep. "
        f"Today is {today}. "
        f"The interaction was a {state['interaction_type']} "
        f"and the sentiment was {sentiment}. "
        f"Suggest a follow-up date in {urgency_hint}. "
        f"If the notes mention a specific date or timeframe, use that instead. "
        f"Reply with ONLY a date in YYYY-MM-DD format.\n\n"
        f"Notes:\n{state['raw_notes']}"
    )

    try:
        follow_up_date: datetime = await follow_up_tool.ainvoke(
            {"llm": get_llm_deterministic(), "prompt": prompt}
        )
        return {"follow_up_date": follow_up_date}
    except Exception as exc:
        # Non-fatal: fall back to 14 days rather than failing the whole graph
        from datetime import timedelta
        return {"follow_up_date": datetime.now(timezone.utc) + timedelta(days=14)}
