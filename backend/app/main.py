"""Main entrypoint for the backend FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.exception_handling import register_exception_handlers
from app.router import health, hello

app = FastAPI(title="4DT911 Visualization Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)
app.include_router(hello.router)
app.include_router(health.router)

