"""Queries for the listings table."""

from collections.abc import Sequence
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncConnection

from app.remote_services.postgres.tables import listings


def build_select_listings(
    columns: Sequence[str] | None = None,
    limit: int | None = 100,
    offset: int = 0,
) -> Select[Any]:
    """Build a SELECT on listings, optionally restricted to given columns."""
    if columns:
        unknown = set(columns) - set(listings.c.keys())
        if unknown:
            raise ValueError(f"Unknown listings columns: {sorted(unknown)}")
        stmt = select(*(listings.c[name] for name in columns))
    else:
        stmt = select(listings)
    return stmt.order_by(listings.c.id).limit(limit).offset(offset)


async def select_listings(
    connection: AsyncConnection,
    columns: Sequence[str] | None = None,
    limit: int | None = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """Fetch rows from listings as dictionaries."""
    result = await connection.execute(
        build_select_listings(columns, limit, offset)
    )
    return [dict(row) for row in result.mappings().all()]


def build_district_price_stats(districts: Sequence[str]) -> Select[Any]:
    """Build a query computing average and median price per district."""
    return (
        select(
            listings.c.district,
            func.avg(listings.c.price).label("average_price"),
            func.percentile_cont(0.5)
            .within_group(listings.c.price)
            .label("median_price"),
        )
        .where(listings.c.district.in_(districts))
        .group_by(listings.c.district)
        .order_by(listings.c.district)
    )


async def select_district_price_stats(
    connection: AsyncConnection,
    districts: Sequence[str],
) -> list[dict[str, Any]]:
    """Fetch average and median price for each given district."""
    result = await connection.execute(build_district_price_stats(districts))
    return [dict(row) for row in result.mappings().all()]
