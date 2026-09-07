"""Module containing the hello world endpoint."""

from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def hello_world() -> dict[str, str]:
    """Return a simple hello world message."""
    return {"message": "Hello, world!"}
