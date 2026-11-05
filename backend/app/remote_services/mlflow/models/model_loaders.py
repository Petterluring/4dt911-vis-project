"""Module for loading MLflow models."""

from logging import getLogger

from mlflow.pyfunc import PyFuncModel, load_model

logger = getLogger(__name__)


def build_model_uri(model_name: str, version: int | str | None = None, alias: str | None = None) -> str:
    """Build an MLflow model registry URI from a version or an alias.

    Args:
        model_name: Name of the registered model.
        version: Model version number. Mutually exclusive with alias.
        alias: Model alias, e.g. "champion" or "challenger". Mutually exclusive with version.

    Returns:
        URI of the form ``models:/<name>/<version>`` or ``models:/<name>@<alias>``.

    Raises:
        ValueError: If the name is empty, or not exactly one of version and alias is given.

    """
    if not model_name:
        raise ValueError("model_name must not be empty.")
    if (version is None) == (alias is None):
        raise ValueError("Specify exactly one of 'version' or 'alias'.")
    if alias is not None:
        if not alias:
            raise ValueError("alias must not be empty.")
        return f"models:/{model_name}@{alias}"
    if not str(version).isdigit():
        raise ValueError(f"version must be a positive integer, got {version!r}.")
    return f"models:/{model_name}/{version}"


def load_registered_model(
    model_name: str,
    version: int | str | None = None,
    alias: str | None = None,
) -> PyFuncModel:
    """Load a registered MLflow model by version or alias.

    MLflow tracking must be configured beforehand (see ``config.load_config``).

    Args:
        model_name: Name of the registered model.
        version: Model version number, e.g. 3.
        alias: Model alias, e.g. "champion" or "challenger".

    Returns:
        The loaded model as a PyFuncModel.

    Raises:
        ValueError: If not exactly one of version and alias is given.

    """
    model_uri = build_model_uri(model_name, version=version, alias=alias)
    logger.info("Loading MLflow model from %s", model_uri)
    return load_model(model_uri)

