"""Tests for app.utils.path.files."""

import os
from pathlib import Path

import pytest

from app.utils.path.files import load_env_file, load_yaml_file


def test_load_env_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("TEST_FILES_VAR", raising=False)
    env_file = tmp_path / "test.env"
    env_file.write_text("TEST_FILES_VAR=hello\n", encoding="utf-8")

    load_env_file(env_file)

    assert os.environ["TEST_FILES_VAR"] == "hello"


def test_load_env_file_str_path(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.delenv("TEST_FILES_VAR2", raising=False)
    env_file = tmp_path / "test.env"
    env_file.write_text("TEST_FILES_VAR2=world\n", encoding="utf-8")

    load_env_file(str(env_file))

    assert os.environ["TEST_FILES_VAR2"] == "world"


def test_load_yaml_file(tmp_path: Path):
    yaml_file = tmp_path / "config.yaml"
    yaml_file.write_text("name: demo\nport: 5432\nitems:\n  - a\n  - b\n", encoding="utf-8")

    assert load_yaml_file(yaml_file) == {"name": "demo", "port": 5432, "items": ["a", "b"]}


def test_load_yaml_file_str_path(tmp_path: Path):
    yaml_file = tmp_path / "config.yaml"
    yaml_file.write_text("key: value\n", encoding="utf-8")

    assert load_yaml_file(str(yaml_file)) == {"key": "value"}
