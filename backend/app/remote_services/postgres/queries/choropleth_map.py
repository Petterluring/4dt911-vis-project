"""Queries for the choropleth map."""

from collections.abc import Sequence
from typing import Any

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncConnection

from app.remote_services.postgres.queries.tourism_score import (
    build_tourism_score_subquery,
)
from app.remote_services.postgres.tables import (
    apartment_sales,
    listings,
    tourism_attractions,
)


# We keep the name abstracted from the specific query function as more queries might be added later.
def build_district_stats(
    districts: Sequence[str],
) -> Select[Any]:
    """Build a query with housing and Airbnb average/median price per district."""
    housing = (
        select(
            apartment_sales.c.District.label("district"),
            func.avg(apartment_sales.c.Selling_price).label(
                "average_housing_price"
            ),
            func.percentile_cont(0.5)
            .within_group(apartment_sales.c.Selling_price)
            .label("median_housing_price"),
        )
        .where(apartment_sales.c.District.in_(districts))
        .group_by(apartment_sales.c.District)
        .subquery("housing")
    )
    airbnb = (
        select(
            listings.c.district.label("district"),
            func.avg(listings.c.price).label("average_airbnb_price"),
            func.percentile_cont(0.5)
            .within_group(listings.c.price)
            .label("median_airbnb_price"),
        )
        .where(listings.c.district.in_(districts))
        .group_by(listings.c.district)
        .subquery("airbnb")
    )
    # Full join keeps districts present in only one of the two datasets.
    district = func.coalesce(housing.c.district, airbnb.c.district)
    return (
        select(
            district.label("district"),
            housing.c.average_housing_price,
            housing.c.median_housing_price,
            airbnb.c.average_airbnb_price,
            airbnb.c.median_airbnb_price,
        )
        .select_from(
            housing.join(
                airbnb, housing.c.district == airbnb.c.district, full=True
            )
        )
        .order_by(district)
    )


# We keep the name abstracted from the specific query function as more queries might be added later.
async def select_district_stats(
    connection: AsyncConnection,
    districts: Sequence[str],
) -> list[dict[str, Any]]:
    """Fetch housing and Airbnb price stats for each given district."""
    result = await connection.execute(
        build_district_stats(districts)
    )
    return [dict(row) for row in result.mappings().all()]


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




def build_tooltip_statistics(districts: Sequence[str]) -> Select[Any]:
    """Build a query with tooltip statistics per district."""
    housing = (
        select(
            apartment_sales.c.District.label("district"),
            func.avg(
                apartment_sales.c.Selling_price
                / func.nullif(apartment_sales.c.Livingspace_m2, 0)
            ).label("average_housing_price_per_m2"),
        )
        .where(apartment_sales.c.District.in_(districts))
        .group_by(apartment_sales.c.District)
        .subquery("housing")
    )
    airbnb = (
        select(
            listings.c.district.label("district"),
            func.percentile_cont(0.5)
            .within_group(listings.c.price)
            .label("median_airbnb_price"),
            func.count(listings.c.id).label("airbnb_listing_count"),
            func.avg(listings.c.review_scores_rating).label(
                "average_airbnb_rating"
            ),
        )
        .where(listings.c.district.in_(districts))
        .group_by(listings.c.district)
        .subquery("airbnb")
    )
    attractions = (
        select(
            tourism_attractions.c.stadsdelsomrade.label("district"),
            func.count().label("tourist_attractions"),
        )
        .where(tourism_attractions.c.stadsdelsomrade.in_(districts))
        .group_by(tourism_attractions.c.stadsdelsomrade)
        .subquery("attractions")
    )
    tourism = build_tourism_score_subquery(districts)
    district = func.coalesce(
        housing.c.district,
        airbnb.c.district,
        attractions.c.district,
        tourism.c.district,
    )
    return (
        select(
            district.label("district"),
            housing.c.average_housing_price_per_m2,
            airbnb.c.median_airbnb_price,
            airbnb.c.airbnb_listing_count,
            func.coalesce(tourism.c.tourism_score, 0.0).label(
                "tourism_score"
            ),
            attractions.c.tourist_attractions,
            airbnb.c.average_airbnb_rating,
        )
        .select_from(housing)
        .outerjoin(airbnb, housing.c.district == airbnb.c.district, full=True)
        .outerjoin(
            attractions,
            func.coalesce(housing.c.district, airbnb.c.district)
            == attractions.c.district,
            full=True,
        )
        .outerjoin(
            tourism,
            func.coalesce(
                housing.c.district,
                airbnb.c.district,
                attractions.c.district,
            )
            == tourism.c.district,
            full=True,
        )
        .order_by(district)
    )


async def select_tooltip_statistics(
    connection: AsyncConnection,
    districts: Sequence[str],
) -> list[dict[str, Any]]:
    """Fetch tooltip statistics for each given district."""
    result = await connection.execute(build_tooltip_statistics(districts))
    return [dict(row) for row in result.mappings().all()]


