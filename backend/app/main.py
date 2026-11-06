"""Main entrypoint for the backend FastAPI application."""

from contextlib import asynccontextmanager
from logging import getLogger
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mlflow import MlflowClient
from sqlalchemy.ext.asyncio import AsyncEngine

from app.exception_handling import register_exception_handlers
from app.remote_services.mlflow.config import MlflowConfig
from app.remote_services.mlflow.model.model_registry import ModelRegistry
from app.remote_services.postgres.db_engine_factory import create_async_postgres_engine
from app.remote_services.postgres.users import Users
from app.router import (
    amenities,
    cholorheth_map,
    health,
    hello,
    listing_comparison,
    scatterplots,
)

from .configs import db_user, mlflow_user, postgres_engine_kwargs

logger = getLogger("uvicorn.error")

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
    # Created after the global configuration, so it picks up the tracking URI and credentials.
    app.state.mlflow_client = MlflowClient()

    model_registry = ModelRegistry()
    model_registry.load_all()
    app.state.model_registry = model_registry
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
app.include_router(listing_comparison.router)
app.include_router(amenities.router)
