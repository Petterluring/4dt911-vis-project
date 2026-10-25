"""Module for PostgreSQL dependencies."""

from logging import getLogger
from typing import Annotated, AsyncGenerator, cast

from fastapi import Depends, Request
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncEngine

from app.exceptions import DatabaseUnavailableException

logger = getLogger(__name__)

def get_db_engine(request: Request) -> AsyncEngine:
    """Retrieve the database engine from application state."""
    return cast(AsyncEngine, request.app.state.db_engine)

async def get_connection(
        engine: Annotated[AsyncEngine, Depends(get_db_engine)]
) -> AsyncGenerator[AsyncConnection, None]:
    """Get a connection from the global engine."""
    try:
        async with engine.connect() as connection:
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
