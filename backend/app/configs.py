"""Module for loading and managing configuration for different services."""
from app.remote_services.mlflow.users import MlFlowUsers
from app.remote_services.postgres.users import DBUsers

mlflow_user = MlFlowUsers.MLFLOW_USER.load_user()

db_user = DBUsers.AIRBNB.load_user()
postgres_engine_kwargs = {
    "pool_size": 5,
    "max_overflow": 10,
    "pool_timeout": 10,
    "pool_pre_ping": True,
}
