"""
Pagination helpers.

Usage in routes:
    params: PaginationParams = Depends(pagination_params)
"""

from dataclasses import dataclass
from typing import Generic, List, TypeVar

from fastapi import Query

T = TypeVar("T")


@dataclass
class PaginationParams:
    skip: int
    limit: int

    @property
    def page(self) -> int:
        """1-based page number derived from skip/limit."""
        return (self.skip // self.limit) + 1


async def pagination_params(
    skip: int = Query(default=0, ge=0, description="Number of records to skip"),
    limit: int = Query(default=20, ge=1, le=100, description="Max records to return"),
) -> PaginationParams:
    """FastAPI dependency that returns validated pagination parameters."""
    return PaginationParams(skip=skip, limit=limit)


class PagedResponse(Generic[T]):
    """Generic wrapper for paginated list responses."""

    def __init__(self, items: List[T], total: int, params: PaginationParams) -> None:
        self.items = items
        self.total = total
        self.skip = params.skip
        self.limit = params.limit
        self.page = params.page
        self.pages = max(1, -(-total // params.limit))  # ceiling division

    def to_dict(self) -> dict:
        return {
            "items": self.items,
            "total": self.total,
            "skip": self.skip,
            "limit": self.limit,
            "page": self.page,
            "pages": self.pages,
        }
