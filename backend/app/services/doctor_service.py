"""
Doctor Service — business logic for Doctor CRUD operations.
All database calls are async via SQLAlchemy 2.0.
"""

import uuid
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.doctor import Doctor
from app.schemas.doctor import DoctorCreate, DoctorUpdate


class DoctorService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Read ───────────────────────────────────────────────────────────────────
    async def get_doctor(self, doctor_id: uuid.UUID) -> Doctor:
        result = await self.db.execute(
            select(Doctor).where(Doctor.id == doctor_id)
        )
        doctor = result.scalar_one_or_none()
        if not doctor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Doctor with id '{doctor_id}' not found.",
            )
        return doctor

    async def list_doctors(
        self,
        skip: int = 0,
        limit: int = 20,
        search: Optional[str] = None,
        specialty: Optional[str] = None,
    ) -> List[Doctor]:
        query = select(Doctor)

        if search:
            term = f"%{search}%"
            query = query.where(
                or_(
                    Doctor.first_name.ilike(term),
                    Doctor.last_name.ilike(term),
                    Doctor.institution.ilike(term),
                )
            )
        if specialty:
            query = query.where(Doctor.specialty.ilike(f"%{specialty}%"))

        query = query.order_by(Doctor.last_name, Doctor.first_name).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    # ── Create ─────────────────────────────────────────────────────────────────
    async def create_doctor(self, payload: DoctorCreate) -> Doctor:
        # Prevent duplicate email
        if payload.email:
            existing = await self.db.execute(
                select(Doctor).where(Doctor.email == payload.email)
            )
            if existing.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"A doctor with email '{payload.email}' already exists.",
                )

        doctor = Doctor(**payload.model_dump())
        self.db.add(doctor)
        await self.db.flush()       # get server-generated id before commit
        await self.db.refresh(doctor)
        return doctor

    # ── Update ─────────────────────────────────────────────────────────────────
    async def update_doctor(
        self, doctor_id: uuid.UUID, payload: DoctorUpdate
    ) -> Doctor:
        doctor = await self.get_doctor(doctor_id)
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(doctor, field, value)
        await self.db.flush()
        await self.db.refresh(doctor)
        return doctor

    # ── Delete ─────────────────────────────────────────────────────────────────
    async def delete_doctor(self, doctor_id: uuid.UUID) -> None:
        doctor = await self.get_doctor(doctor_id)
        await self.db.delete(doctor)
        await self.db.flush()
