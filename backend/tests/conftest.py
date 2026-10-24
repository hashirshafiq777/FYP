"""Test configuration.

The environment is set up here, before anything under `app` is imported, because
settings are read once at import time. The suite refuses to run against any
database whose name does not end in `_test`, and drops that database afterwards.
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator

import pytest

TEST_DB_SUFFIX = "_test"


def assert_test_database(name: str) -> str:
    """Guard against ever pointing the suite at a real database."""
    if not name or not name.endswith(TEST_DB_SUFFIX):
        raise RuntimeError(
            f"Refusing to run tests against database {name!r}: "
            f"the test database name must end in {TEST_DB_SUFFIX!r}. "
            "Set TEST_MONGODB_DB_NAME in backend/.env."
        )
    return name


def _test_db_name() -> str:
    """TEST_MONGODB_DB_NAME from the environment, then backend/.env, then default."""
    from dotenv import dotenv_values

    return (
        os.environ.get("TEST_MONGODB_DB_NAME")
        or dotenv_values(".env").get("TEST_MONGODB_DB_NAME")
        or "legaldocreader_test"
    )


_TEST_DB_NAME = assert_test_database(_test_db_name())

# Must happen before `app.core.config` is imported.
os.environ["APP_ENV"] = "test"
os.environ["MONGODB_DB_NAME"] = _TEST_DB_NAME
os.environ.setdefault(
    "JWT_SECRET", "test-only-secret-value-that-is-definitely-long-enough-123456"
)
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "60")

# Argon2 at production cost makes the suite several minutes of pure hashing.
# The algorithm and the verify path are unchanged — only the work factor — so
# everything these tests assert about hashing still holds.
os.environ.setdefault("ARGON2_TIME_COST", "1")
os.environ.setdefault("ARGON2_MEMORY_COST_KIB", "8192")
os.environ.setdefault("ARGON2_PARALLELISM", "1")

# MONGODB_URI is deliberately left alone: Settings reads it from backend/.env
# (or falls back to a local server), so tests hit the same cluster as the app
# but a database whose name ends in _test.

import httpx  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.db.mongo import close_mongo_connection, connect_to_mongo  # noqa: E402
from app.main import app  # noqa: E402


def pytest_configure() -> None:
    # Second guard: whatever the environment did, this is what the app will use.
    assert_test_database(settings.MONGODB_DB_NAME)


@pytest.fixture(scope="session")
async def test_app() -> AsyncIterator[None]:
    """Run the real application lifespan, then drop the test database."""
    assert_test_database(settings.MONGODB_DB_NAME)
    async with app.router.lifespan_context(app):
        # The lifespan deliberately swallows index errors so the app still
        # starts (and reports the problem through /health) when Mongo is briefly
        # unavailable. Tests need the opposite: if the indexes are not there,
        # say so loudly instead of letting uniqueness and ownership tests fail
        # with a confusing assertion several screens later.
        from app.db.indexes import ensure_indexes
        from app.db.mongo import get_database

        await ensure_indexes(get_database())
        yield
    # The lifespan closed the client, so reconnect briefly to clean up.
    database = await connect_to_mongo()
    await database.client.drop_database(settings.MONGODB_DB_NAME)
    await close_mongo_connection()


@pytest.fixture
async def client(test_app: None) -> AsyncIterator[httpx.AsyncClient]:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(
        transport=transport, base_url="http://testserver"
    ) as http_client:
        yield http_client


@pytest.fixture(autouse=True)
async def clean_collections(test_app: None):
    """Each test starts with empty collections but keeps the indexes."""
    from app.db.mongo import (
        get_documents_collection,
        get_revoked_tokens_collection,
        get_users_collection,
    )

    await get_users_collection().delete_many({})
    await get_revoked_tokens_collection().delete_many({})
    await get_documents_collection().delete_many({})
    yield


@pytest.fixture
def api() -> str:
    return settings.API_V1_PREFIX
