"""Module for MLflow dependencies."""

from typing import Annotated, cast

from fastapi import Depends, Request

from mlflow import MlflowClient

from .model.model_registry import ModelRegistry


def get_mlflow_client(request: Request) -> MlflowClient:
    """Retrieve the MLflow client from application state."""
    return cast(MlflowClient, request.app.state.mlflow_client)


def get_model_registry(request: Request) -> ModelRegistry:
    """Retrieve the model registry from application state."""
    return cast(ModelRegistry, request.app.state.model_registry)


MlflowClientDep = Annotated[MlflowClient, Depends(get_mlflow_client)]

ModelRegistryDep = Annotated[ModelRegistry, Depends(get_model_registry)]
