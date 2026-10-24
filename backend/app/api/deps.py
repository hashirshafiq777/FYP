"""Shared FastAPI dependencies."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Any

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.errors import ForbiddenError, NotAuthenticatedError
from app.core.security import decode_access_token
from app.services import auth_service

# auto_error=False so a *missing* Authorization header reaches us and we can raise
# 401 ourselves; FastAPI's default would return 403, which is wrong here.
bearer_scheme = HTTPBearer(auto_error=False, scheme_name="BearerAuth")


class CurrentUser:
    """The authenticated user plus the claims of the token that identified them."""

    __slots__ = ("document", "claims")

    def __init__(self, document: dict[str, Any], claims: dict[str, Any]) -> None:
        self.document = document
        self.claims = claims

    @property
    def id(self) -> str:
        return str(self.document["_id"])

    @property
    def role(self) -> str:
        return self.document.get("role", "user")

    @property
    def jti(self) -> str:
        return str(self.claims["jti"])

    @property
    def expires_at(self) -> datetime:
        return datetime.fromtimestamp(int(self.claims["exp"]), tz=timezone.utc)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> CurrentUser:
    """Resolve the bearer token to a user, or raise 401.

    Rejects missing, malformed, expired and revoked tokens, and tokens whose
    subject no longer exists. The role is read from the database every request,
    never from the token.
    """
    if credentials is None or not (credentials.credentials or "").strip():
        raise NotAuthenticatedError("Not authenticated.")

    if (credentials.scheme or "").lower() != "bearer":
        raise NotAuthenticatedError("Invalid authentication scheme.")

    try:
        claims = decode_access_token(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise NotAuthenticatedError("Token has expired.") from None
    except jwt.PyJWTError:
        raise NotAuthenticatedError("Could not validate credentials.") from None

    jti = claims.get("jti")
    subject = claims.get("sub")
    if not jti or not subject:
        raise NotAuthenticatedError("Could not validate credentials.")

    if await auth_service.is_token_revoked(str(jti)):
        raise NotAuthenticatedError("Token has been revoked.")

    user = await auth_service.get_user_by_id(str(subject))
    if user is None:
        raise NotAuthenticatedError("Could not validate credentials.")

    return CurrentUser(document=user, claims=claims)


CurrentUserDep = Annotated[CurrentUser, Depends(get_current_user)]


async def require_admin(current_user: CurrentUserDep) -> CurrentUser:
    """Layered on top of `get_current_user`: admin-only endpoints depend on this.

    The role is read from the database on every request (never from the token),
    so a promotion or demotion takes effect immediately rather than whenever the
    caller's token happens to expire. That is what makes this check trustworthy:
    a token minted while the user was an admin stops opening admin routes the
    moment the role is removed.
    """
    if current_user.role != "admin":
        raise ForbiddenError()
    return current_user


AdminUserDep = Annotated[CurrentUser, Depends(require_admin)]
