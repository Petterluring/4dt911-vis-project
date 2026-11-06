"""Module for managing MLflow configuration."""

from logging import getLogger
from os import environ
from pathlib import Path

from app.remote_services.mlflow.users import MlFlowUser
from app.utils.path import validate_path
from mlflow import set_tracking_uri

from .constants import MLFLOW_CERT_FILE

logger = getLogger("uvicorn.error")


class MlflowConfig:
    """Configure MLflow through environment variables."""

    @staticmethod
    def set_tracking_and_credentials(user: MlFlowUser) -> None:
        """Set MLflow tracking URI and, if present, credentials as environment variables.

        Sets MLFLOW_TRACKING_URI always. MLFLOW_TRACKING_USERNAME and MLFLOW_TRACKING_PASSWORD are only set when
        the user has credentials; the mlflow client handles authentication from the environment.

        Args:
            user: MlFlowUser - The user holding the tracking host and optional credentials.

        """
        environ["MLFLOW_TRACKING_URI"] = user.host
        set_tracking_uri(user.host)
        logger.info(f"MLflow tracking URI set to {user.host}.")

        if user.username is not None and user.password is not None:
            environ["MLFLOW_TRACKING_USERNAME"] = user.username
            environ["MLFLOW_TRACKING_PASSWORD"] = user.password
            logger.info(f"MLflow tracking credentials set for user {user.username}.")
        else:
            # Avoid stale credentials from a previously configured user.
            environ.pop("MLFLOW_TRACKING_USERNAME", None)
            environ.pop("MLFLOW_TRACKING_PASSWORD", None)


    @staticmethod
    def set_certificate(certificate_path: str | Path = MLFLOW_CERT_FILE) -> None:
        """Set the server certificate path.

        Args:
            certificate_path: str | Path - Path to the certificate file for the MLflow tracking server.

        Raises:
            The validation error from validate_path if the certificate file is invalid.

        """
        certificate_path = validate_path(certificate_path, is_file=True)
        environ["MLFLOW_TRACKING_SERVER_CERT_PATH"] = str(certificate_path)

        logger.info("MLflow certificate path set.")

    @staticmethod
    def set_multipart_download(enabled: bool = False) -> None:
        """Enable or disable proxy multipart download.

        Args:
            enabled: bool - Whether to enable proxy multipart download in MLflow.

        """
        environ["MLFLOW_ENABLE_PROXY_MULTIPART_DOWNLOAD"] = "true" if enabled else "false"

        logger.info(f"MLflow proxy multipart download {'enabled' if enabled else 'disabled'}.")
