"""Module for testing hello route."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.router import hello

app = FastAPI()
app.include_router(hello.router)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_hello_route(client: TestClient):
    response = client.get("/hello")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello from FastAPI!"}

def test_hello_world_route(client: TestClient):
    response = client.get("/hello-world")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello, world!"}



