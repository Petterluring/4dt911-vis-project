"""Module for Airbnb routes."""

from typing import Any

from fastapi import APIRouter

from app.remote_services.postgres import ConnectionDep
from app.remote_services.postgres.queries.listings import (
    select_district_price_stats,
    select_listings,
)
from app.router.requests.airbnb import DistrictPriceStatsRequest, ListingsRequest

router = APIRouter(prefix="/airbnb", tags=["airbnb"])


@router.post("/listings")
async def get_listings(
    request: ListingsRequest, connection: ConnectionDep
) -> list[dict[str, Any]]:
    """Fetch rows from the listings table."""
    return await select_listings(
        connection,
        columns=request.columns,
        limit=request.limit,
        offset=request.offset,
    )


@router.post("/listings/price-stats")
async def get_district_price_stats(
    request: DistrictPriceStatsRequest, connection: ConnectionDep
) -> list[dict[str, Any]]:
    """Compute average and median listing price per requested district."""
    return await select_district_price_stats(
        connection, [district.value for district in request.districts]
    )
