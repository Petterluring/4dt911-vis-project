
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
from app.router.requests.listing_comparison import HypotheticalListingComparisonRequest

CATEGORICAL_COLUMNS = ("room_type", "district")
NUMERICAL_COLUMNS = ("accommodates", "bedrooms", "beds")
CLIPPING_THRESHOLD = 3.0


def _build_categorical_similarity(
    column_name: str,
    value: Any,
) -> ColumnElement[float]:
    """Build categorical similarity (1 if equal, otherwise 0)."""
    return case(
        (listings.c[column_name] == value, 1.0),
        else_=0.0,
    )


def _build_iqr_scales(numerical_fields: list[str]) -> Subquery:
    """Build a one-row subquery with the IQR of each numerical column."""
    return select(
        *(
            (
                func.percentile_cont(0.75).within_group(
                    listings.c[column_name]
                )
                - func.percentile_cont(0.25).within_group(
                    listings.c[column_name]
                )
            ).label(column_name)
            for column_name in numerical_fields
        )
    ).subquery("numeric_scales")


def _build_numerical_similarity(
    column_name: str,
    value: Any,
    numeric_scales: Subquery,
) -> ColumnElement[float]:
    """Build IQR-scaled, clipped numerical similarity between 0 and 1.

    The similarity is defined as:

        1 - min(abs(x - y) / IQR, CLIPPING_THRESHOLD)
            / CLIPPING_THRESHOLD

    A similarity of 1 indicates equality, while 0 indicates that
    the normalized difference reaches the clipping threshold.

    Zero or NULL IQR values are replaced with 1.0.
    Missing listing values receive a similarity of 0.
    """
    scale = func.coalesce(
        func.nullif(numeric_scales.c[column_name], 0),
        literal(1.0),
    )

    difference = (
        func.abs(
            cast(listings.c[column_name], Float) - value
        )
        / scale
    )

    clipped_difference = func.coalesce(
        func.least(
            difference,
            literal(CLIPPING_THRESHOLD),
        ),
        literal(CLIPPING_THRESHOLD),
    )

    return literal(1.0) - clipped_difference / CLIPPING_THRESHOLD


def _build_jaccard_similarity(
    hypothetical_amenities: list[str],
) -> Subquery:
    """Build a subquery with the Jaccard similarity of each listing's amenities.

    Returns ``listing_id`` and ``jaccard_similarity`` for every listing,
    including listings without amenities.

    Jaccard similarity is defined as:

        |A ∩ B| / |A ∪ B|

    If both amenity sets are empty, the similarity is defined as 1.
    """
    query_amenities = set(hypothetical_amenities)

    listing_amenity = distinct(amenities.c.amenity)

    intersection = func.count(listing_amenity).filter(
        amenities.c.amenity.in_(query_amenities)
    )

    union = (
        len(query_amenities)
        + func.count(listing_amenity)
        - intersection
    )

    return (
        select(
            listings.c.id.label("listing_id"),
            case(
                (union == 0, 1.0),
                else_=(
                    cast(intersection, Float)
                    / cast(union, Float)
                ),
            ).label("jaccard_similarity"),
        )
        .select_from(
            listings.outerjoin(
                amenities,
                amenities.c.listing_id == listings.c.id,
            )
        )
        .group_by(listings.c.id)
        .subquery("jaccard_similarities")
    )


def build_listing_comparison(
    hypothetical_listing: HypotheticalListingComparisonRequest,
) -> Select[Any]:
    """Build a query returning the top ``top_n`` listings by similarity.

    Each specified feature contributes a similarity between 0 and 1.

    The overall similarity is the arithmetic mean of all active
    similarity components:

        similarity(x, y) = sum(s_k(x, y)) / n

    Unspecified features are excluded from the calculation.
    """
    values = hypothetical_listing.model_dump()

    similarities: list[ColumnElement[float]] = []

    if hypothetical_listing.columns is None:
        selected_columns = list(listings.c)
    else:
        selected_columns = [
            listings.c[name]
            for name in hypothetical_listing.columns
        ]

    source: FromClause = listings

    # Categorical similarities
    for column_name in CATEGORICAL_COLUMNS:
        value = values[column_name]

        if value is not None:
            similarities.append(
                _build_categorical_similarity(
                    column_name,
                    value,
                )
            )

    # Numerical similarities
    numerical_fields = [
        column_name
        for column_name in NUMERICAL_COLUMNS
        if values[column_name] is not None
    ]

    if numerical_fields:
        numeric_scales = _build_iqr_scales(numerical_fields)

        source = source.join(numeric_scales, true())

        for column_name in numerical_fields:
            similarities.append(
                _build_numerical_similarity(
                    column_name,
                    values[column_name],
                    numeric_scales,
                )
            )

    # Jaccard similarity
    if values["amenities"] is not None:
        jaccard = _build_jaccard_similarity(
            values["amenities"]
        )

        source = source.join(
            jaccard,
            jaccard.c.listing_id == listings.c.id,
        )

        similarities.append(
            jaccard.c.jaccard_similarity
        )

    if not similarities:
        raise ValueError(
            "At least one similarity feature must be specified."
        )

    # Calculate normalized average similarity
    similarity = (
        sum(similarities, literal(0.0))
        / len(similarities)
    )

    query = select(*selected_columns).select_from(source)

    return (
        query.add_columns(
            similarity.label("similarity")
        )
        .order_by(
            similarity.desc(),
            listings.c.id,
        )
        .limit(hypothetical_listing.top_n)
    )


async def select_similar_listings(
    connection: AsyncConnection,
    hypothetical_listing: HypotheticalListingComparisonRequest,
) -> list[dict[str, Any]]:
    """Fetch the top similar listings, including their similarity scores."""
    result = await connection.execute(
        build_listing_comparison(hypothetical_listing)
    )

    return [
        dict(row)
        for row in result.mappings().all()
    ]
