"""Authentication logic: registration, login, token revocation, user lookup."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import DuplicateKeyError

from app.core.errors import EmailAlreadyRegisteredError, InvalidCredentialsError
from app.core.security import (
    create_access_token,
    fake_verify_password,
    hash_password,
    verify_password,
)
from app.db.mongo import get_revoked_tokens_collection, get_users_collection
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserCreate, UserPublic


async def register_user(payload: UserCreate) -> UserPublic:
    """Create a user. Raises `EmailAlreadyRegisteredError` on a duplicate email."""
    users = get_users_collection()
    email = payload.email.strip().lower()

    if await users.find_one({"email": email}, projection={"_id": 1}) is not None:
        raise EmailAlreadyRegisteredError()

    document: dict[str, Any] = {
        "full_name": payload.full_name.strip(),
        "email": email,
        "password_hash": hash_password(payload.password),
        # Role is assigned by the server, never taken from the request body.
        "role": "user",
        "created_at": datetime.now(timezone.utc),
    }

    try:
        result = await users.insert_one(document)
    except DuplicateKeyError:
        # Two concurrent signups can both pass the find_one check above; the
        # unique index is what actually guarantees uniqueness.
        raise EmailAlreadyRegisteredError() from None

    document["_id"] = result.inserted_id
    return UserPublic.from_document(document)


async def authenticate_user(payload: LoginRequest) -> TokenResponse:
    """Verify credentials and issue an access token.

    Unknown email and wrong password raise the same error, and both paths run one
    Argon2 verification so response timing does not reveal which emails exist.
    """
    users = get_users_collection()
    email = payload.email.strip().lower()
    user = await users.find_one({"email": email})

    if user is None:
        fake_verify_password()
        raise InvalidCredentialsError()

    if not verify_password(payload.password, user["password_hash"]):
        raise InvalidCredentialsError()

    token, expires_in, _jti = create_access_token(subject=str(user["_id"]))
    return TokenResponse(access_token=token, token_type="bearer", expires_in=expires_in)


async def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    try:
        object_id = ObjectId(user_id)
    except (InvalidId, TypeError):
        return None
    return await get_users_collection().find_one({"_id": object_id})


async def is_token_revoked(jti: str) -> bool:
    revoked = get_revoked_tokens_collection()
    return await revoked.find_one({"jti": jti}, projection={"_id": 1}) is not None


async def revoke_token(jti: str, expires_at: datetime) -> None:
    """Record a `jti` so it is rejected until its TTL index removes the row."""
    revoked = get_revoked_tokens_collection()
    try:
        await revoked.insert_one({"jti": jti, "expires_at": expires_at})
    except DuplicateKeyError:
        # Logging out twice with the same token is not an error.
        pass
