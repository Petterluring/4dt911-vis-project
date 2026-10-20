"""Request models for the Airbnb routes."""

from enum import StrEnum

from pydantic import BaseModel, Field, field_validator

from app.remote_services.postgres.tables.definitions import listings


class District(StrEnum):
    """Stockholm districts available in the listings table."""

    BROMMA = "Bromma"
    ENSKEDE_ARSTA_VANTOR = "Enskede-Årsta-Vantör"
    FARSTA = "Farsta"
    HAGERSTEN_ALVSJO = "Hägersten-Älvsjö"
    HASSELBY_VALLINGBY = "Hässelby-Vällingby"
    JARVA = "Järva"
    KUNGSHOLMEN = "Kungsholmen"
    NORRA_INNERSTADEN = "Norra innerstaden"
    SKARPNACK = "Skarpnäck"
    SKARHOLMEN = "Skärholmen"
    SODERMALM = "Södermalm"


class DistrictPriceStatsRequest(BaseModel):
    """Request body for price statistics per district."""

    districts: list[District] = Field(
        min_length=1,
        description="Districts to compute price statistics for.",
        default=[district for district in District],
    )

    @field_validator("districts")
    @classmethod
    def deduplicate(cls, value: list[District]) -> list[District]:
        """Remove duplicate districts while keeping order."""
        return list(dict.fromkeys(value))


class ListingsRequest(BaseModel):
    """Request body for selecting rows from the listings table."""

    columns: list[str] | None = Field(
        default=None,
        description="Columns to include. All columns are returned if omitted.",
    )
    limit: int | None = Field(default=100, ge=1, description="Max rows to return.")
    offset: int = Field(default=0, ge=0, description="Number of rows to skip.")

    @field_validator("columns")
    @classmethod
    def validate_columns(cls, value: list[str] | None) -> list[str] | None:
        """Ensure all requested columns exist in the listings table."""
        if value is None:
            return value
        unknown = set(value) - set(listings.c.keys())
        if unknown:
            raise ValueError(f"Unknown listings columns: {sorted(unknown)}")
        return list(dict.fromkeys(value))
