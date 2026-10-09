"""Module for handling file paths."""

from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from yaml import safe_load

from .validation import validate_path, validate_suffix


def load_env_file(path: str | Path) -> None:
    """Load environment variables from a .env file."""
    path = validate_path(path, is_file=True)
    path = validate_suffix(path, ".env")
    load_dotenv(dotenv_path=path)


def load_yaml_file(path: str | Path) -> dict[str, Any]:
    """Load a YAML file and return its contents as a dictionary."""
    path = validate_path(path)
    path = validate_suffix(path, ".yaml")
    with open(path, "r", encoding="utf-8") as file:
        dct = safe_load(file)
        if not isinstance(dct, dict):
            raise ValueError(f"YAML file does not contain a dictionary: {path}")
        return dct
