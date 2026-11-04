"""Queries for finding listings similar to a hypothetical listing."""

from typing import Any

from sqlalchemy import Float, Select, case, cast, func, literal, select, true
from sqlalchemy.ext.asyncio import AsyncConnection

from app.remote_services.postgres.tables import listings
from app.router.requests.listing_comparison import HypotheticalListingComparison

CATEGORICAL_COLUMNS = ("room_type", "district")
NUMERICAL_COLUMNS = ("accommodates", "bedrooms", "beds")


def build_listing_comparison(
    hypothetical_listing: HypotheticalListingComparison,
) -> Select[Any]:
    """Build a query returning the top ``top_n`` listings by distance."""
    values = hypothetical_listing.model_dump()
    distance = literal(0.0)

    # Compute the distance for categorical columns first.
    for column_name in CATEGORICAL_COLUMNS:
        value = values[column_name]
        if value is not None:
            distance += case(
                (listings.c[column_name] == value, 0.0),
                else_=1.0,
            )

    numerical_fields = [
        column_name
        for column_name in NUMERICAL_COLUMNS
        if values[column_name] is not None
    ]

    # Compute the IQR scales for numerical columns
    query = select(listings)
    if numerical_fields:
        numeric_scales = (
            select(
                *(
                    (
                        func.percentile_cont(0.75).within_group(listings.c[column_name]) -
                        func.percentile_cont(0.25).within_group(listings.c[column_name])
                    ).label(column_name)
                    for column_name in numerical_fields
                )
            )
            .subquery("numeric_scales")
        )
        squared_differences = []
        for column_name in numerical_fields:
            scale = case(
                (numeric_scales.c[column_name] == 0, 1.0),
                else_=numeric_scales.c[column_name],
            )
            difference = (
                cast(listings.c[column_name], Float) - values[column_name]
            ) / scale
            clipped_difference = func.coalesce(
                func.least(func.abs(difference), literal(2.0)),
                literal(2.0),
            )
            squared_differences.append(
                clipped_difference * clipped_difference
            )

        numeric_distance = func.sqrt(
            sum(squared_differences, literal(0.0))
        )
        distance += numeric_distance
        query = query.select_from(
            listings.join(numeric_scales, true())
        )
    else:
        query = query.select_from(listings)

    return (
        query.add_columns(distance.label("distance"))
        .order_by(distance, listings.c.id)
        .limit(hypothetical_listing.top_n)
    )


async def select_similar_listings(
    connection: AsyncConnection,
    hypothetical_listing: HypotheticalListingComparison,
) -> list[dict[str, Any]]:
    """Fetch the top similar listings, including their calculated distance."""
    result = await connection.execute(
        build_listing_comparison(hypothetical_listing)
    )
    return [dict(row) for row in result.mappings().all()]
