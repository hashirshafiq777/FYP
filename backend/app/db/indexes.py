"""Index creation. Safe to run on every startup — `create_index` is idempotent."""

from __future__ import annotations

import logging

from pymongo import ASCENDING, DESCENDING
from pymongo.asynchronous.database import AsyncDatabase

from app.db.mongo import (
    DOCUMENTS_COLLECTION,
    REVOKED_TOKENS_COLLECTION,
    USERS_COLLECTION,
)

logger = logging.getLogger("app.db")


async def ensure_indexes(database: AsyncDatabase) -> None:
    await database[USERS_COLLECTION].create_index(
        [("email", ASCENDING)],
        unique=True,
        name="uniq_users_email",
    )
    # Mongo's TTL monitor deletes each document once `expires_at` is reached,
    # so revoked tokens clean themselves up when the JWT would have expired anyway.
    await database[REVOKED_TOKENS_COLLECTION].create_index(
        [("expires_at", ASCENDING)],
        expireAfterSeconds=0,
        name="ttl_revoked_tokens_expires_at",
    )
    await database[REVOKED_TOKENS_COLLECTION].create_index(
        [("jti", ASCENDING)],
        unique=True,
        name="uniq_revoked_tokens_jti",
    )
    # Every private query filters by owner_id first, so it leads the index.
    # Pairing it with created_at means "this user's newest records" is served
    # entirely from the index, and a missing owner filter cannot ride along on it.
    await database[DOCUMENTS_COLLECTION].create_index(
        [("owner_id", ASCENDING), ("created_at", DESCENDING)],
        name="owner_created_at",
    )
    logger.info("MongoDB indexes ensured")
