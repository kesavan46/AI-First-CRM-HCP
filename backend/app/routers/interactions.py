"""
Interactions Router
===================

Endpoint          Method   Description
─────────────────────────────────────────────────────────────────────────────
/interactions      POST    Log a new doctor interaction
/interactions      GET     List interactions (paginated, filtered)
/interactions/{id} GET     Get a single interaction
/interactions/{id} PUT     Full replace of an interaction
/interactions/{id} DELETE  Delete an interaction
/interactions/{id} PATCH   Partial update (bonus: for granular UI updates)
/interactions/doctor/{id} GET  All interactions for a specific doctor

All write endpoints require the current user to own the record.
All endpoints require a valid Bearer token.

Prefix is /api/v1 (mounted in main.py).
Full paths: /api/v1/interactions/...
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Query, status

from app.routers.deps import CurrentUser, DBSession
from app.schemas.interaction import (
    InteractionCreate,
    InteractionPage,
    InteractionPatch,
    InteractionRead,
    InteractionUpdate,
)
from app.services.interaction_service import InteractionService

router = APIRouter(prefix="/interactions", tags=["Interactions"])


# ─────────────────────────────────────────────────────────────────────────────
# POST /interactions
# ─────────────────────────────────────────────────────────────────────────────
@router.post(
    "/",
    response_model=InteractionRead,
    status_code=status.HTTP_201_CREATED,
    summary="Log a new interaction",
    response_description="The newly created interaction record",
)
async def create_interaction(
    payload: InteractionCreate,
    db: DBSession,
    current_user: CurrentUser,
) -> InteractionRead:
    """
    Log a new interaction between the current user and a doctor.

    - **doctor_id** — must reference an existing doctor record
    - **interaction_date** — ISO 8601 datetime with timezone
    - **interaction_type** — one of: `visit`, `call`, `email`, `conference`, `virtual`
    - **product_discussed** — optional product name
    - **summary** — optional short summary
    - **notes** — optional detailed free-text notes
    - **follow_up_date** — optional planned follow-up datetime
    - **status** — defaults to `draft`
    """
    return await InteractionService(db).create_interaction(
        payload, user_id=current_user.id
    )


# ─────────────────────────────────────────────────────────────────────────────
# GET /interactions
# ─────────────────────────────────────────────────────────────────────────────
@router.get(
    "/",
    response_model=InteractionPage,
    summary="List interactions",
    response_description="Paginated list of interactions for the current user",
)
async def list_interactions(
    db: DBSession,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0, description="Number of records to skip"),
    limit: int = Query(default=20, ge=1, le=100, description="Max records per page"),
    status_filter: Optional[str] = Query(
        default=None,
        alias="status",
        description="Filter by status: draft | submitted | reviewed",
    ),
    interaction_type: Optional[str] = Query(
        default=None,
        description="Filter by type: visit | call | email | conference | virtual",
    ),
    doctor_id: Optional[uuid.UUID] = Query(
        default=None,
        description="Filter to interactions with a specific doctor",
    ),
) -> InteractionPage:
    """
    Return a paginated list of interactions created by the current user.

    Supports optional query parameter filters:
    - `status` — workflow status
    - `interaction_type` — type of contact
    - `doctor_id` — narrow to a specific doctor

    Response includes pagination metadata (`total`, `page`, `pages`).
    """
    return await InteractionService(db).list_interactions(
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        status_filter=status_filter,
        interaction_type=interaction_type,
        doctor_id=doctor_id,
    )


# ─────────────────────────────────────────────────────────────────────────────
# NOTE: /doctor/{doctor_id} MUST be registered before /{interaction_id}
# to prevent FastAPI routing /doctor/... into the UUID path parameter.
# ─────────────────────────────────────────────────────────────────────────────
@router.get(
    "/doctor/{doctor_id}",
    response_model=InteractionPage,
    summary="List all interactions for a doctor",
    response_description="Paginated interactions for the given doctor",
)
async def list_interactions_by_doctor(
    doctor_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> InteractionPage:
    """
    Return all interactions (from any user) for a specific doctor.
    Useful for building a full interaction history on a doctor's profile page.
    """
    return await InteractionService(db).list_by_doctor(
        doctor_id, skip=skip, limit=limit
    )


# ─────────────────────────────────────────────────────────────────────────────
# GET /interactions/{id}
# ─────────────────────────────────────────────────────────────────────────────
@router.get(
    "/{interaction_id}",
    response_model=InteractionRead,
    summary="Get a single interaction",
    response_description="Full interaction record including AI-generated fields",
)
async def get_interaction(
    interaction_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> InteractionRead:
    """
    Retrieve a complete interaction record by its UUID.

    Returns all fields including:
    - Rep-supplied fields (summary, notes, follow_up_date, …)
    - AI-generated fields (ai_summary, ai_sentiment, ai_action_items, …)
    - Nested doctor object
    """
    return await InteractionService(db).get_interaction(interaction_id)


# ─────────────────────────────────────────────────────────────────────────────
# PUT /interactions/{id}
# ─────────────────────────────────────────────────────────────────────────────
@router.put(
    "/{interaction_id}",
    response_model=InteractionRead,
    summary="Replace an interaction (full update)",
    response_description="The updated interaction record",
)
async def replace_interaction(
    interaction_id: uuid.UUID,
    payload: InteractionUpdate,
    db: DBSession,
    current_user: CurrentUser,
) -> InteractionRead:
    """
    Full replacement of a writable interaction record (PUT semantics).

    All writable fields must be provided — missing fields will be set to
    their default or `null` values. The following fields are immutable:
    - **id** — set at creation
    - **doctor_id** — cannot be changed after creation
    - **user_id** — always the original creator
    - **ai_*** fields — managed exclusively by the AI pipeline
    - **created_at** — set at creation

    Only the user who created the interaction can update it.
    """
    return await InteractionService(db).replace_interaction(
        interaction_id, payload, user_id=current_user.id
    )


# ─────────────────────────────────────────────────────────────────────────────
# PATCH /interactions/{id}
# ─────────────────────────────────────────────────────────────────────────────
@router.patch(
    "/{interaction_id}",
    response_model=InteractionRead,
    summary="Partially update an interaction",
    response_description="The updated interaction record",
)
async def patch_interaction(
    interaction_id: uuid.UUID,
    payload: InteractionPatch,
    db: DBSession,
    current_user: CurrentUser,
) -> InteractionRead:
    """
    Partial update of an interaction (PATCH semantics).

    Only the fields included in the request body are updated.
    Useful for single-field edits (e.g. changing status from `draft` → `submitted`).

    Only the user who created the interaction can patch it.
    """
    return await InteractionService(db).patch_interaction(
        interaction_id, payload, user_id=current_user.id
    )


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /interactions/{id}
# ─────────────────────────────────────────────────────────────────────────────
@router.delete(
    "/{interaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an interaction",
    response_description="No content — interaction was deleted",
)
async def delete_interaction(
    interaction_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
) -> None:
    """
    Permanently delete an interaction record.

    Only the user who created the interaction can delete it.
    This action is irreversible.
    """
    await InteractionService(db).delete_interaction(
        interaction_id, user_id=current_user.id
    )
