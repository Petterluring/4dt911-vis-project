"""Module for health check routes."""

from fastapi import APIRouter
from sqlalchemy import text

from app.remote_services.postgres import ConnectionDep

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
