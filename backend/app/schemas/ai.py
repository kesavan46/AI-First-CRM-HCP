"""
Pydantic schemas for AI-related request/response payloads.

Used by:
  - routers/ai.py       (HTTP boundary)
  - services/ai_service.py (service layer)
"""

import uuid
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────────────────────
# Request schemas
# ─────────────────────────────────────────────────────────────────────────────

class AIAnalysisRequest(BaseModel):
    """
    Body for POST /ai/analyze.
    References an existing interaction record by its UUID.
    """
    interaction_id: uuid.UUID = Field(
        ...,
        description="UUID of the saved interaction to analyse",
    )


class AIQuickSummaryRequest(BaseModel):
    """
    Body for POST /ai/quick-summary.
    Ad-hoc analysis on raw text — nothing is saved to the database.
    """
    notes: str = Field(
        ...,
        min_length=10,
        max_length=10_000,
        description="Raw interaction notes to analyse",
        examples=["Dr. Sharma was receptive to the new Cardivol formulation. "
                  "She requested a detailed clinical study PDF."],
    )
    interaction_type: Literal["visit", "call", "email", "conference", "virtual"] = Field(
        ...,
        description="Type of interaction — used to contextualise the AI summary",
    )
    doctor_name: Optional[str] = Field(
        None,
        max_length=200,
        description="Optional doctor name included in the summary prompt",
        examples=["Dr. Anjali Sharma"],
    )


# ─────────────────────────────────────────────────────────────────────────────
# Response schemas
# ─────────────────────────────────────────────────────────────────────────────

class AIAnalysisResponse(BaseModel):
    """
    Returned by POST /ai/analyze after the full LangGraph pipeline completes.
    These values are also persisted to the interaction record.
    """
    interaction_id: uuid.UUID
    ai_summary: str = Field(..., description="2-4 sentence AI-generated summary")
    ai_sentiment: Literal["positive", "neutral", "negative"] = Field(
        ..., description="Sentiment classified by the AI"
    )
    ai_action_items: List[str] = Field(
        ..., description="Follow-up tasks extracted by the AI"
    )
    ai_follow_up_date: Optional[datetime] = Field(
        None, description="AI-suggested follow-up date (UTC)"
    )
    processing_time_ms: Optional[int] = Field(
        None, description="Wall-clock time for the full pipeline in milliseconds"
    )


class AIQuickSummaryResponse(BaseModel):
    """Returned by POST /ai/quick-summary (no interaction_id — nothing was saved)."""
    summary: str
    sentiment: Literal["positive", "neutral", "negative"]
    action_items: List[str]


class AIStatusResponse(BaseModel):
    """Returned by GET /ai/status/{interaction_id}."""
    interaction_id: str
    ai_processed: bool = Field(
        ..., description="True if the LangGraph pipeline has run on this record"
    )
    ai_sentiment: Optional[Literal["positive", "neutral", "negative"]] = Field(
        None, description="Null until the pipeline has run"
    )
    has_notes: bool = Field(
        ..., description="True if the interaction has notes that can be analysed"
    )
