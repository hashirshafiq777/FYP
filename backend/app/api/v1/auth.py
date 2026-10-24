"""Authentication routes. Logic lives in `app.services.auth_service`."""

from __future__ import annotations

from fastapi import APIRouter, Response, status

from app.api.deps import CurrentUserDep
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserCreate, UserPublic
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/signup",
    response_model=UserPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new account",
    responses={
        409: {"description": "Email already registered."},
        422: {"description": "Validation error."},
    },
)
async def signup(payload: UserCreate) -> UserPublic:
    """Create an account. Returns the new user; no token is issued here."""
    return await auth_service.register_user(payload)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Exchange credentials for an access token",
    responses={401: {"description": "Incorrect email or password."}},
)
async def login(payload: LoginRequest) -> TokenResponse:
    return await auth_service.authenticate_user(payload)


@router.get(
    "/me",
    response_model=UserPublic,
    summary="Current authenticated user",
    responses={401: {"description": "Missing, invalid, expired or revoked token."}},
)
async def me(current_user: CurrentUserDep) -> UserPublic:
    return UserPublic.from_document(current_user.document)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke the current access token",
    responses={401: {"description": "Missing, invalid, expired or revoked token."}},
)
async def logout(current_user: CurrentUserDep) -> Response:
    await auth_service.revoke_token(current_user.jti, current_user.expires_at)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
