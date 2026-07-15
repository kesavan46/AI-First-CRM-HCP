"""
SQLAlchemy declarative base.

All ORM models inherit from `Base`.
Models are imported at the bottom of this file so that Alembic's
autogenerate command can detect every table from a single import.
"""

from sqlalchemy.orm import DeclarativeBase, declared_attr


class Base(DeclarativeBase):
    """
    Shared base for all ORM models.

    Provides:
    - Automatic __tablename__ derived from class name (PascalCase → snake_case plural)
    - Consistent __repr__ for debugging
    """

    @declared_attr.directive
    def __tablename__(cls) -> str:  # noqa: N805
        """
        Derive table name from class name.
        Examples: Doctor → doctors, Interaction → interactions, User → users
        """
        import re
        name = re.sub(r"(?<!^)(?=[A-Z])", "_", cls.__name__).lower()
        return f"{name}s"
