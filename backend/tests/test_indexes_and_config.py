from __future__ import annotations

import pytest

from app.core.config import EXAMPLE_JWT_SECRET, Settings
from tests.conftest import assert_test_database


async def test_users_email_unique_index_exists(test_app: None) -> None:
    from app.db.mongo import get_users_collection

    indexes = await get_users_collection().index_information()
    email_indexes = [
        spec for spec in indexes.values() if spec["key"] == [("email", 1)]
    ]
    assert email_indexes, f"no index on users.email; have {list(indexes)}"
    assert email_indexes[0].get("unique") is True


async def test_revoked_tokens_ttl_index_exists(test_app: None) -> None:
    from app.db.mongo import get_revoked_tokens_collection

    indexes = await get_revoked_tokens_collection().index_information()
    ttl_indexes = [
        spec for spec in indexes.values() if spec["key"] == [("expires_at", 1)]
    ]
    assert ttl_indexes, f"no index on revoked_tokens.expires_at; have {list(indexes)}"
    assert ttl_indexes[0].get("expireAfterSeconds") == 0


async def test_documents_are_indexed_by_owner(test_app: None) -> None:
    """Every private query filters by owner_id, so it must lead the index."""
    from app.db.mongo import get_documents_collection

    indexes = await get_documents_collection().index_information()
    owner_indexes = [
        spec for spec in indexes.values() if spec["key"][:1] == [("owner_id", 1)]
    ]
    assert owner_indexes, f"no owner_id index on documents; have {list(indexes)}"


async def test_unique_email_index_blocks_a_direct_duplicate_insert(test_app: None) -> None:
    """The index, not just the application check, enforces uniqueness."""
    from datetime import datetime, timezone

    from pymongo.errors import DuplicateKeyError

    from app.db.mongo import get_users_collection

    document = {
        "full_name": "Index Test",
        "email": "index-test@example.com",
        "password_hash": "x",
        "role": "user",
        "created_at": datetime.now(timezone.utc),
    }
    await get_users_collection().insert_one(dict(document))
    with pytest.raises(DuplicateKeyError):
        await get_users_collection().insert_one(dict(document))


def test_only_the_expected_collections_are_used() -> None:
    from app.db import mongo

    assert {
        mongo.USERS_COLLECTION,
        mongo.REVOKED_TOKENS_COLLECTION,
        mongo.DOCUMENTS_COLLECTION,
    } == {"users", "revoked_tokens", "documents"}


# ---------------------------------------------------- test-database safety guard


@pytest.mark.parametrize("name", ["legaldocreader", "production", "test_db", ""])
def test_suite_refuses_a_non_test_database(name: str) -> None:
    with pytest.raises(RuntimeError, match="must end in"):
        assert_test_database(name)


def test_suite_accepts_a_test_database() -> None:
    assert assert_test_database("legaldocreader_test") == "legaldocreader_test"


def test_tests_are_actually_running_against_a_test_database() -> None:
    from app.core.config import settings

    assert settings.MONGODB_DB_NAME.endswith("_test")
    assert settings.APP_ENV == "test"


# ------------------------------------------------------------- JWT secret policy


@pytest.mark.parametrize("env", ["test", "prod"])
@pytest.mark.parametrize(
    "secret",
    ["", "   ", "too-short", EXAMPLE_JWT_SECRET],
    ids=["empty", "blank", "short", "example-value"],
)
def test_weak_jwt_secret_is_refused_outside_dev(env: str, secret: str) -> None:
    with pytest.raises(ValueError):
        Settings(APP_ENV=env, JWT_SECRET=secret, MONGODB_URI="mongodb://localhost:27017")


def test_weak_jwt_secret_is_allowed_in_dev() -> None:
    config = Settings(
        APP_ENV="dev", JWT_SECRET=EXAMPLE_JWT_SECRET, MONGODB_URI="mongodb://localhost:27017"
    )
    assert config.JWT_SECRET == EXAMPLE_JWT_SECRET


def test_strong_secret_is_accepted_in_prod() -> None:
    config = Settings(
        APP_ENV="prod",
        JWT_SECRET="x" * 32,
        MONGODB_URI="mongodb://localhost:27017",
    )
    assert config.is_prod is True


def test_cors_origins_are_parsed_as_a_list() -> None:
    config = Settings(CORS_ORIGINS="http://a.test, http://b.test ,, http://c.test")
    assert config.cors_origins_list == ["http://a.test", "http://b.test", "http://c.test"]
