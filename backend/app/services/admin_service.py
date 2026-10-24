"""Admin-only operations.

Every function here is reached through the `require_admin` dependency, which
re-reads the caller's role from the database on each request. Nothing in this
module re-checks the role itself: the single gate is the dependency, so there is
one place to audit rather than a check scattered through each handler.
"""

from __future__ import annotations

from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument

from app.api.deps import CurrentUser
from app.core.errors import ForbiddenError, ResourceNotFoundError
from app.db.mongo import get_users_collection
from app.schemas.user import Role, UserList, UserPublic

MAX_PAGE_SIZE = 100

# Never select password_hash, so it cannot reach a response by accident.
SAFE_PROJECTION = {
    "full_name": 1,
    "email": 1,
    "role": 1,
    "created_at": 1,
}


async def list_users(*, limit: int = 50, skip: int = 0) -> UserList:
    """All accounts, newest first. Password hashes are never selected."""
    users = get_users_collection()
    capped = max(1, min(limit, MAX_PAGE_SIZE))

    cursor = (
        users.find({}, projection=SAFE_PROJECTION)
        .sort("created_at", -1)
        .skip(max(0, skip))
        .limit(capped)
    )
    items = [UserPublic.from_document(doc) async for doc in cursor]
    total = await users.count_documents({})
    return UserList(items=items, total=total)


async def set_user_role(
    admin: CurrentUser, user_id: str, role: Role
) -> UserPublic:
    """Promote or demote an account.

    An admin cannot change their *own* role. Without that guard a sole admin can
    demote themselves and leave the system with no way back in through the API —
    recoverable only by editing the database by hand.
    """
    if user_id == admin.id:
        raise ForbiddenError("You cannot change your own role.")

    try:
        object_id = ObjectId(user_id)
    except (InvalidId, TypeError):
        raise ResourceNotFoundError("User not found.") from None

    document: dict[str, Any] | None = await get_users_collection().find_one_and_update(
        {"_id": object_id},
        {"$set": {"role": role}},
        projection=SAFE_PROJECTION,
        return_document=ReturnDocument.AFTER,
    )
    if document is None:
        raise ResourceNotFoundError("User not found.")

    return UserPublic.from_document(document)
