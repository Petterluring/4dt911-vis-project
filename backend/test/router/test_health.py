"""Tests for app.router.health."""

from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncConnection

from app.main import app
from app.remote_services.postgres.dependencies import get_connection

client = TestClient(app)


def test_fast_api_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


async def override_get_connection() -> AsyncGenerator[AsyncConnection, None]:
    connection = AsyncMock(spec=AsyncConnection)

    result = MagicMock()
    result.scalar.return_value = 1

    connection.execute.return_value = result

    yield connection


def test_health_db_success():
    app.dependency_overrides[get_connection] = override_get_connection

    try:
        with TestClient(app) as client:
            response = client.get("/health-db")

        assert response.status_code == 200
        assert response.json() == {
            "status": "healthy",
            "query": "SELECT 1",
            "query_result": "1",
        }
    finally:
        app.dependency_overrides.clear()
