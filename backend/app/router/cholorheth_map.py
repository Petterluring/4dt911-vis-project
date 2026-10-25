"""Module for choropleth map routes."""

from typing import Any

from fastapi import APIRouter

from app.remote_services.postgres import ConnectionDep
from app.remote_services.postgres.queries.choropleth_map import (
    select_district_stats,
    select_listings,
    select_tooltip_statistics,
)
from app.router.requests.district import DistrictStatsRequest
from app.router.requests.listings import ListingsRequest

router = APIRouter(prefix="/choropleth-map", tags=["choropleth_map"])


@router.post("/district-stats")
async def get_district_stats(
    request: DistrictStatsRequest, connection: ConnectionDep
) -> list[dict[str, Any]]:
    """Average and median housing and Airbnb prices per requested district."""
    return await select_district_stats(
        connection, [district.value for district in request.districts]
    )

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


@router.post("/tooltip-statistics")
async def get_tooltip_statistics(
    request: DistrictStatsRequest, connection: ConnectionDep
) -> list[dict[str, Any]]:
    """Tooltip statistics per requested district."""
    return await select_tooltip_statistics(
        connection, [district.value for district in request.districts]
    )


