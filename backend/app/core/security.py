"""Password hashing and JWT helpers.

Nothing in here is ever logged: the module deals only in secrets.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import settings

_password_hasher = PasswordHasher(
    time_cost=settings.ARGON2_TIME_COST,
    memory_cost=settings.ARGON2_MEMORY_COST_KIB,
    parallelism=settings.ARGON2_PARALLELISM,
)

# Pre-computed hash of a throwaway password. Verifying against it when an email is
# unknown keeps login response timing roughly constant, so the endpoint does not
# leak which addresses are registered.
_DUMMY_HASH = _password_hasher.hash("dummy-password-for-constant-time-login")


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        _password_hasher.verify(password_hash, password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False
    return True


def fake_verify_password() -> None:
    """Burn roughly one Argon2 verification worth of time (unknown-email path)."""
    try:
        _password_hasher.verify(_DUMMY_HASH, "wrong-password")
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        pass


def create_access_token(subject: str) -> tuple[str, int, str]:
    """Return ``(token, expires_in_seconds, jti)`` for the given user id."""
    now = datetime.now(timezone.utc)
    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = now + expires_delta
    jti = str(uuid.uuid4())
    payload: dict[str, Any] = {
        "sub": subject,
        "jti": jti,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token, int(expires_delta.total_seconds()), jti


def decode_access_token(token: str) -> dict[str, Any]:
    """Decode and verify a token.

    Raises ``jwt.PyJWTError`` for anything malformed, expired or badly signed.
    """
    return jwt.decode(
        token,
        settings.JWT_SECRET,
        algorithms=[settings.JWT_ALGORITHM],
        options={"require": ["exp", "iat", "sub", "jti"]},
    )
