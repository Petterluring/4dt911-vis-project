"""Shared subquery computing a normalized tourism score per district."""

from collections.abc import Sequence
from typing import Any

from sqlalchemy import (
    Float,
    Subquery,
    Text,
    case,
    cast,
    column,
    func,
    literal,
    select,
    values,
)

from app.remote_services.postgres.tables import tourism_attractions


def build_tourism_score_subquery(
    districts: Sequence[str],
) -> Subquery[Any]:
    """Build a subquery (district, tourism_score) with scores in [0, 1].

    Raw score = number of attractions, min-max normalized across the given
    districts (category weights are not applied yet).
    Districts without attractions get 0; if all raw scores are equal the
    score is 0 for every district.
    """
    district_values = (
        values(column("district", Text), name="requested_districts")
        .data([(name,) for name in dict.fromkeys(districts)])
        .alias("requested_districts")
    )
    raw = (
        select(
            district_values.c.district.label("district"),
            cast(func.count(tourism_attractions.c.osm_id), Float).label(
                "raw_score"
            ),
        )
        .select_from(district_values)
        .outerjoin(
            tourism_attractions,
            tourism_attractions.c.district == district_values.c.district,
        )
        .group_by(district_values.c.district)
        .subquery("raw_tourism")
    )
    min_raw = func.min(raw.c.raw_score).over()
    max_raw = func.max(raw.c.raw_score).over()
    score = case(
        (max_raw == min_raw, literal(0.0)),
        else_=(raw.c.raw_score - min_raw) / (max_raw - min_raw),
    )
    return select(
        raw.c.district.label("district"),
        cast(score, Float).label("tourism_score"),
    ).subquery("tourism_score")
