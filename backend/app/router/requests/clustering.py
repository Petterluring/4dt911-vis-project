"""Module for clustering request models."""

from pydantic import BaseModel, Field, field_validator

LEGAL_FEATURES = ["room_type", "accommodates", "bedrooms", "bathrooms", "beds"]

class ClusteringRequest(BaseModel):
    """Class representing a clustering request."""
    features: list[str] = Field(..., examples=[LEGAL_FEATURES], description="List of features for clustering")
    n_clusters: int = Field(..., examples=[2, 3, 4], ge=2, description="Number of clusters for clustering")

    @field_validator("features")
    @classmethod
    def validate_features(cls, v: list[str]) -> list[str]:
        """Validate that all features are legal."""
        features_cleaned = [feature.strip() for feature in v]  # Remove leading/trailing whitespace
        unique_features = list(dict.fromkeys(features_cleaned))  # Remove duplicates while preserving order
        if not all(feature in LEGAL_FEATURES for feature in unique_features) or not unique_features:
            raise ValueError(f"All features must be one of {LEGAL_FEATURES} and must not be empty")
        return unique_features

    def hash(self) -> str:
        """Generate a hash for the clustering request based on its features and number of clusters."""
        features_str = ",".join(sorted(self.features))
        return f"{features_str}|{self.n_clusters}"
