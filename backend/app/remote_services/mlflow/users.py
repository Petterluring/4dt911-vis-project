"""Module defining MLflow user models and loading from YAML configuration."""
from enum import Enum
from pathlib import Path
from typing import Self

from pydantic import BaseModel, Field, model_validator

from app.utils.path import load_yaml_file

from .constants import MLFLOW_RESOURCES


class MlFlowUser(BaseModel):
    """Model representing an MLflow user."""

    host: str = Field(..., description="The host URI for the MLflow tracking server.")
    username: str | None = Field(None, description="The username for MLflow tracking server authentication.")
    password: str | None = Field(None, description="The password for MLflow tracking server authentication.")

    @model_validator(mode="after")
    def validate_credentials_set_together(self) -> Self:
        """Ensure username and password are either both set or both None."""
        if (self.username is None) != (self.password is None):
            raise ValueError("username and password must either both be set or both be None.")
        return self


class MlFlowUsers(Enum):
    """Enum representing MLflow users with their corresponding YAML configuration files."""

    MLFLOW_USER = MLFLOW_RESOURCES / "mlflow_user.yaml"

    def __init__(self, yaml_path: Path):
        self.yaml_path = yaml_path

    def load_user(self) -> MlFlowUser:
        """Load the MLflow user configuration from the YAML file and return an MlFlowUser instance."""
        data = load_yaml_file(self.yaml_path)
        return MlFlowUser.model_validate(data)

