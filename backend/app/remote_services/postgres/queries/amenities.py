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


def build_unique_amenities_query() -> Select[Any]:
    """Build a query returning the distinct amenity values."""
    return (
        select(amenities.c.amenity)
        .where(amenities.c.amenity.is_not(None))
        .distinct()
        .order_by(amenities.c.amenity)
    )


async def select_unique_amenities(connection: AsyncConnection) -> list[str]:
    """Fetch the unique amenity values."""
    result = await connection.execute(build_unique_amenities_query())
    return list(result.scalars().all())


async def select_amenities(
    connection: AsyncConnection,
    listing_ids: list[int],
) -> list[dict[str, Any]]:
    """Fetch the amenities for one or more listing ids."""
    result = await connection.execute(build_amenities_query(listing_ids))
    return [dict(row) for row in result.mappings().all()]
