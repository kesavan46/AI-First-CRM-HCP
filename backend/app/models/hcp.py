"""
HCP (Healthcare Professional) ORM model.

Represents a doctor, nurse, pharmacist, or any other healthcare professional
that a sales rep / medical liaison interacts with.
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class HCP(Base):
    """Healthcare Professional entity."""

    __tablename__ = "hcps"

    # ── Primary key ────────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )

    # ── Identity ───────────────────────────────────────────────────────────────
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True, index=True
    )
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)

    # ── Professional details ───────────────────────────────────────────────────
    specialty: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # e.g. "Cardiology", "Oncology"
    designation: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # e.g. "Senior Consultant", "Head of Department"
    institution: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )  # Hospital / clinic name
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str] = mapped_column(String(100), nullable=False, default="India")

    # ── Additional info ────────────────────────────────────────────────────────
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Timestamps ─────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ── Relationships ──────────────────────────────────────────────────────────
    interactions: Mapped[list["Interaction"]] = relationship(  # noqa: F821
        "Interaction", back_populates="hcp", lazy="select"
    )
