"""
Pydantic schemas package — re-exports all public schemas.

Import from here for clean imports across the application:
    from app.schemas import DoctorRead, InteractionCreate, ...
"""

from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.doctor import DoctorCreate, DoctorRead, DoctorSummary, DoctorUpdate
from app.schemas.interaction import (
    InteractionCreate,
    InteractionPage,
    InteractionPatch,
    InteractionRead,
    InteractionSummary,
    InteractionUpdate,
)
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.schemas.ai import (
    AIAnalysisRequest,
    AIAnalysisResponse,
    AIQuickSummaryRequest,
    AIQuickSummaryResponse,
    AIStatusResponse,
)

__all__ = [
    # Doctor
    "DoctorCreate", "DoctorRead", "DoctorSummary", "DoctorUpdate",
    # Interaction
    "InteractionCreate", "InteractionRead", "InteractionSummary",
    "InteractionUpdate", "InteractionPatch", "InteractionPage",
    # User
    "UserCreate", "UserRead", "UserUpdate",
    # Auth
    "LoginRequest", "TokenResponse",
    # AI
    "AIAnalysisRequest", "AIAnalysisResponse",
    "AIQuickSummaryRequest", "AIQuickSummaryResponse", "AIStatusResponse",
]
