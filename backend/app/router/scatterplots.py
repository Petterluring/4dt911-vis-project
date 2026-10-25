"""Module for scatterplot routes."""

from typing import Any

from fastapi import APIRouter

from app.remote_services.postgres import ConnectionDep
from app.remote_services.postgres.queries.scatterplots import (
    select_scatterplot_stats,
)
from app.router.requests.district import DistrictStatsRequest

router = APIRouter(prefix="/scatterplots", tags=["scatterplots"])


@router.post("/district-stats")
async def get_scatterplot_stats(
    request: DistrictStatsRequest, connection: ConnectionDep
) -> list[dict[str, Any]]:
    """Return the metrics for both scatterplots per requested district."""
    return await select_scatterplot_stats(
        connection, [district.value for district in request.districts]
    )
