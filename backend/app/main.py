"""Main entrypoint for the backend FastAPI application."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncEngine

from app.exception_handling import register_exception_handlers
from app.remote_services.mlflow.config import MlflowConfig
from app.remote_services.postgres.db_engine_factory import create_async_postgres_engine
from app.router import cholorheth_map, health, hello, scatterplots

from .configs import db_user, mlflow_user, postgres_engine_kwargs


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Manage application resources."""
    engine: AsyncEngine = create_async_postgres_engine(
        db_user,
        kwargs=postgres_engine_kwargs,
    )
    app.state.db_engine = engine

    MlflowConfig.set_tracking_and_credentials(user=mlflow_user)
    MlflowConfig.set_certificate() # Use default path
    MlflowConfig.set_multipart_download(enabled=False)
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
app.include_router(cholorheth_map.router)
app.include_router(scatterplots.router)
