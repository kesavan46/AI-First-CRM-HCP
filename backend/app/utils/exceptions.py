"""
Custom application exceptions and FastAPI exception handlers.

Register handlers in main.py:
    from app.utils.exceptions import add_exception_handlers
    add_exception_handlers(app)
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class CRMException(Exception):
    """Base class for all application-specific exceptions."""

    def __init__(self, detail: str, status_code: int = 400) -> None:
        self.detail = detail
        self.status_code = status_code
        super().__init__(detail)


class NotFoundError(CRMException):
    def __init__(self, resource: str, resource_id: str | None = None) -> None:
        msg = f"{resource} not found."
        if resource_id:
            msg = f"{resource} with id '{resource_id}' not found."
        super().__init__(detail=msg, status_code=404)


class ConflictError(CRMException):
    def __init__(self, detail: str) -> None:
        super().__init__(detail=detail, status_code=409)


class AIProcessingError(CRMException):
    def __init__(self, detail: str) -> None:
        super().__init__(detail=detail, status_code=500)


# ── Handlers ───────────────────────────────────────────────────────────────────

async def crm_exception_handler(request: Request, exc: CRMException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


def add_exception_handlers(app: FastAPI) -> None:
    """Register all custom exception handlers on the FastAPI app."""
    app.add_exception_handler(CRMException, crm_exception_handler)  # type: ignore[arg-type]
