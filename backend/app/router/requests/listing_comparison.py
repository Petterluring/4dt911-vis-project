"""Module for defining hypothetical listing request data and validation."""


from pydantic import BaseModel, Field, field_validator, model_validator

from app.remote_services.postgres.tables import listings


class HypotheticalListingPrediction(BaseModel):
    """Class representing a hypothetical listing with optional fields.

    At least one field must be provided.
    """
    room_type: str | None = Field(None, description="Type of the room")
    accommodates: int | None = Field(None, ge=1, description="Number of people the listing accommodates")
    bedrooms: int | None = Field(None, ge=0, description="Number of bedrooms in the listing")
    beds: int | None = Field(None, ge=0, description="Number of beds in the listing")
    district: str | None = Field(None, description="District where the listing is located")
    amenities: list[str] | None = Field(None, description="List of amenities for the listing")

    @model_validator(mode="after")
    def at_least_one_field(self) -> "HypotheticalListingPrediction":
        """Ensure at least one field is not None."""
        if all(
            value is None for key, value in self.model_dump().items()
            if key in HypotheticalListingPrediction.__annotations__
            ):
            raise ValueError("At least one of room_type, accommodates," \
            " bedrooms, beds, district, or amenities must not be None")
        return self


class HypotheticalListingComparison(HypotheticalListingPrediction):
    """Class representing a hypothetical listing for comparison purposes."""
    top_n: int = Field(10, ge=1, description="Number of top similar listings to consider")
    columns: list[str] | None = Field(
        None,
        description="Columns of the listings table to include. None includes all columns",
    )

    @field_validator("columns")
    @classmethod
    def columns_exist(cls, value: list[str] | None) -> list[str] | None:
        """Ensure all requested columns exist in the listings table."""
        if value is not None:
            unknown = [name for name in value if name not in listings.c]
            if unknown:
                raise ValueError(f"Unknown listing columns: {', '.join(unknown)}")
        return value
