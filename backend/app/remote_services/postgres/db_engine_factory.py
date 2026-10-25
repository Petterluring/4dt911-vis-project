"""Module for creating PostgreSQL SQLAlchemy engines."""
from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine

from .users import DBUser

if TYPE_CHECKING:
    from sqlalchemy.engine import Engine
    from sqlalchemy.ext.asyncio import AsyncEngine

def _build_postgres_url(user: DBUser) -> str:
    return ("postgresql+psycopg://"
          f"{user.username}:{user.password}"
          f"@{user.host}:{user.port}"
          f"/{user.database}"
    )

def create_async_postgres_engine(user: DBUser, kwargs: dict[str, Any] | None = None) -> AsyncEngine:
    """Create an asynchronous SQLAlchemy engine for the given PostgreSQL user."""
    url = _build_postgres_url(user)
    return create_async_engine(url, **(kwargs or {}))

def create_postgres_engine(user: DBUser, kwargs: dict[str, Any] | None = None) -> Engine:
    """Create a synchronous SQLAlchemy engine for the given PostgreSQL user."""
    url = _build_postgres_url(user)
    return create_engine(url, **(kwargs or {}))
