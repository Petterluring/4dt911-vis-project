"""Module defining a registry of the MLflow models used by the application."""

from logging import getLogger
from threading import Lock

from mlflow.pyfunc import PyFuncModel

from .model_loading import load_registered_model

logger = getLogger(__name__)

DEMO_MODEL_NAME = "demo_model"
DEFAULT_ALIAS = "champion"


class ModelRegistry:
    """Registry giving attribute access to the MLflow models the application uses.

    Each model is an attribute (e.g. ``registry.demo_model``) that is loaded on first access and then cached.
    Loading is blocking, so call it from a plain ``def`` route or through ``asyncio.to_thread``, or call
    ``load_all`` at startup. MLflow tracking must be configured beforehand (see MlflowConfig).

    To add a model, add a name constant and a property that calls ``get``.
    """

    def __init__(self, default_alias: str = DEFAULT_ALIAS) -> None:
        """Create a registry.

        Args:
            default_alias: str - Alias loaded for the model attributes, e.g. "champion" or "challenger".

        """
        self._default_alias = default_alias
        self._models: dict[tuple[str, str], PyFuncModel] = {}
        self._lock = Lock()

    def get(self, model_name: str, version: int | str | None = None, alias: str | None = None) -> PyFuncModel:
        """Get a model by version or alias, loading it on first use.

        Models are cached by name and alias or version. An alias is resolved when first loaded, so use ``reload``
        to pick up a new champion.
        """
        if version is None and alias is None:
            alias = self._default_alias
        key = (model_name, f"v{version}" if version is not None else f"@{alias}")
        with self._lock:
            if key not in self._models:
                self._models[key] = load_registered_model(model_name, version=version, alias=alias)
            return self._models[key]

    def reload(self, model_name: str, version: int | str | None = None, alias: str | None = None) -> PyFuncModel:
        """Drop the cached model and load it again."""
        if version is None and alias is None:
            alias = self._default_alias
        key = (model_name, f"v{version}" if version is not None else f"@{alias}")
        with self._lock:
            self._models.pop(key, None)
        return self.get(model_name, version=version, alias=alias)

    def load_all(self) -> None:
        """Load every model attribute, e.g. at startup, so the first request does not pay the load time."""
        _ = self.demo_model

    @property
    def demo_model(self) -> PyFuncModel:
        """The demo model, loaded with the registry's default alias."""
        return self.get(DEMO_MODEL_NAME)
