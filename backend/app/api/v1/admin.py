"""Admin-only routes.

Every route depends on `AdminUserDep` (= `get_current_user` + `require_admin`),
so a normal user's valid token is rejected with 403 no matter how the request is
made — including a direct call with a hand-crafted token, which is the case
M1-T5 is meant to guarantee.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import AdminUserDep
from app.schemas.user import RoleUpdate, UserList, UserPublic
from app.services import admin_service

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    responses={
        401: {"description": "Missing, invalid, expired or revoked token."},
        403: {"description": "Authenticated, but not an admin."},
    },
)


@router.get(
    "/users",
    response_model=UserList,
    summary="List all accounts (admin only)",
)
async def list_users(
    _admin: AdminUserDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    skip: Annotated[int, Query(ge=0)] = 0,
) -> UserList:
    return await admin_service.list_users(limit=limit, skip=skip)


@router.patch(
    "/users/{user_id}/role",
    response_model=UserPublic,
    summary="Change an account's role (admin only)",
    responses={404: {"description": "No such user."}},
)
async def set_user_role(
    user_id: str,
    payload: RoleUpdate,
    admin: AdminUserDep,
) -> UserPublic:
    """Promote or demote another account. Admins cannot change their own role."""
    return await admin_service.set_user_role(admin, user_id, payload.role)
