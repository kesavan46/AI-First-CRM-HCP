"""
ORM models package.

Import all models here so Alembic autogenerate can discover every table
from a single import: `from app.models import *`
"""

from app.models.doctor import Doctor
from app.models.interaction import Interaction
from app.models.user import User

__all__ = ["Doctor", "Interaction", "User"]
