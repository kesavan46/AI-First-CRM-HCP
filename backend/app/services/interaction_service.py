"""
Interaction Service — all business logic for interaction log CRUD.

Design principles:
  - Routes are thin; all logic lives here.
  - Every write operation validates ownership (current user must own the record).
  - Queries are async (SQLAlchemy 2.0 + asyncpg).
  - Doctor relationship is always eager-loaded so the router never issues N+1 queries.
  - Raises HTTPException directly so FastAPI can serialise the error response cleanly.
"""

import uuid
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.doctor import Doctor
from app.models.interaction import Interaction
from app.schemas.interaction import (
    InteractionCreate,
    InteractionPage,
    InteractionPatch,
    InteractionSummary,
    InteractionUpdate,
)


class InteractionService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ─────────────────────────────────────────────────────────────────────────
    # Private helpers
    # ─────────────────────────────────────────────────────────────────────────

    async def _get_or_404(self, interaction_id: uuid.UUID) -> Interaction:
        """
        Fetch a single interaction with its doctor pre-loaded.
        Raises HTTP 404 if not found.
        """
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
        return interaction

    def _assert_ownership(
        self, interaction: Interaction, user_id: uuid.UUID
    ) -> None:
        """
        Raise HTTP 403 if the current user did not create this interaction.
        Admins bypass this check (handled upstream in the router if needed).
        """
        if interaction.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to modify this interaction.",
            )

    async def _assert_doctor_exists(self, doctor_id: uuid.UUID) -> None:
        """Raise HTTP 404 if the referenced doctor does not exist."""
        result = await self.db.execute(
            select(Doctor.id).where(Doctor.id == doctor_id)
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Doctor '{doctor_id}' not found.",
            )

    # ─────────────────────────────────────────────────────────────────────────
    # POST /interactions
    # ─────────────────────────────────────────────────────────────────────────

    async def create_interaction(
        self,
        payload: InteractionCreate,
        user_id: uuid.UUID,
    ) -> Interaction:
        """
        Validate the referenced doctor exists, then persist the new interaction.
        Returns the newly created record with its doctor relationship populated.
        """
        await self._assert_doctor_exists(payload.doctor_id)

        interaction = Interaction(
            **payload.model_dump(),
            user_id=user_id,
        )
        self.db.add(interaction)
        await self.db.flush()  # get server-generated id before commit

        # Re-fetch so the doctor relationship is loaded
        return await self._get_or_404(interaction.id)

    # ─────────────────────────────────────────────────────────────────────────
    # GET /interactions
    # ─────────────────────────────────────────────────────────────────────────

    async def list_interactions(
        self,
        user_id: uuid.UUID,
        skip: int = 0,
        limit: int = 20,
        status_filter: Optional[str] = None,
        interaction_type: Optional[str] = None,
        doctor_id: Optional[uuid.UUID] = None,
    ) -> InteractionPage:
        """
        Return a paginated list of interactions owned by *user_id*.
        Supports optional filters: status, interaction_type, doctor_id.
        Returns an InteractionPage with total count for frontend pagination.
        """
        base_query = select(Interaction).where(Interaction.user_id == user_id)

        # ── Apply filters ──────────────────────────────────────────────────────
        if status_filter:
            base_query = base_query.where(Interaction.status == status_filter)
        if interaction_type:
            base_query = base_query.where(
                Interaction.interaction_type == interaction_type
            )
        if doctor_id:
            base_query = base_query.where(Interaction.doctor_id == doctor_id)

        # ── Count total matching records (for pagination metadata) ─────────────
        count_result = await self.db.execute(
            select(func.count()).select_from(base_query.subquery())
        )
        total: int = count_result.scalar_one()

        # ── Fetch page ─────────────────────────────────────────────────────────
        page_query = (
            base_query
            .options(selectinload(Interaction.doctor))
            .order_by(Interaction.interaction_date.desc())
            .offset(skip)
            .limit(limit)
        )
        rows = await self.db.execute(page_query)
        items = list(rows.scalars().all())

        pages = max(1, -(-total // limit))  # ceiling division
        page = (skip // limit) + 1

        return InteractionPage(
            items=[InteractionSummary.model_validate(i) for i in items],
            total=total,
            skip=skip,
            limit=limit,
            page=page,
            pages=pages,
        )

    # ─────────────────────────────────────────────────────────────────────────
    # GET /interactions/{id}
    # ─────────────────────────────────────────────────────────────────────────

    async def get_interaction(self, interaction_id: uuid.UUID) -> Interaction:
        """
        Fetch a single interaction by ID.
        No ownership check — any authenticated user can view any interaction.
        """
        return await self._get_or_404(interaction_id)

    # ─────────────────────────────────────────────────────────────────────────
    # PUT /interactions/{id}  — full replace
    # ─────────────────────────────────────────────────────────────────────────

    async def replace_interaction(
        self,
        interaction_id: uuid.UUID,
        payload: InteractionUpdate,
        user_id: uuid.UUID,
    ) -> Interaction:
        """
        Full update (PUT semantics): replace all writable fields.
        - Only the owning user can update.
        - doctor_id cannot be changed; HTTP 422 if the caller tries to switch it.
        """
        interaction = await self._get_or_404(interaction_id)
        self._assert_ownership(interaction, user_id)

        if payload.doctor_id != interaction.doctor_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="doctor_id cannot be changed after an interaction is created.",
            )

        update_data = payload.model_dump(
            exclude={"doctor_id"}  # never overwrite FK
        )
        for field, value in update_data.items():
            setattr(interaction, field, value)

        await self.db.flush()
        await self.db.refresh(interaction)
        return interaction

    # ─────────────────────────────────────────────────────────────────────────
    # PATCH /interactions/{id}  — partial update
    # ─────────────────────────────────────────────────────────────────────────

    async def patch_interaction(
        self,
        interaction_id: uuid.UUID,
        payload: InteractionPatch,
        user_id: uuid.UUID,
    ) -> Interaction:
        """
        Partial update (PATCH semantics): only update provided fields.
        Only the owning user can patch.
        """
        interaction = await self._get_or_404(interaction_id)
        self._assert_ownership(interaction, user_id)

        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(interaction, field, value)

        await self.db.flush()
        await self.db.refresh(interaction)
        return interaction

    # ─────────────────────────────────────────────────────────────────────────
    # DELETE /interactions/{id}
    # ─────────────────────────────────────────────────────────────────────────

    async def delete_interaction(
        self,
        interaction_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> None:
        """
        Delete an interaction.
        Only the owning user can delete their own records.
        """
        interaction = await self._get_or_404(interaction_id)
        self._assert_ownership(interaction, user_id)
        await self.db.delete(interaction)
        await self.db.flush()

    # ─────────────────────────────────────────────────────────────────────────
    # GET /interactions/doctor/{doctor_id}
    # ─────────────────────────────────────────────────────────────────────────

    async def list_by_doctor(
        self,
        doctor_id: uuid.UUID,
        skip: int = 0,
        limit: int = 20,
    ) -> InteractionPage:
        """
        Return all interactions for a specific doctor (across all users).
        Validates the doctor exists first.
        """
        await self._assert_doctor_exists(doctor_id)

        base_query = select(Interaction).where(Interaction.doctor_id == doctor_id)

        count_result = await self.db.execute(
            select(func.count()).select_from(base_query.subquery())
        )
        total: int = count_result.scalar_one()

        rows = await self.db.execute(
            base_query
            .options(selectinload(Interaction.doctor))
            .order_by(Interaction.interaction_date.desc())
            .offset(skip)
            .limit(limit)
        )
        items = list(rows.scalars().all())
        pages = max(1, -(-total // limit))
        page = (skip // limit) + 1

        return InteractionPage(
            items=[InteractionSummary.model_validate(i) for i in items],
            total=total,
            skip=skip,
            limit=limit,
            page=page,
            pages=pages,
        )
