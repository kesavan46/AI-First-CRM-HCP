"""
HCP Service — business logic for Healthcare Professional CRUD.
All DB interaction is async via SQLAlchemy 2.0.
"""

import uuid
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.hcp import HCP
from app.schemas.hcp import HCPCreate, HCPUpdate


class HCPService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Read ───────────────────────────────────────────────────────────────────
    async def get_hcp(self, hcp_id: uuid.UUID) -> HCP:
        result = await self.db.execute(select(HCP).where(HCP.id == hcp_id))
        hcp = result.scalar_one_or_none()
        if not hcp:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HCP not found.")
        return hcp

    async def list_hcps(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        specialty: Optional[str] = None,
    ) -> List[HCP]:
        query = select(HCP)
        if search:
            term = f"%{search}%"
            query = query.where(
                or_(
                    HCP.first_name.ilike(term),
                    HCP.last_name.ilike(term),
                    HCP.institution.ilike(term),
                )
            )
        if specialty:
            query = query.where(HCP.specialty.ilike(f"%{specialty}%"))

        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    # ── Create ─────────────────────────────────────────────────────────────────
    async def create_hcp(self, payload: HCPCreate) -> HCP:
        # Check for duplicate email
        if payload.email:
            existing = await self.db.execute(
                select(HCP).where(HCP.email == payload.email)
            )
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An HCP with this email already exists.",
                )
        hcp = HCP(**payload.model_dump())
        self.db.add(hcp)
        await self.db.flush()   # get generated ID before commit
        await self.db.refresh(hcp)
        return hcp

    # ── Update ─────────────────────────────────────────────────────────────────
    async def update_hcp(self, hcp_id: uuid.UUID, payload: HCPUpdate) -> HCP:
        hcp = await self.get_hcp(hcp_id)
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(hcp, field, value)
        await self.db.flush()
        await self.db.refresh(hcp)
        return hcp

    # ── Delete ─────────────────────────────────────────────────────────────────
    async def delete_hcp(self, hcp_id: uuid.UUID) -> None:
        hcp = await self.get_hcp(hcp_id)
        await self.db.delete(hcp)
        await self.db.flush()
