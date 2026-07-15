"""
Pydantic schemas for the Doctor resource.

DoctorCreate  — POST /doctors          (input)
DoctorUpdate  — PATCH /doctors/{id}    (input, all optional)
DoctorRead    — any response           (output, never leaks sensitive data)
DoctorSummary — embedded in Interaction responses (lightweight)
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ── Base (fields shared across Create and Read) ───────────────────────────────
class DoctorBase(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100, examples=["Anjali"])
    last_name: str = Field(..., min_length=1, max_length=100, examples=["Sharma"])
    email: Optional[EmailStr] = Field(None, examples=["anjali.sharma@hospital.in"])
    phone: Optional[str] = Field(None, max_length=30, examples=["+91-9876543210"])
    specialty: Optional[str] = Field(None, max_length=100, examples=["Cardiology"])
    designation: Optional[str] = Field(
        None, max_length=100, examples=["Senior Consultant"]
    )
    institution: Optional[str] = Field(
        None, max_length=255, examples=["Apollo Hospitals"]
    )
    city: Optional[str] = Field(None, max_length=100, examples=["Mumbai"])
    state: Optional[str] = Field(None, max_length=100, examples=["Maharashtra"])
    country: str = Field(default="India", max_length=100)
    notes: Optional[str] = Field(None, examples=["Prefers email communication."])


# ── Request schemas ────────────────────────────────────────────────────────────
class DoctorCreate(DoctorBase):
    """Payload for creating a new doctor record."""
    pass


class DoctorUpdate(BaseModel):
    """
    Payload for partially updating a doctor record.
    Every field is optional — only provided fields are updated (PATCH semantics).
    """
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
class DoctorRead(DoctorBase):
    """
    Full doctor representation returned to the client.
    Includes server-generated fields (id, timestamps).
    """
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DoctorSummary(BaseModel):
    """
    Lightweight doctor reference embedded inside Interaction responses.
    Avoids returning the full doctor object on every interaction list call.
    """
    id: uuid.UUID
    first_name: str
    last_name: str
    specialty: Optional[str] = None
    institution: Optional[str] = None

    model_config = {"from_attributes": True}
