"""Tests for app.remote_services.postgres.db_engine_factory."""

from unittest.mock import patch

import pytest

from app.remote_services.postgres import db_engine_factory
from app.remote_services.postgres.db_engine_factory import (
    create_async_postgres_engine,
    create_postgres_engine,
)
from app.remote_services.postgres.users import DBUser

EXPECTED_URL = "postgresql+psycopg://alice:secret@db.example.com:5433/mydb"


@pytest.fixture
def user() -> DBUser:
    return DBUser(
        username="alice",
        password="secret",
        host="db.example.com",
        port=5433,
        database="mydb",
    )


def test_create_postgres_engine_url_and_default_kwargs(user: DBUser):
    with patch.object(db_engine_factory, "create_engine") as mock_create:
        engine = create_postgres_engine(user)

        mock_create.assert_called_once_with(EXPECTED_URL)
        assert engine is mock_create.return_value


def test_create_postgres_engine_passes_kwargs(user: DBUser):
    with patch.object(db_engine_factory, "create_engine") as mock_create:
        create_postgres_engine(user, {"pool_size": 3, "echo": True})

    mock_create.assert_called_once_with(EXPECTED_URL, pool_size=3, echo=True)


def test_create_async_postgres_engine_url_and_default_kwargs(user: DBUser):
    with patch.object(db_engine_factory, "create_async_engine") as mock_create:
        engine = create_async_postgres_engine(user)

    mock_create.assert_called_once_with(EXPECTED_URL)
    assert engine is mock_create.return_value


def test_create_async_postgres_engine_passes_kwargs(user: DBUser):
    with patch.object(db_engine_factory, "create_async_engine") as mock_create:
        create_async_postgres_engine(user, {"pool_size": 3, "echo": True})

    mock_create.assert_called_once_with(EXPECTED_URL, pool_size=3, echo=True)
