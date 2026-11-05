"""Constants for MLflow configuration."""

from pathlib import Path

# Default paths for MLflow related files.
# If all project members use the same paths, we can avoid hardcoding them in multiple
# places.
MLFLOW_RESOURCES = Path().home() / "4dt911-resources" / "mlflow"
MLFLOW_CERT_FILE = MLFLOW_RESOURCES / "SSL_certificate.crt"
