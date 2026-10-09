"""Module for validating paths."""

from pathlib import Path


def validate_path(path: str | Path, is_file: bool = True) -> Path:
    """Validate if path points to a file or directory based on is_file flag."""
    if isinstance(path, str):
        path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Path does not exist: {path}")
    if is_file and not path.is_file():
        raise ValueError(f"Path is not a file: {path}")
    if not is_file and not path.is_dir():
        raise ValueError(f"Path is not a directory: {path}")
    return path


def validate_suffix(path: str | Path, suffix: str) -> Path:
    """Validate if a file has the specified suffix."""
    if isinstance(path, str):
        path = Path(path)
    if path.suffix != suffix:
        raise ValueError(f"File does not have the required suffix '{suffix}': {path}")
    return path
