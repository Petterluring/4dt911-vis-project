"""Module for amenity routes."""

from typing import Any

from fastapi import APIRouter

from app.remote_services.postgres import ConnectionDep
from app.remote_services.postgres.queries.amenities import (
    select_amenities,
    select_unique_amenities,
)

from .requests.amenities import AmenitiesRequest

router = APIRouter(prefix="/amenities", tags=["amenities"])


@router.post("")
async def get_amenities(
    request: AmenitiesRequest,
    connection: ConnectionDep,
) -> list[dict[str, Any]]:
    """Return the amenities of the requested listings."""
    return await select_amenities(connection, request.listing_ids)



@router.get("/unique_values")
async def get_unique_amenities(connection: ConnectionDep) -> list[str]:
    """Return the unique amenity values."""
    return await select_unique_amenities(connection)



