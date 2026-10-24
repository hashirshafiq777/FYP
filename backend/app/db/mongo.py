"""MongoDB connection lifecycle (PyMongo async API — `AsyncMongoClient`)."""

from __future__ import annotations

import logging

from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import PyMongoError

from app.core.config import settings

logger = logging.getLogger("app.db")

_client: AsyncMongoClient | None = None
_database: AsyncDatabase | None = None

USERS_COLLECTION = "users"
REVOKED_TOKENS_COLLECTION = "revoked_tokens"
# Private, per-user records. Every document carries an `owner_id`.
DOCUMENTS_COLLECTION = "documents"


async def connect_to_mongo() -> AsyncDatabase:
    """Open the client and return the application database."""
    global _client, _database
    if _database is not None:
        return _database
    _client = AsyncMongoClient(
        settings.MONGODB_URI,
        # A cold Atlas cluster can take ~1s just to answer the first ping, and
        # more on a slow link. 5s was tight enough that a transient hiccup at
        # startup looked like "the database is down".
        serverSelectionTimeoutMS=15000,
        connectTimeoutMS=15000,
        tz_aware=True,
        # Avoid a thundering herd of connections from the reloader + tests.
        maxPoolSize=20,
    )
    _database = _client[settings.MONGODB_DB_NAME]
    logger.info("Connected to MongoDB database %r", settings.MONGODB_DB_NAME)
    return _database


async def close_mongo_connection() -> None:
    global _client, _database
    if _client is not None:
        await _client.close()
        logger.info("Closed MongoDB connection")
    _client = None
    _database = None


def get_database() -> AsyncDatabase:
    """Return the connected database, or raise if the lifespan never ran."""
    if _database is None:
        raise RuntimeError("MongoDB is not connected; application lifespan did not start.")
    return _database


def get_users_collection():
    return get_database()[USERS_COLLECTION]


def get_revoked_tokens_collection():
    return get_database()[REVOKED_TOKENS_COLLECTION]


def get_documents_collection():
    return get_database()[DOCUMENTS_COLLECTION]


async def ping_database() -> bool:
    """True when the server answers a ping, False otherwise."""
    try:
        await get_database().command("ping")
    except (PyMongoError, RuntimeError) as exc:
        logger.warning("MongoDB ping failed: %s", type(exc).__name__)
        return False
    return True
