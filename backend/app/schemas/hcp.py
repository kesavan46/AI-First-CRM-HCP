"""Pydantic schemas for the HCP (Healthcare Professional) resource."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ── Base ───────────────────────────────────────────────────────────────────────
class HCPBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    specialty: Optional[str] = Field(None, max_length=100)
    designation: Optional[str] = Field(None, max_length=100)
    institution: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: str = Field(default="India", max_length=100)
    notes: Optional[str] = None


# ── Request schemas ────────────────────────────────────────────────────────────
class HCPCreate(HCPBase):
    """Used for POST /hcps."""
    pass


class HCPUpdate(BaseModel):
    """Used for PATCH /hcps/{id}. All fields optional."""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    specialty: Optional[str] = Field(None, max_length=100)
    designation: Optional[str] = Field(None, max_length=100)
    institution: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None


# ── Response schemas ───────────────────────────────────────────────────────────
class HCPRead(HCPBase):
    """Full HCP representation returned to client."""
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class HCPSummary(BaseModel):
    """Lightweight HCP reference embedded in Interaction responses."""
    id: uuid.UUID
    first_name: str
    last_name: str
    specialty: Optional[str] = None
    institution: Optional[str] = None

    model_config = {"from_attributes": True}
