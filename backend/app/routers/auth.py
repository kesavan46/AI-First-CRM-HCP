"""
Auth router — registration and login endpoints.

POST /api/v1/auth/register   → create a new user account
POST /api/v1/auth/login      → return JWT access token
GET  /api/v1/auth/me         → return the authenticated user
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.routers.deps import CurrentUser, DBSession
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserCreate, UserRead
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserRead, status_code=201)
async def register(payload: UserCreate, db: DBSession) -> UserRead:
    """Register a new CRM user account."""
    return await AuthService(db).register(payload)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: DBSession) -> TokenResponse:
    """Authenticate and return a Bearer access token."""
    return await AuthService(db).login(payload)


@router.get("/me", response_model=UserRead)
async def me(current_user: CurrentUser) -> UserRead:
    """Return the currently authenticated user's profile."""
    return current_user
