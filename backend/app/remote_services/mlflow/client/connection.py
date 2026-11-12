"""Module for MLflow client connection functionality."""

from logging import getLogger

from requests.exceptions import RequestException

from app.exceptions import MlflowUnavailableException
from mlflow import MlflowClient
from mlflow.exceptions import MlflowException

logger = getLogger("uvicorn.error")


def check_connection(client: MlflowClient) -> int:
    """Check MLflow connectivity and return the number of experiments retrieved."""
    try:
        return len(client.search_experiments(max_results=1))
    except (MlflowException, RequestException) as exc:
        msg = f"MLflow connection error: {exc}"
        logger.error(msg)
        raise MlflowUnavailableException(msg) from exc
