"""Module for managing MLflow configuration."""

from logging import getLogger
from os import environ, getenv
from pathlib import Path

from app.utils.path import load_env_file, validate_path
from mlflow import set_tracking_uri

logger = getLogger(__name__)

# Default paths for MLflow related files.
# If all project members use the same paths, we can avoid hardcoding them in multiple
# places.
MLFLOW_RESOURCES = Path().home() / "4dt911-resources" / "mlflow"
MLFLOW_ENV_FILE = MLFLOW_RESOURCES / "config.env"
MLFLOW_CERT_FILE = MLFLOW_RESOURCES / "SSL_certificate.crt"


def set_tracking_and_credentials_from_env() -> None:
    """Set MLflow tracking URI and credentials from environment variables.

    Expected environment variables in .env file:
        - MLFLOW_TRACKING_URI: The URI for the MLflow tracking server.
        - MLFLOW_TRACKING_USERNAME: The username for MLflow tracking server authentication.
        - MLFLOW_TRACKING_PASSWORD: The password for MLflow tracking server authentication.
        - MLFLOW_ENABLE_PROXY_MULTIPART_DOWNLOAD: Whether to enable proxy multipart download in MLflow.
    """
    tracking_uri = getenv("MLFLOW_TRACKING_URI")
    username = getenv("MLFLOW_TRACKING_USERNAME")
    password = getenv("MLFLOW_TRACKING_PASSWORD")
    enable_proxy_multipart_download = getenv("MLFLOW_ENABLE_PROXY_MULTIPART_DOWNLOAD")

    if not tracking_uri:
        raise ValueError("MLFLOW_TRACKING_URI environment variable is not set.")

    # Username and password does not need to be set explicitly. We only need to check that they exist in the
    # environment variables and mlflow client will handle the authentication automatically.
    if not (username and password):
        raise ValueError(
            "MLFLOW_TRACKING_USERNAME and " + "MLFLOW_TRACKING_PASSWORD environment " + "variables are not set."
        )

    # Similar to username and password, we check that the environment variable for proxy multipart download is set.
    # Configuration is managed automatically by the mlflow client.
    if enable_proxy_multipart_download is None:
        raise ValueError("MLFLOW_ENABLE_PROXY_MULTIPART_DOWNLOAD environment variable is not set.")

    set_tracking_uri(tracking_uri)

    logger.info("MLflow tracking and credentials set from environment variables.")


def load_config(
    env_path: str | Path = MLFLOW_ENV_FILE,
    certificate_path: str | Path = MLFLOW_CERT_FILE,
    set_tracking_and_credentials: bool = True,
) -> None:
    """Load MLflow configuration.

    Args:
        env_path: str | Path - Path to the .env file containing MLflow configuration.
        certificate_path: str | Path - Path to the certificate file for MLflow tracking.
        set_tracking_and_credentials: bool -  If True, set MLflow tracking URI and credentials from environment
                                              variables after loading the .env file.

    Expected environment variables in .env file:
            - MLFLOW_TRACKING_URI: The URI for the MLflow tracking server.
            - MLFLOW_TRACKING_USERNAME: The username for MLflow tracking server authentication.
            - MLFLOW_TRACKING_PASSWORD: The password for MLflow tracking server authentication.
            - MLFLOW_ENABLE_PROXY_MULTIPART_DOWNLOAD: Whether to enable proxy multipart download in MLflow.

    """
    certificate_path = validate_path(certificate_path, is_file=True)
    environ["MLFLOW_TRACKING_SERVER_CERT_PATH"] = str(certificate_path)
    load_env_file(env_path)
    if set_tracking_and_credentials:
        set_tracking_and_credentials_from_env()

    logger.info("MLFlow .env file loaded successfully.")
