"""Main entrypoint for the backend FastAPI application."""

from fastapi import FastAPI

from app.router import hello

app = FastAPI(title="4DT911 Visualization Backend")

app.include_router(hello.router)