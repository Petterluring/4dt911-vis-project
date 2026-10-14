"""Module for PostgreSQL dependencies."""

from logging import getLogger
from typing import Annotated, AsyncGenerator

from fastapi import Depends
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.exceptions import DatabaseUnavailableException

from .db_engine_factory import create_async_postgres_engine
from .users import Users

logger = getLogger(__name__)

db_engine: AsyncEngine = create_async_postgres_engine(
    Users.DEMO.load_user(),
    kwargs={
        "pool_size": 5,
        "max_overflow": 10,
        "pool_timeout": 10,
        "pool_pre_ping": True
    },
)

async def get_connection() -> AsyncGenerator[AsyncConnection, None]:
    """Get a connection from the global engine."""
    try:
        async with db_engine.connect() as connection:
            yield connection
    # TODO: Investigate what other exceptions might need to be caught here.
    except OperationalError as exc:
        logger.error(f"Database connection error: {exc}")
        raise DatabaseUnavailableException(
            f"Unable to establish database connection: {exc}"
        ) from exc


# FastAPI dependency for getting a database connection.
ConnectionDep = Annotated[
    AsyncConnection, Depends(get_connection)
]
