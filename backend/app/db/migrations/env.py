"""
Alembic env.py — migration environment.

Supports both:
  - Online async migrations (run_async_migrations)
  - Offline migrations (run_migrations_offline)

Uses the SYNC_DATABASE_URL from settings because Alembic does not
support asyncpg directly. The sync psycopg2 URL is used here only.
"""

import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

# Load app config and models
from app.core.config import settings
from app.db.base import Base

# Import all models so Alembic autogenerate can detect them
from app.models import Doctor, Interaction, User  # noqa: F401

# ── Alembic config object ──────────────────────────────────────────────────────
config = context.config

# Set up logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Inject the DB URL from settings (overrides blank sqlalchemy.url in alembic.ini)
config.set_main_option("sqlalchemy.url", settings.SYNC_DATABASE_URL)

# Target metadata for autogenerate support
target_metadata = Base.metadata


# ── Offline migrations ─────────────────────────────────────────────────────────
def run_migrations_offline() -> None:
    """
    Emit SQL to stdout without a live DB connection.
    Useful for generating migration scripts for review.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Online migrations (sync engine via psycopg2) ───────────────────────────────
def run_migrations_online() -> None:
    """Run migrations against a live DB using a synchronous connection."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


# ── Entry point ────────────────────────────────────────────────────────────────
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
