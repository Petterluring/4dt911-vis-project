"""Module for testing hello route."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

def test_hello_route():
    response = client.get("/hello")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello from FastAPI!"}

def test_hello_world_route():
    response = client.get("/hello_world")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello, world!"}



