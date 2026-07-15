"""
LangGraph interaction analysis graph.

Topology
────────

  START
    │
    ▼
┌──────────────┐    error     ┌─────┐
│ summarise    │─────────────►│     │
└──────┬───────┘              │     │
       │ ok                   │     │
       ▼                      │ END │
┌──────────────┐    error     │     │
│ sentiment    │─────────────►│     │
└──────┬───────┘              │     │
       │ ok                   │     │
       ▼                      │     │
┌──────────────┐    error     │     │
│ action_items │─────────────►│     │
└──────┬───────┘              │     │
       │ ok                   │     │
       ▼                      │     │
┌──────────────┐              │     │
│  follow_up   │─────────────►│     │
└──────────────┘   always     └─────┘

Design decisions
────────────────
- Sequential pipeline: each node builds on prior outputs.
  (sentiment uses summary; action_items uses summary; follow_up uses sentiment)
- Conditional edges after every node: if state["error"] is set, jump to END.
  This prevents a broken summarise from causing a confusing sentiment error.
- follow_up always routes to END (it handles its own fallback internally).
- The graph is compiled once at module import and reused across requests.
  LangGraph compiled graphs are stateless and thread-safe.

Usage
─────
    from app.agents.interaction_graph import interaction_graph

    final_state = await interaction_graph.ainvoke(initial_state)
"""

from functools import lru_cache

from langgraph.graph import END, START, StateGraph

from app.agents.nodes import (
    action_items_node,
    follow_up_node,
    sentiment_node,
    summarise_node,
)
from app.agents.state import InteractionAnalysisState


# ─────────────────────────────────────────────────────────────────────────────
# Conditional router
# ─────────────────────────────────────────────────────────────────────────────

def _route(state: InteractionAnalysisState) -> str:
    """
    After each node: if an error was recorded, short-circuit to END.
    Otherwise continue to the next node in the sequence.
    """
    return "end" if state.get("error") else "continue"


# ─────────────────────────────────────────────────────────────────────────────
# Graph builder
# ─────────────────────────────────────────────────────────────────────────────

def _build_graph() -> StateGraph:
    """Assemble and compile the interaction analysis graph."""
    builder = StateGraph(InteractionAnalysisState)

    # ── Register nodes ────────────────────────────────────────────────────────
    builder.add_node("summarise",    summarise_node)
    builder.add_node("sentiment",    sentiment_node)
    builder.add_node("action_items", action_items_node)
    builder.add_node("follow_up",    follow_up_node)

    # ── Entry point ───────────────────────────────────────────────────────────
    builder.add_edge(START, "summarise")

    # ── Conditional edges: bail out on error after each node ──────────────────
    builder.add_conditional_edges(
        "summarise",
        _route,
        {"continue": "sentiment",    "end": END},
    )
    builder.add_conditional_edges(
        "sentiment",
        _route,
        {"continue": "action_items", "end": END},
    )
    builder.add_conditional_edges(
        "action_items",
        _route,
        {"continue": "follow_up",    "end": END},
    )

    # ── follow_up always exits (handles its own fallback) ─────────────────────
    builder.add_edge("follow_up", END)

    return builder.compile()


# ─────────────────────────────────────────────────────────────────────────────
# Singleton — compiled once, reused across all requests
# ─────────────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def get_interaction_graph():
    """
    Return the compiled LangGraph graph (singleton).

    lru_cache ensures the graph is built exactly once at first call
    and reused for every subsequent request — no rebuild overhead.
    """
    return _build_graph()


# Module-level alias for direct import convenience
interaction_graph = get_interaction_graph()
