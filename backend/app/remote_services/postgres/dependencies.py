"""Module for PostgreSQL dependencies."""

from typing import Annotated, AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncConnection

from .db_engine_factory import create_postgres_engine
from .users import Users

# Should we make a try statement to handle engine creation errors?
engine = create_postgres_engine(
    Users.DEMO.load_user(), kwargs={
        "pool_size": 5,
        "max_overflow": 10,
        "pool_timeout": 30,
        "pool_pre_ping": True
    }
)

async def get_connection() -> AsyncGenerator[AsyncConnection, None]:
    """Get a connection from the global engine."""
    async with engine.connect() as connection:
        yield connection


ConnectionDep = Annotated[
    AsyncConnection, Depends(get_connection)
]
