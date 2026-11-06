"""Module containing the hello world endpoint."""

from fastapi import APIRouter

from app.remote_services.mlflow.dependencies import ModelRegistryDep
from app.router.requests.models import DemoModelRequest

router = APIRouter()


@router.get("/hello")
async def hello_from_fast_api() -> dict[str, str]:
    """Return a simple hello from FastAPI."""
    return {"message": "Hello from FastAPI!"}


@router.get("/hello-world")
async def hello_world() -> dict[str, str]:
    """Return a simple hello world message."""
    return {"message": "Hello, world!"}

@router.post("/hello-demo-model")
async def hello_demo_model(
    request: DemoModelRequest,
    model_registry: ModelRegistryDep
) -> dict[str, str]:
    """Return a simple hello demo model message."""
    demo_model = model_registry.demo_model
    values_df = request.to_dataframe()
    prediction = demo_model.predict(values_df)
    return {
        "message": "Hello from demo model!",
        "prediction": str(prediction)
    }
