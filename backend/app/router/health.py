"""Module for health check routes."""

from logging import getLogger

from fastapi import APIRouter, HTTPException
from mlflow.exceptions import MlflowException
from requests.exceptions import RequestException
from sqlalchemy import text

from app.remote_services.mlflow.dependencies import MlflowClientDep
from app.remote_services.postgres import ConnectionDep

logger = getLogger(__name__)

router = APIRouter()

@router.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "healthy"}

@router.get("/health-db")
async def health_check_db(connection: ConnectionDep) -> dict[str, str]:
    """Health check endpoint that verifies database connectivity."""
    query = "SELECT 1"
    result = await connection.execute(text(query))
    return {
        "status": "healthy",
        "query": query,
        "query_result": str(result.scalar())
    }

@router.get("/health-mlflow")
def health_check_mlflow(client: MlflowClientDep) -> dict[str, str | int]:
    """Health check endpoint that verifies MLflow connectivity and authentication."""
    try:
        # Plain def: FastAPI runs this in a worker thread, so the blocking call doesn't stall the event loop.
        experiments = client.search_experiments(max_results=1)
    except (MlflowException, RequestException) as exc:
        logger.error(f"MLflow connection error: {exc}")
        raise HTTPException(status_code=503, detail="MLflow unavailable") from exc
    return {
        "status": "healthy",
        "tracking_uri": client.tracking_uri,
        "experiments_returned": len(experiments),
    }
