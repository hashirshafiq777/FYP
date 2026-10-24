"""Promote (or demote) an account from the command line.

Signup can never create an admin — `role` is server-assigned and always "user" —
so the *first* admin has to be made out of band. After that, an admin can manage
roles through `PATCH /api/v1/admin/users/{id}/role`.

    cd backend
    python -m scripts.promote_admin ibad@yopmail.com
    python -m scripts.promote_admin ibad@yopmail.com --role user
    python -m scripts.promote_admin --list

Run with `-m` from the `backend/` directory so `app` is importable.
"""

from __future__ import annotations

import argparse
import asyncio
import sys

from app.core.config import settings
from app.db.mongo import close_mongo_connection, connect_to_mongo, get_users_collection


async def _promote(email: str, role: str) -> int:
    normalised = email.strip().lower()
    await connect_to_mongo()
    try:
        users = get_users_collection()
        existing = await users.find_one({"email": normalised}, projection={"role": 1})
        if existing is None:
            print(f"No account found for {normalised!r}.", file=sys.stderr)
            return 1

        if existing.get("role") == role:
            print(f"{normalised} is already {role!r}. Nothing to do.")
            return 0

        await users.update_one({"_id": existing["_id"]}, {"$set": {"role": role}})
        print(f"{normalised}: {existing.get('role', 'user')!r} -> {role!r}")
        print("Takes effect immediately — the role is read from the database on every request.")
        return 0
    finally:
        await close_mongo_connection()


async def _list() -> int:
    await connect_to_mongo()
    try:
        cursor = get_users_collection().find({}, projection={"email": 1, "role": 1}).sort("created_at", 1)
        rows = [(doc.get("email", "?"), doc.get("role", "user")) async for doc in cursor]
        if not rows:
            print("No accounts yet.")
            return 0
        width = max(len(email) for email, _ in rows)
        print(f"{'EMAIL'.ljust(width)}  ROLE")
        for email, role in rows:
            print(f"{email.ljust(width)}  {role}")
        return 0
    finally:
        await close_mongo_connection()


def main() -> int:
    parser = argparse.ArgumentParser(
        prog="python -m scripts.promote_admin",
        description="Set an account's role, or list accounts and their roles.",
    )
    parser.add_argument("email", nargs="?", help="Email address of the account.")
    parser.add_argument(
        "--role",
        choices=("admin", "user"),
        default="admin",
        help="Role to assign (default: admin).",
    )
    parser.add_argument(
        "--list", action="store_true", help="List every account and its role, then exit."
    )
    args = parser.parse_args()

    print(f"Database: {settings.MONGODB_DB_NAME}")

    if args.list:
        return asyncio.run(_list())

    if not args.email:
        parser.error("an email address is required (or pass --list)")

    return asyncio.run(_promote(args.email, args.role))


if __name__ == "__main__":
    raise SystemExit(main())
