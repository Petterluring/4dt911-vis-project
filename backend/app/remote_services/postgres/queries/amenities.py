"""Queries for listing amenities."""

from typing import Any

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncConnection

from app.remote_services.postgres.tables import amenities


def build_amenities_query(listing_ids: list[int]) -> Select[Any]:
    """Build a query returning the amenities of the given listings.

    All rows are returned if ``listing_ids`` is empty.
    """
    query = select(amenities).order_by(amenities.c.listing_id, amenities.c.amenity)
    if listing_ids:
        query = query.where(amenities.c.listing_id.in_(listing_ids))
    return query


async def select_amenities(
    connection: AsyncConnection,
    listing_ids: list[int],
) -> list[dict[str, Any]]:
    """Fetch the amenities for one or more listing ids."""
    result = await connection.execute(build_amenities_query(listing_ids))
    return [dict(row) for row in result.mappings().all()]
