"""Module for listings request models."""
from pydantic import BaseModel, Field, field_validator

from app.remote_services.postgres.tables.definitions import listings


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
