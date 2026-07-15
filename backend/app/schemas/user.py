"""
Pydantic schemas for the User resource.

UserCreate  — POST /auth/register      (input)
UserUpdate  — PATCH /users/{id}        (input, all optional)
UserRead    — any response             (output, never exposes hashed_password)
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# ── Base ───────────────────────────────────────────────────────────────────────
class UserBase(BaseModel):
    email: EmailStr = Field(..., examples=["rep@pharma.com"])
    full_name: str = Field(..., min_length=1, max_length=255, examples=["Ravi Kumar"])
    role: str = Field(
        default="rep",
        pattern=r"^(rep|manager|admin)$",
        examples=["rep"],
    )
    is_active: bool = Field(default=True)


# ── Request schemas ────────────────────────────────────────────────────────────
class UserCreate(UserBase):
    """Payload for registering a new CRM user."""
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        examples=["Secure@123"],
    )

    @field_validator("password")
    @classmethod
    def password_must_contain_digit(cls, v: str) -> str:
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit.")
        return v


class UserUpdate(BaseModel):
    """
    Payload for partially updating a user record.
    All fields optional — PATCH semantics.
    """
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    role: Optional[str] = Field(None, pattern=r"^(rep|manager|admin)$")
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8, max_length=128)


# ── Response schemas ───────────────────────────────────────────────────────────
class UserRead(UserBase):
    """
    User representation returned to the client.
    hashed_password is intentionally excluded.
    """
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
