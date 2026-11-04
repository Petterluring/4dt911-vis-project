"""Module for defining amenity request data and validation."""

from pydantic import BaseModel, Field


class AmenitiesRequest(BaseModel):
    """Class representing a request for the amenities of one or more listings."""
    listing_ids: list[int] = Field(
        default_factory=list,
        description="One or more listing ids. No listing ids means that all amenities are returned",
    )
