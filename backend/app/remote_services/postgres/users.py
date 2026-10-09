"""Module for managing PostgreSQL users and their configurations."""

from enum import Enum
from pathlib import Path

from pydantic import BaseModel

from app.utils.path import load_yaml_file

POSTGRE_USERS = Path().home() / "4dt911-resources" / "postgresql" / "users"

class DBUser(BaseModel):
    """Model representing a PostgreSQL user."""
    username: str
    password: str
    host: str
    port: int
    database: str


class Users(Enum):
    """Enum representing PostgreSQL users with their corresponding YAML configuration files."""
    DEMO = POSTGRE_USERS / "demo_user.yaml"

    def __init__(self, yaml_path: Path):
        self.yaml_path = yaml_path

    def load_user(self) -> DBUser:
        """Load the PostgreSQL user configuration from the YAML file and return a DBUser instance."""
        data = load_yaml_file(self.yaml_path)
        return DBUser.model_validate(data)
