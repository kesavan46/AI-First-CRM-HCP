"""Pydantic schemas for authentication (login, token)."""

from pydantic import BaseModel, EmailStr

from app.schemas.user import UserRead


# ── Request ────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    """JSON body for POST /auth/login."""
    email: EmailStr
    password: str


# ── Response ───────────────────────────────────────────────────────────────────
class TokenResponse(BaseModel):
    """Returned on successful authentication."""
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class RefreshRequest(BaseModel):
    """Optional: used if refresh token flow is added later."""
    refresh_token: str
