"""Module for handling listing comparisons and predictions."""

from typing import Any

from fastapi import APIRouter

from app.remote_services.postgres import ConnectionDep
from app.remote_services.postgres.queries.listing_comparison import select_similar_listings

from .requests.listing_comparison import HypotheticalListingComparison

router = APIRouter(prefix="/listing-comparisons", tags=["listing-comparisons"])


@router.post("/compare")
async def compare_listings(
    request: HypotheticalListingComparison,
    connection: ConnectionDep,
) -> list[dict[str, Any]]:
    """Return a comparison of the hypothetical listing with similar listings."""
    return await select_similar_listings(connection, request)
