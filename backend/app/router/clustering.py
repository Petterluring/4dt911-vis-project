"""Module for clustering-related routes."""

from typing import Any

from fastapi import APIRouter

from app.router.requests.clustering import ClusteringRequest

router = APIRouter(prefix="/clustering", tags=["clustering"])


@router.post("/perform")
async def perform_clustering(
    request: ClusteringRequest
    ) -> dict[str, Any]:
    """Perform clustering upon request."""
    return {"message": "Not implemented."}
