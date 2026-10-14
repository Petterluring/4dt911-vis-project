"""Tests for DBUser in app.remote_services.postgres.users."""

from app.remote_services.postgres.users import DBUser

VALID_DATA = {
    "username": "alice",
    "password": "secret",
    "host": "localhost",
    "port": 5432,
    "database": "mydb",
}


def test_db_user_attributes():
    user = DBUser(**VALID_DATA)

    assert user.username == "alice"
    assert user.password == "secret"
    assert user.host == "localhost"
    assert user.port == 5432
    assert user.database == "mydb"

