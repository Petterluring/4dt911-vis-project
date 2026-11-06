"""Module for storing global exception handling for HTTP exceptions."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.exceptions import DatabaseUnavailableException, MlflowUnavailableException


def _register_database_exception_handler(app: FastAPI) -> None:
    @app.exception_handler(DatabaseUnavailableException)
    async def handle_database_unavailable(
        request: Request,
        exc: DatabaseUnavailableException,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=503,
            content={"detail": "Database unavailable"},
        )


def _register_mlflow_exception_handler(app: FastAPI) -> None:
    @app.exception_handler(MlflowUnavailableException)
    async def handle_mlflow_unavailable(
        request: Request,
        exc: MlflowUnavailableException,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=503,
            content={"detail": "MLflow unavailable"},
        )

def register_exception_handlers(app: FastAPI) -> None:
    """Register application-wide exception handlers."""
    _register_database_exception_handler(app)
    _register_mlflow_exception_handler(app)
