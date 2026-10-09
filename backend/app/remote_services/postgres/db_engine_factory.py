"""Module for creating PostgreSQL SQLAlchemy engines."""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy.ext.asyncio import create_async_engine

from .users import DBUser

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncEngine


def create_postgres_engine(user: DBUser, kwargs: dict[str, Any] = {}) -> AsyncEngine:
    """Create a SQLAlchemy engine for the given PostgreSQL user."""
    url = ("postgresql+psycopg://"
          f"{user.username}:{user.password}"
          f"@{user.host}:{user.port}"
          f"/{user.database}"
    )
    return create_async_engine(url, **kwargs)
