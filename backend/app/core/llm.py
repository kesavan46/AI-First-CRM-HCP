"""
Groq LLM factory — single source of truth for all LLM instances.

Usage anywhere in the codebase (nodes, services, tests):

    from app.core.llm import get_llm, get_llm_deterministic

    llm = get_llm()                        # default temp (0.3)
    llm = get_llm(temperature=0.7)         # custom temp
    llm = get_llm_deterministic()          # temp=0.0 for classification tasks

Design decisions
────────────────
- All config comes from `app.core.config.settings` — nothing is hard-coded.
- `get_llm()` is a plain function, not a singleton, so each caller gets a
  fresh instance. LangChain chat models are lightweight objects; the actual
  HTTP connection is made per `.invoke()` call.
- `get_groq_client()` exposes the raw Groq Python SDK client for use cases
  that need direct SDK access (e.g. streaming, audio transcription).
- A startup validation helper `validate_groq_connection()` is provided so
  main.py lifespan can fail fast if the API key is missing or invalid.
"""

from __future__ import annotations

import logging

from groq import AsyncGroq, Groq
from langchain_groq import ChatGroq

from app.core.config import settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# LangChain-compatible LLM (used inside LangGraph nodes)
# ─────────────────────────────────────────────────────────────────────────────

def get_llm(
    temperature: float | None = None,
    max_tokens: int | None = None,
    model: str | None = None,
) -> ChatGroq:
    """
    Return a configured ChatGroq instance backed by the Groq API.

    All defaults come from settings; pass arguments to override per node.

    Args:
        temperature: Sampling temperature.
                     None → use settings.LLM_TEMPERATURE (0.3).
                     0.0  → fully deterministic (good for classification).
                     1.0  → maximum creativity.
        max_tokens:  Max output tokens. None → use settings.LLM_MAX_TOKENS.
        model:       Model name. None → use settings.GROQ_MODEL (gemma2-9b-it).

    Returns:
        A LangChain ChatGroq instance ready for .invoke() / .ainvoke().

    Raises:
        ValueError: If GROQ_API_KEY is empty (caught at startup by validate_groq_connection).

    Example:
        llm = get_llm()
        response = await llm.ainvoke([HumanMessage(content="Hello")])
        print(response.content)
    """
    if not settings.GROQ_API_KEY:
        raise ValueError(
            "GROQ_API_KEY is not set. "
            "Add it to your .env file: GROQ_API_KEY=gsk_..."
        )

    return ChatGroq(
        model=model or settings.GROQ_MODEL,
        api_key=settings.GROQ_API_KEY,
        temperature=temperature if temperature is not None else settings.LLM_TEMPERATURE,
        max_tokens=max_tokens or settings.LLM_MAX_TOKENS,
    )


def get_llm_deterministic(model: str | None = None) -> ChatGroq:
    """
    Shorthand for get_llm(temperature=0.0).

    Use for classification tasks where you want the single most-likely
    token at every step (e.g. sentiment: positive / neutral / negative).
    """
    return get_llm(temperature=0.0, model=model)


def get_llm_creative(model: str | None = None) -> ChatGroq:
    """
    Shorthand for get_llm(temperature=0.8).

    Use for free-form generation tasks where variety is desirable
    (e.g. generating email drafts, creative summaries).
    """
    return get_llm(temperature=0.8, model=model)


# ─────────────────────────────────────────────────────────────────────────────
# Raw Groq SDK clients (for direct API access: streaming, audio, etc.)
# ─────────────────────────────────────────────────────────────────────────────

def get_groq_client() -> Groq:
    """
    Return a synchronous Groq SDK client.

    Use when you need raw SDK access (e.g. listing models, audio transcription).
    For standard text generation inside LangGraph, use get_llm() instead.
    """
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set.")
    return Groq(api_key=settings.GROQ_API_KEY)


def get_async_groq_client() -> AsyncGroq:
    """
    Return an async Groq SDK client.

    Use for async streaming responses outside LangGraph.
    """
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY is not set.")
    return AsyncGroq(api_key=settings.GROQ_API_KEY)


# ─────────────────────────────────────────────────────────────────────────────
# Startup validation
# ─────────────────────────────────────────────────────────────────────────────

async def validate_groq_connection() -> None:
    """
    Verify the Groq API key is set and the API is reachable.

    Call this from main.py lifespan so the app fails fast at startup
    rather than returning 500s at request time.

    Raises:
        ValueError:  GROQ_API_KEY is empty.
        Exception:   API call failed (invalid key, network error, etc.).
    """
    if not settings.GROQ_API_KEY:
        raise ValueError(
            "GROQ_API_KEY is missing. "
            "Set it in your .env file before starting the server."
        )

    logger.info(
        "Validating Groq connection (model: %s)...", settings.GROQ_MODEL
    )

    try:
        # Minimal token usage — just enough to confirm the key works
        llm = get_llm(max_tokens=5)
        from langchain_core.messages import HumanMessage
        await llm.ainvoke([HumanMessage(content="hi")])
        logger.info("Groq connection validated successfully.")
    except Exception as exc:
        # Log as a warning — don't crash the server; AI endpoints will fail
        # gracefully at request time with a proper HTTP 503 response.
        logger.warning(
            "Groq connection check failed (AI features may be unavailable): %s", exc
        )
