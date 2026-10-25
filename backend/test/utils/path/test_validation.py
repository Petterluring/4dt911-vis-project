"""Tests for app.utils.path.validation."""

from pathlib import Path

import pytest

from app.utils.path.validation import validate_path, validate_suffix


def test_validate_path_existing_file(tmp_path: Path):
    file = tmp_path / "a.txt"
    file.write_text("x")
    assert validate_path(file) == file
    assert validate_path(str(file)) == file


def test_validate_path_existing_directory(tmp_path: Path):
    assert validate_path(tmp_path, is_file=False) == tmp_path
    assert validate_path(str(tmp_path), is_file=False) == tmp_path


def test_validate_path_returns_path_for_str(tmp_path: Path):
    assert isinstance(validate_path(str(tmp_path), is_file=False), Path)


@pytest.mark.parametrize("is_file", [True, False])
def test_validate_path_missing(tmp_path: Path, is_file: bool):
    with pytest.raises(FileNotFoundError, match="Path does not exist"):
        validate_path(tmp_path / "missing", is_file=is_file)


def test_validate_path_directory_when_file_expected(tmp_path: Path):
    with pytest.raises(ValueError, match="not a file"):
        validate_path(tmp_path, is_file=True)


def test_validate_path_file_when_directory_expected(tmp_path: Path):
    file = tmp_path / "a.txt"
    file.write_text("x")
    with pytest.raises(ValueError, match="not a directory"):
        validate_path(file, is_file=False)


def test_validate_suffix_matches():
    assert validate_suffix(Path("a.yaml"), ".yaml") == Path("a.yaml")
    assert validate_suffix("a.yaml", ".yaml") == Path("a.yaml")


def test_validate_suffix_returns_path_for_str():
    assert isinstance(validate_suffix("a.env", ".env"), Path)


@pytest.mark.parametrize("name", ["a.yml", "a", "a.yaml.bak"])
def test_validate_suffix_mismatch(name: str):
    with pytest.raises(ValueError, match="required suffix '.yaml'"):
        validate_suffix(name, ".yaml")
