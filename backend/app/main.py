"""Main entrypoint for the backend FastAPI application."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncEngine

from app.exception_handling import register_exception_handlers
from app.remote_services.postgres.db_engine_factory import create_async_postgres_engine
from app.remote_services.postgres.users import Users
from app.router import health, hello


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application resources."""
    engine: AsyncEngine = create_async_postgres_engine(
        Users.DEMO.load_user(),
        kwargs={
            "pool_size": 5,
            "max_overflow": 10,
            "pool_timeout": 10,
            "pool_pre_ping": True,
        },
    )

    app.state.db_engine = engine

    try:
        yield
    finally:
        await engine.dispose()

app = FastAPI(title="4DT911 Visualization Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)
app.include_router(hello.router)
app.include_router(health.router)

