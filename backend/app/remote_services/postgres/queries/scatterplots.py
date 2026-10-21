"""Module for scatterplots queries."""

from collections.abc import Sequence
from typing import Any

from sqlalchemy import Select, func, literal, select
from sqlalchemy.ext.asyncio import AsyncConnection

from app.remote_services.postgres.tables import apartment_sales, listings


def build_scatterplot_stats(districts: Sequence[str]) -> Select[Any]:
    """Build a query with the metrics required by both scatterplots."""
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
            func.count(listings.c.id).label("airbnb_listing_count"),
            func.avg(listings.c.price).label("average_airbnb_price"),
            func.percentile_cont(0.5)
            .within_group(listings.c.price)
            .label("median_airbnb_price"),
        )
        .where(listings.c.district.in_(districts))
        .group_by(listings.c.district)
        .subquery("airbnb")
    )
    district = func.coalesce(housing.c.district, airbnb.c.district)
    return (
        select(
            district.label("district"),
            literal(0).label("tourism_score"),
            func.coalesce(airbnb.c.airbnb_listing_count, 0).label(
                "airbnb_listing_count"
            ),
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


async def select_scatterplot_stats(
    connection: AsyncConnection,
    districts: Sequence[str],
) -> list[dict[str, Any]]:
    """Fetch metrics for both scatterplots, grouped by district."""
    result = await connection.execute(build_scatterplot_stats(districts))
    rows = result.mappings().all()
    return [
        {
            "scatterplot_1": [
                {
                    "district": row["district"],
                    "tourism_score": row["tourism_score"],
                    "airbnb_listing_count": row["airbnb_listing_count"],
                }
                for row in rows
            ]
        },
        {
            "scatterplot_2": [
                {
                    "district": row["district"],
                    "average_housing_price": row["average_housing_price"],
                    "median_housing_price": row["median_housing_price"],
                    "average_airbnb_price": row["average_airbnb_price"],
                    "median_airbnb_price": row["median_airbnb_price"],
                }
                for row in rows
            ]
        },
    ]
