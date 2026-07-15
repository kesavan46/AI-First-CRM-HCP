"""
LangChain tools for the Interaction Analysis pipeline.

One tool per AI task. Tools are pure functions — they receive a built
prompt string, call the LLM, and return structured Python output.
Nodes are responsible for building the prompt; tools only handle the
LLM call and output parsing.

This separation means:
  - Each tool can be unit-tested in isolation with a mock LLM.
  - Prompt engineering is co-located with the node, not buried in tools.
  - Tools can be swapped (e.g. different model per task) without changing nodes.

Usage in a node:
    llm = get_llm()
    result: str = await summarise_tool.ainvoke({"llm": llm, "prompt": prompt})
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any

from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage
from langchain_core.tools import tool


# ─────────────────────────────────────────────────────────────────────────────
# Tool 1 — Summarise
# ─────────────────────────────────────────────────────────────────────────────
@tool
async def summarise_tool(llm: Any, prompt: str) -> str:
    """
    Call the LLM with a summarisation prompt and return the raw text response.

    Args:
        llm:    A configured LangChain chat model instance.
        prompt: The fully-built prompt string from the node.

    Returns:
        Stripped LLM response string (the summary).
    """
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    return response.content.strip()


# ─────────────────────────────────────────────────────────────────────────────
# Tool 2 — Sentiment classification
# ─────────────────────────────────────────────────────────────────────────────
@tool
async def sentiment_tool(llm: Any, prompt: str) -> str:
    """
    Call the LLM with a sentiment prompt and return one of:
    "positive", "neutral", or "negative".

    Falls back to "neutral" if the model returns an unexpected value.

    Args:
        llm:    A configured LangChain chat model instance.
        prompt: The fully-built prompt string from the node.

    Returns:
        One of "positive" | "neutral" | "negative".
    """
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    raw = response.content.strip().lower()

    # Extract only the first word in case the model adds explanation
    first_word = raw.split()[0] if raw else "neutral"
    return first_word if first_word in ("positive", "neutral", "negative") else "neutral"


# ─────────────────────────────────────────────────────────────────────────────
# Tool 3 — Action item extraction
# ─────────────────────────────────────────────────────────────────────────────
@tool
async def action_items_tool(llm: Any, prompt: str) -> list[str]:
    """
    Call the LLM with an action-item extraction prompt and parse the
    bullet-point response into a clean Python list of strings.

    Args:
        llm:    A configured LangChain chat model instance.
        prompt: The fully-built prompt string from the node.

    Returns:
        List of action item strings (stripped of bullet markers).
        Returns ["No action items identified."] when the model finds none.
    """
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    raw_text = response.content.strip()

    lines = raw_text.splitlines()
    items: list[str] = []
    for line in lines:
        # Strip common bullet markers: - * • 1. 2) etc.
        cleaned = re.sub(r"^[\s\-\*\•\d]+[.)]\s*", "", line).strip()
        cleaned = cleaned.lstrip("-*• ").strip()
        if cleaned:
            items.append(cleaned)

    return items if items else ["No action items identified."]


# ─────────────────────────────────────────────────────────────────────────────
# Tool 4 — Follow-up date suggestion
# ─────────────────────────────────────────────────────────────────────────────
@tool
async def follow_up_tool(llm: Any, prompt: str) -> datetime:
    """
    Call the LLM with a follow-up date prompt and parse the ISO date response.

    Expects the model to return a date in YYYY-MM-DD format.
    Falls back to 14 days from today (UTC) if parsing fails.

    Args:
        llm:    A configured LangChain chat model instance.
        prompt: The fully-built prompt string from the node.

    Returns:
        A timezone-aware datetime in UTC.
    """
    response = await llm.ainvoke([HumanMessage(content=prompt)])
    raw = response.content.strip()

    # Try to extract a YYYY-MM-DD date from anywhere in the response
    match = re.search(r"\d{4}-\d{2}-\d{2}", raw)
    if match:
        try:
            return datetime.strptime(match.group(), "%Y-%m-%d").replace(
                tzinfo=timezone.utc
            )
        except ValueError:
            pass

    # Fallback: 14 days from now
    return datetime.now(timezone.utc) + timedelta(days=14)
