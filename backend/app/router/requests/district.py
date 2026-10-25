"""Request models for the district related statistics."""

from enum import StrEnum

from pydantic import BaseModel, Field, field_validator


class District(StrEnum):
    """Available Stockholm districts."""

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


class DistrictStatsRequest(BaseModel):
    """Request body for price statistics per district."""

    districts: list[District] = Field(
        min_length=1,
        description="Request body for statistics per district",
        default=[district for district in District],
    )

    @field_validator("districts")
    @classmethod
    def deduplicate(cls, value: list[District]) -> list[District]:
        """Remove duplicate districts while keeping order."""
        return list(dict.fromkeys(value))


