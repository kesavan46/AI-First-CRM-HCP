"""
AI Router
=========

All endpoints trigger the LangGraph pipeline via AIService.
The router knows nothing about LangGraph — it only calls service methods.

Endpoint                       Method  Description
──────────────────────────────────────────────────────────────────────────────
/ai/analyze                    POST    Run full AI pipeline on a saved interaction
/ai/quick-summary              POST    Ad-hoc preview — no DB write
/ai/status/{interaction_id}    GET     Check AI processing status

All endpoints require a valid Bearer token.
Prefix /api/v1 is mounted in main.py → full paths: /api/v1/ai/...
"""

import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, status
from pydantic import BaseModel

from app.routers.deps import CurrentUser, DBSession
from app.schemas.ai import (
    AIAnalysisRequest,
    AIAnalysisResponse,
    AIQuickSummaryRequest,
    AIQuickSummaryResponse,
    AIStatusResponse,
)
from app.services.ai_service import AIService
from app.agents.crm_workflow_agent import run_workflow_agent

router = APIRouter(prefix="/ai", tags=["AI"])


# ── Chat / LangGraph schemas ──────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    reply: str
    extracted_fields: Optional[Dict[str, Any]] = None


# ─────────────────────────────────────────────────────────────────────────────
# POST /ai/analyze
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/analyze",
    response_model=AIAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyse an interaction with AI",
    response_description="AI-generated summary, sentiment, action items and follow-up date",
)
async def analyze_interaction(
    payload: AIAnalysisRequest,
    db: DBSession,
    current_user: CurrentUser,
) -> AIAnalysisResponse:
    """
    Run the full LangGraph pipeline on a saved interaction record.

    The pipeline runs four nodes in sequence:

    1. **summarise** — produces a 2-4 sentence professional summary
    2. **sentiment** — classifies as `positive`, `neutral`, or `negative`
    3. **action_items** — extracts concrete follow-up tasks
    4. **follow_up** — suggests a follow-up date based on urgency

    Results are persisted back to the interaction record.
    Once processed, `ai_processed` is set to `true` on the record.

    - **interaction_id** must reference an existing interaction with non-empty notes.
    - If any pipeline node fails, the endpoint returns HTTP 500 with the error detail.
    """
    return await AIService(db).analyze_interaction(payload.interaction_id)


# ─────────────────────────────────────────────────────────────────────────────
# POST /ai/quick-summary
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/quick-summary",
    response_model=AIQuickSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Live AI preview (no database write)",
    response_description="AI summary, sentiment, and action items for ad-hoc text",
)
async def quick_summary(
    payload: AIQuickSummaryRequest,
    db: DBSession,
    current_user: CurrentUser,
) -> AIQuickSummaryResponse:
    """
    Run the full AI pipeline on raw text **without saving anything to the database**.

    Designed for the frontend interaction form — lets the rep see an AI preview
    of their notes before submitting the record.

    - **notes** — the raw text to analyse (10–10,000 chars)
    - **interaction_type** — helps the model contextualise the summary
    - **doctor_name** — optional; included in the summary prompt for richer output
    """
    return await AIService(db).quick_summary(payload)


# ─────────────────────────────────────────────────────────────────────────────
# GET /ai/status/{interaction_id}
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/status/{interaction_id}",
    response_model=AIStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Check AI processing status",
    response_description="AI processing flags for a given interaction",
)
async def ai_status(
    interaction_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> AIStatusResponse:
    """
    Return the AI processing status of an interaction record.

    Useful for polling from the frontend to check if the AI pipeline
    has completed after triggering `/ai/analyze`.

    Returns:
    - **ai_processed** — `true` if the pipeline has run
    - **ai_sentiment** — the classified sentiment (or `null` if not yet processed)
    - **has_notes** — `true` if the interaction has notes that can be analysed
    """
    return await AIService(db).get_ai_status(interaction_id)



# ─────────────────────────────────────────────────────────────────────────────
# POST /chat/langgraph  (also mounted under /ai prefix → /api/v1/ai/chat/langgraph)
# Frontend calls /api/v1/chat/langgraph — registered via separate prefix below.
# ─────────────────────────────────────────────────────────────────────────────

chat_router = APIRouter(prefix="/chat", tags=["Chat"])


@chat_router.post(
    "/langgraph",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Send a message to the LangGraph CRM agent",
)
async def langgraph_chat(
    payload: ChatRequest,
    current_user: CurrentUser,
) -> ChatResponse:
    """
    Send a natural language message to the LangGraph workflow agent.

    The agent classifies intent, selects the appropriate CRM tool
    (log_interaction, search_interactions, doctor_profile, etc.),
    executes it, and returns a structured reply.

    Response includes:
    - **reply** — agent's natural language response
    - **extracted_fields** — structured fields parsed from the conversation
    """
    import re, json as _json

    full_context = ""
    if payload.history:
        for m in payload.history[-6:]:  # last 6 turns for context
            full_context += f"{m.role.capitalize()}: {m.content}\n"
    full_context += f"User: {payload.message}"

    reply = await run_workflow_agent(full_context.strip())

    # Try to extract structured fields from reply if it contains JSON
    extracted_fields = None
    try:
        match = re.search(r"\{[^{}]*\}", reply, re.DOTALL)
        if match:
            extracted_fields = _json.loads(match.group())
    except Exception:
        pass

    return ChatResponse(reply=reply, extracted_fields=extracted_fields)


@chat_router.get(
    "/history",
    status_code=status.HTTP_200_OK,
    summary="Get conversation history (placeholder)",
)
async def chat_history(current_user: CurrentUser) -> dict:
    """Returns an empty history — conversation is managed client-side."""
    return {"messages": []}
