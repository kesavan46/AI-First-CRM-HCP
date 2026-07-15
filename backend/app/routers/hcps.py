"""
HCPs router — CRUD endpoints for Healthcare Professionals.

GET    /api/v1/hcps            → paginated list
POST   /api/v1/hcps            → create HCP
GET    /api/v1/hcps/{id}       → get single HCP
PATCH  /api/v1/hcps/{id}       → partial update
DELETE /api/v1/hcps/{id}       → soft-delete (sets is_active=False in future)
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Query

from app.routers.deps import CurrentUser, DBSession
from app.schemas.hcp import HCPCreate, HCPRead, HCPUpdate
from app.services.hcp_service import HCPService

router = APIRouter(prefix="/hcps", tags=["HCPs"])


@router.get("/", response_model=List[HCPRead])
async def list_hcps(
    db: DBSession,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None, description="Search by name or institution"),
    specialty: Optional[str] = Query(default=None),
) -> List[HCPRead]:
    """Return a paginated, optionally filtered list of HCPs."""
    return await HCPService(db).list_hcps(
        skip=skip, limit=limit, search=search, specialty=specialty
    )


@router.post("/", response_model=HCPRead, status_code=201)
async def create_hcp(
    payload: HCPCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> HCPRead:
    """Create a new HCP record."""
    return await HCPService(db).create_hcp(payload)


@router.get("/{hcp_id}", response_model=HCPRead)
async def get_hcp(
    hcp_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> HCPRead:
    """Retrieve a single HCP by ID."""
    return await HCPService(db).get_hcp(hcp_id)


@router.patch("/{hcp_id}", response_model=HCPRead)
async def update_hcp(
    hcp_id: uuid.UUID,
    payload: HCPUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> HCPRead:
    """Partially update an HCP record."""
    return await HCPService(db).update_hcp(hcp_id, payload)


@router.delete("/{hcp_id}", status_code=204)
async def delete_hcp(
    hcp_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    """Delete an HCP record."""
    await HCPService(db).delete_hcp(hcp_id)
