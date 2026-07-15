"""
LangGraph state schema for the Interaction Analysis pipeline.

The state is a plain Python TypedDict — a dict that every node reads from
and writes partial updates back into. LangGraph merges each node's return
dict onto the existing state automatically.

Lifecycle:
    AIService builds the initial state dict  →  graph.ainvoke(state)
        → summarise_node  populates: summary
        → sentiment_node  populates: sentiment
        → action_items_node populates: action_items
        → follow_up_node  populates: follow_up_date
    AIService reads final state and persists AI fields to the DB.

Error handling:
    Any node that raises or catches an exception writes:
        {"error": "<human-readable reason>"}
    The conditional router in the graph detects this and jumps to END,
    skipping all remaining nodes.
"""

from datetime import datetime
from typing import Optional
from typing_extensions import TypedDict


class InteractionAnalysisState(TypedDict):
    """
    Shared mutable state that flows through every node of the graph.

    ── Inputs (set by AIService before invoking the graph) ──────────────────
    interaction_id  : str            UUID of the DB record (string for JSON safety)
    raw_notes       : str            Free-text notes entered by the rep
    interaction_type: str            "visit" | "call" | "email" | "conference" | "virtual"
    doctor_name     : Optional[str]  Display name of the doctor — enriches prompts

    ── Outputs (populated by nodes, read by AIService after invocation) ─────
    summary         : Optional[str]        2-4 sentence narrative summary
    sentiment       : Optional[str]        "positive" | "neutral" | "negative"
    action_items    : Optional[list[str]]  Follow-up tasks extracted from notes
    follow_up_date  : Optional[datetime]   Suggested follow-up datetime (UTC)

    ── Control ───────────────────────────────────────────────────────────────
    error           : Optional[str]  Set by any node on failure; triggers early exit
    """

    # ── Inputs ────────────────────────────────────────────────────────────────
    interaction_id: str
    raw_notes: str
    interaction_type: str
    doctor_name: Optional[str]

    # ── Outputs ───────────────────────────────────────────────────────────────
    summary: Optional[str]
    sentiment: Optional[str]
    action_items: Optional[list[str]]
    follow_up_date: Optional[datetime]

    # ── Control flow ──────────────────────────────────────────────────────────
    error: Optional[str]
