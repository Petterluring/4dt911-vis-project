"""Module containing request bodies for model inference."""


from pandas import DataFrame
from pydantic import BaseModel, Field


class DemoModelRequest(BaseModel):
    """Request body for the demo model."""
    feature: list[float] = Field(
        ...,
        min_length=1,
        examples=[[1, 2]],
        description="List of feature values for the demo model.",
    )


    def to_dataframe(self) -> DataFrame:
        """Convert the request body to a pandas DataFrame."""
        return DataFrame({"feature": self.feature})
