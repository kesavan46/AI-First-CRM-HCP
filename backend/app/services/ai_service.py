"""
AI Service — the only component that talks to the LangGraph pipeline.

FastAPI routes → AIService → interaction_graph → nodes → tools → Groq LLM
                           ↓
                      PostgreSQL (via SQLAlchemy)

Responsibilities:
  - Load the interaction record from the DB
  - Build the initial graph state
  - Invoke the graph (async)
  - Persist AI results back to the interaction record
  - Return a typed response schema to the router

The LangGraph graph is NEVER imported directly in a router.
Routes call AIService methods only.
"""

import time
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.agents.interaction_graph import interaction_graph
from app.agents.state import InteractionAnalysisState
from app.models.doctor import Doctor
from app.models.interaction import Interaction
from app.schemas.ai import (
    AIAnalysisResponse,
    AIQuickSummaryRequest,
    AIQuickSummaryResponse,
)


class AIService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        # Reuse the module-level compiled graph singleton
        self._graph = interaction_graph

    # ─────────────────────────────────────────────────────────────────────────
    # POST /ai/analyze  — full pipeline, persists results to DB
    # ─────────────────────────────────────────────────────────────────────────

    async def analyze_interaction(
        self, interaction_id: uuid.UUID
    ) -> AIAnalysisResponse:
        """
        Run the full LangGraph pipeline on a saved interaction record.

        Steps:
          1. Load interaction + doctor from DB
          2. Build initial graph state (all inputs, all outputs = None)
          3. ainvoke() — runs summarise → sentiment → action_items → follow_up
          4. Check for pipeline errors
          5. Write AI results back to the interaction row
          6. Return AIAnalysisResponse

        Raises:
            HTTP 404  — interaction not found
            HTTP 422  — interaction has no notes to analyse
            HTTP 500  — LangGraph pipeline error
        """

        # ── 1. Load interaction ───────────────────────────────────────────────
        result = await self.db.execute(
            select(Interaction)
            .options(selectinload(Interaction.doctor))
            .where(Interaction.id == interaction_id)
        )
        interaction = result.scalar_one_or_none()
        if not interaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Interaction '{interaction_id}' not found.",
            )

        if not interaction.notes:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Interaction has no notes. Add notes before running AI analysis.",
            )

        # ── 2. Build initial state ────────────────────────────────────────────
        doctor_name: str | None = None
        if interaction.doctor:
            doctor_name = (
                f"{interaction.doctor.first_name} {interaction.doctor.last_name}"
            )

        initial_state: InteractionAnalysisState = {
            "interaction_id": str(interaction_id),
            "raw_notes":       interaction.notes,
            "interaction_type": interaction.interaction_type,
            "doctor_name":     doctor_name,
            # outputs — all None at start
            "summary":         None,
            "sentiment":       None,
            "action_items":    None,
            "follow_up_date":  None,
            # control
            "error":           None,
        }

        # ── 3. Run the graph ──────────────────────────────────────────────────
        start_ms = time.monotonic()
        final_state: InteractionAnalysisState = await self._graph.ainvoke(
            initial_state
        )
        elapsed_ms = int((time.monotonic() - start_ms) * 1000)

        # ── 4. Surface pipeline errors ────────────────────────────────────────
        if final_state.get("error"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"AI pipeline error: {final_state['error']}",
            )

        # ── 5. Persist AI results to the interaction row ──────────────────────
        interaction.ai_summary        = final_state.get("summary")
        interaction.ai_sentiment      = final_state.get("sentiment")
        interaction.ai_action_items   = final_state.get("action_items") or []
        interaction.ai_follow_up_date = final_state.get("follow_up_date")
        interaction.ai_processed      = True
        await self.db.flush()

        # ── 6. Return response ────────────────────────────────────────────────
        return AIAnalysisResponse(
            interaction_id=interaction_id,
            ai_summary=interaction.ai_summary or "",
            ai_sentiment=interaction.ai_sentiment or "neutral",
            ai_action_items=interaction.ai_action_items or [],
            ai_follow_up_date=interaction.ai_follow_up_date,
            processing_time_ms=elapsed_ms,
        )

    # ─────────────────────────────────────────────────────────────────────────
    # POST /ai/quick-summary  — preview pipeline, no DB write
    # ─────────────────────────────────────────────────────────────────────────

    async def quick_summary(
        self, payload: AIQuickSummaryRequest
    ) -> AIQuickSummaryResponse:
        """
        Run the full pipeline on ad-hoc text without touching the database.

        Used for live preview in the frontend while the rep is filling
        the interaction form — before the record is saved.
        """
        initial_state: InteractionAnalysisState = {
            "interaction_id":  "preview",
            "raw_notes":        payload.notes,
            "interaction_type": payload.interaction_type,
            "doctor_name":      payload.doctor_name,
            "summary":          None,
            "sentiment":        None,
            "action_items":     None,
            "follow_up_date":   None,
            "error":            None,
        }

        final_state: InteractionAnalysisState = await self._graph.ainvoke(
            initial_state
        )

        return AIQuickSummaryResponse(
            summary=final_state.get("summary") or "",
            sentiment=final_state.get("sentiment") or "neutral",
            action_items=final_state.get("action_items") or [],
        )

    # ─────────────────────────────────────────────────────────────────────────
    # GET /ai/status/{interaction_id}
    # ─────────────────────────────────────────────────────────────────────────

    async def get_ai_status(self, interaction_id: uuid.UUID) -> dict:
        """
        Return the AI processing status for an interaction without
        running the pipeline.
        """
        result = await self.db.execute(
            select(Interaction).where(Interaction.id == interaction_id)
        )
        interaction = result.scalar_one_or_none()
        if not interaction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Interaction '{interaction_id}' not found.",
            )
        return {
            "interaction_id": str(interaction.id),
            "ai_processed":   interaction.ai_processed,
            "ai_sentiment":   interaction.ai_sentiment,
            "has_notes":      bool(interaction.notes),
        }
