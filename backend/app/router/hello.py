"""Module containing the hello world endpoint."""

from fastapi import APIRouter

router = APIRouter()

@router.get("/hello")
async def hello_from_fast_api() -> dict[str, str]:
    """Return a simple hello from FastAPI."""
    return {"message": "Hello from FastAPI!"}

@router.get("/hello_world")
async def hello_world() -> dict[str, str]:
    """Return a simple hello world message."""
    return {"message": "Hello, world!"}
