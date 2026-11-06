"""Module for custom exceptions used throughout the application."""


class DatabaseUnavailableException(Exception):
    """Exception raised when the database is unavailable."""


class MlflowUnavailableException(Exception):
    """Exception raised when MLflow is unavailable."""
