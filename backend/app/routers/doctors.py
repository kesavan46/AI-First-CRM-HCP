"""
Doctors router — CRUD endpoints for Doctor records.

GET    /api/v1/doctors           → paginated list (with search/filter)
POST   /api/v1/doctors           → create a new doctor
GET    /api/v1/doctors/{id}      → get a single doctor
PATCH  /api/v1/doctors/{id}      → partial update
DELETE /api/v1/doctors/{id}      → delete
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Query

from app.routers.deps import AdminUser, CurrentUser, DBSession
from app.schemas.doctor import DoctorCreate, DoctorRead, DoctorUpdate
from app.services.doctor_service import DoctorService

router = APIRouter(prefix="/doctors", tags=["Doctors"])


@router.get("/", response_model=List[DoctorRead])
async def list_doctors(
    db: DBSession,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0, description="Records to skip"),
    limit: int = Query(default=20, ge=1, le=100, description="Max records to return"),
    search: Optional[str] = Query(
        default=None,
        description="Search by first name, last name, or institution",
    ),
    specialty: Optional[str] = Query(
        default=None,
        description="Filter by medical specialty",
    ),
) -> List[DoctorRead]:
    """Return a paginated, optionally filtered list of doctors."""
    return await DoctorService(db).list_doctors(
        skip=skip, limit=limit, search=search, specialty=specialty
    )


@router.post("/", response_model=DoctorRead, status_code=201)
async def create_doctor(
    payload: DoctorCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> DoctorRead:
    """Create a new doctor record."""
    return await DoctorService(db).create_doctor(payload)


@router.get("/{doctor_id}", response_model=DoctorRead)
async def get_doctor(
    doctor_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> DoctorRead:
    """Retrieve a single doctor by ID."""
    return await DoctorService(db).get_doctor(doctor_id)


@router.patch("/{doctor_id}", response_model=DoctorRead)
async def update_doctor(
    doctor_id: uuid.UUID,
    payload: DoctorUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> DoctorRead:
    """Partially update a doctor record."""
    return await DoctorService(db).update_doctor(doctor_id, payload)


@router.delete("/{doctor_id}", status_code=204)
async def delete_doctor(
    doctor_id: uuid.UUID,
    db: DBSession,
    current_user: AdminUser,  # only admins can delete doctors
) -> None:
    """Delete a doctor record. Requires admin role."""
    await DoctorService(db).delete_doctor(doctor_id)
