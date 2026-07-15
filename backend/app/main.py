"""
FastAPI application entry point.

Run with:
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Swagger UI:  http://localhost:8000/docs
ReDoc:       http://localhost:8000/redoc
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.llm import validate_groq_connection
from app.db.session import engine
from app.routers import ai, auth, doctors, interactions
from app.utils.exceptions import add_exception_handlers
from app.utils.logging import setup_logging

logger = logging.getLogger(__name__)


# ── Lifespan (startup / shutdown hooks) ───────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # ── Startup ─────────────────────────────────────────────────────────────
    setup_logging("DEBUG" if settings.DEBUG else "INFO")
    logger.info("Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)
    # Log DB host only (strip credentials from URL)
    db_host = settings.DATABASE_URL.split("@")[-1]
    logger.info("Database: %s", db_host)

    # Validate Groq API key and connectivity before accepting requests
    await validate_groq_connection()

    yield  # ← application handles requests here

    # ── Shutdown ─────────────────────────────────────────────────────────────
    logger.info("Shutting down — disposing database engine...")
    await engine.dispose()
    logger.info("Shutdown complete.")


# ── App factory ────────────────────────────────────────────────────────────────
def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "AI-powered CRM for logging and analysing interactions "
            "with Healthcare Professionals (Doctors)."
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # ── CORS ───────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.get_allowed_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Exception handlers ─────────────────────────────────────────────────────
    add_exception_handlers(app)

    # ── Routers ────────────────────────────────────────────────────────────────
    prefix = settings.API_V1_PREFIX

    app.include_router(auth.router, prefix=prefix)
    app.include_router(doctors.router, prefix=prefix)
    app.include_router(interactions.router, prefix=prefix)
    app.include_router(ai.router, prefix=prefix)
    app.include_router(ai.chat_router, prefix=prefix)  # /api/v1/chat/langgraph

    # ── Health check ───────────────────────────────────────────────────────────
    @app.get("/health", tags=["Health"])
    async def health_check() -> dict:
        """Lightweight liveness probe — no DB query required."""
        return {
            "status": "ok",
            "app": settings.APP_NAME,
            "version": settings.APP_VERSION,
        }

    return app


# ── Module-level app instance (used by uvicorn) ───────────────────────────────
app = create_app()
