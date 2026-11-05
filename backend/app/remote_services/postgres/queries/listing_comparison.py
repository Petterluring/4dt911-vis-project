"""Queries for finding listings similar to a hypothetical listing."""

from typing import Any

from sqlalchemy import (
    ColumnElement,
    Float,
    FromClause,
    Select,
    Subquery,
    case,
    cast,
    distinct,
    func,
    literal,
    select,
    true,
)
from sqlalchemy.ext.asyncio import AsyncConnection

from app.remote_services.postgres.tables import amenities, listings
from app.router.requests.listing_comparison import HypotheticalListingComparison

CATEGORICAL_COLUMNS = ("room_type", "district")
NUMERICAL_COLUMNS = ("accommodates", "bedrooms", "beds")


def _build_categorical_distance(values: dict[str, Any]) -> ColumnElement[float]:
    """Build the distance contribution of the categorical columns (0 if equal, else 1)."""
    distance: ColumnElement[float] = literal(0.0)
    for column_name in CATEGORICAL_COLUMNS:
        value = values[column_name]
        if value is not None:
            distance += case(
                (listings.c[column_name] == value, 0.0),
                else_=1.0,
            )
    return distance


def _build_iqr_scales(numerical_fields: list[str]) -> Subquery:
    """Build a one-row subquery with the interquartile range of each numerical column."""
    return select(
        *(
            (
                func.percentile_cont(0.75).within_group(listings.c[column_name]) -
                func.percentile_cont(0.25).within_group(listings.c[column_name])
            ).label(column_name)
            for column_name in numerical_fields
        )
    ).subquery("numeric_scales")


def _build_numerical_distance(
    values: dict[str, Any],
    numerical_fields: list[str],
    numeric_scales: Subquery,
) -> ColumnElement[float]:
    """Build the IQR-scaled, clipped Euclidean distance of the numerical columns."""
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
            func.least(func.abs(difference), literal(3.0)),
            literal(3.0),
        )
        squared_differences.append(clipped_difference * clipped_difference)
    return func.sqrt(sum(squared_differences, literal(0.0)))


def _build_jaccard_distance(hypothetical_amenities: list[str]) -> Subquery:
    """Build a subquery with the Jaccard distance of each listing's amenities.

    Returns ``listing_id`` and ``jaccard_distance`` for every listing, where
    listings without amenities are included. The distance is
    ``1 - |A ∩ B| / |A U B|``, or 0 if both amenity sets are empty.
    """
    query_amenities = set(hypothetical_amenities)
    listing_amenity = distinct(amenities.c.amenity)
    intersection = func.count(listing_amenity).filter(
        amenities.c.amenity.in_(query_amenities)
    )
    union = len(query_amenities) + func.count(listing_amenity) - intersection
    return (
        select(
            listings.c.id.label("listing_id"),
            case(
                (union == 0, 0.0),
                else_=1.0 - cast(intersection, Float) / cast(union, Float),
            ).label("jaccard_distance"),
        )
        .select_from(
            listings.outerjoin(amenities, amenities.c.listing_id == listings.c.id)
        )
        .group_by(listings.c.id)
        .subquery("jaccard_distances")
    )


def build_listing_comparison(
    hypothetical_listing: HypotheticalListingComparison,
) -> Select[Any]:
    """Build a query returning the top ``top_n`` listings by distance."""
    values = hypothetical_listing.model_dump()
    distance = _build_categorical_distance(values)

    numerical_fields = [
        column_name
        for column_name in NUMERICAL_COLUMNS
        if values[column_name] is not None
    ]

    if hypothetical_listing.columns is None:
        selected_columns = list(listings.c)
    else:
        selected_columns = [listings.c[name] for name in hypothetical_listing.columns]

    source: FromClause = listings
    if numerical_fields:
        numeric_scales = _build_iqr_scales(numerical_fields)
        distance += _build_numerical_distance(values, numerical_fields, numeric_scales)
        source = source.join(numeric_scales, true())

    if values["amenities"] is not None:
        jaccard = _build_jaccard_distance(values["amenities"])
        distance += jaccard.c.jaccard_distance
        source = source.join(jaccard, jaccard.c.listing_id == listings.c.id)

    query = select(*selected_columns).select_from(source)

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
