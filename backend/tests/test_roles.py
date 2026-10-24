"""M1-T5 — User Roles.

Completion check from the milestone:
    "Users cannot call admin-only APIs even by direct request."

"Direct request" is the important part: these tests do not go near a UI. They
hold a normal user's genuine, valid bearer token and call the admin endpoints
straight, which is exactly what an attacker would do.
"""

from __future__ import annotations

import httpx
import pytest
from bson import ObjectId

ADMIN_ROUTES: list[tuple[str, str]] = [
    ("GET", "/admin/users"),
    ("PATCH", "/admin/users/{other_id}/role"),
]


async def signup(client: httpx.AsyncClient, api: str, email: str, name: str = "Test User") -> dict:
    response = await client.post(
        f"{api}/auth/signup",
        json={"full_name": name, "email": email, "password": "S3cure-pass!"},
    )
    assert response.status_code == 201, response.text
    return response.json()


async def token_for(client: httpx.AsyncClient, api: str, email: str) -> str:
    response = await client.post(
        f"{api}/auth/login", json={"email": email, "password": "S3cure-pass!"}
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def make_admin(email: str) -> None:
    """Promote out of band, the way `scripts/promote_admin.py` does."""
    from app.db.mongo import get_users_collection

    result = await get_users_collection().update_one(
        {"email": email}, {"$set": {"role": "admin"}}
    )
    assert result.modified_count == 1


@pytest.fixture
async def normal_user(client: httpx.AsyncClient, api: str) -> dict:
    user = await signup(client, api, "user@example.com", "Normal User")
    user["token"] = await token_for(client, api, "user@example.com")
    return user


@pytest.fixture
async def admin_user(client: httpx.AsyncClient, api: str) -> dict:
    user = await signup(client, api, "admin@example.com", "Admin User")
    await make_admin("admin@example.com")
    user["token"] = await token_for(client, api, "admin@example.com")
    return user


# ------------------------------------------------------------ default role


async def test_signup_always_creates_a_plain_user(client: httpx.AsyncClient, api: str) -> None:
    user = await signup(client, api, "plain@example.com")
    assert user["role"] == "user"


async def test_signup_cannot_request_the_admin_role(
    client: httpx.AsyncClient, api: str
) -> None:
    response = await client.post(
        f"{api}/auth/signup",
        json={
            "full_name": "Sneaky User",
            "email": "sneaky@example.com",
            "password": "S3cure-pass!",
            "role": "admin",
        },
    )
    assert response.status_code == 422


# ---------------------------------------------- denied: normal user, 403


@pytest.mark.parametrize(("method", "path"), ADMIN_ROUTES)
async def test_normal_user_is_refused_every_admin_route(
    client: httpx.AsyncClient,
    api: str,
    normal_user: dict,
    admin_user: dict,
    method: str,
    path: str,
) -> None:
    """A valid token for a non-admin must not open an admin route."""
    url = f"{api}{path.format(other_id=admin_user['id'])}"
    response = await client.request(
        method, url, headers=auth(normal_user["token"]), json={"role": "user"}
    )

    assert response.status_code == 403, f"{method} {path} returned {response.status_code}"
    assert response.json()["error"]["code"] == "forbidden"
    # 403, not 401: re-authenticating would not help, so no challenge header.
    assert "WWW-Authenticate" not in response.headers


@pytest.mark.parametrize(("method", "path"), ADMIN_ROUTES)
async def test_admin_routes_reject_anonymous_callers(
    client: httpx.AsyncClient, api: str, admin_user: dict, method: str, path: str
) -> None:
    url = f"{api}{path.format(other_id=admin_user['id'])}"
    response = await client.request(method, url, json={"role": "user"})

    assert response.status_code == 401
    assert response.headers.get("WWW-Authenticate") == "Bearer"


@pytest.mark.parametrize(("method", "path"), ADMIN_ROUTES)
async def test_admin_routes_reject_a_garbage_token(
    client: httpx.AsyncClient, api: str, admin_user: dict, method: str, path: str
) -> None:
    url = f"{api}{path.format(other_id=admin_user['id'])}"
    response = await client.request(
        method, url, headers=auth("not.a.jwt"), json={"role": "user"}
    )
    assert response.status_code == 401


async def test_revoked_admin_token_cannot_call_admin_routes(
    client: httpx.AsyncClient, api: str, admin_user: dict
) -> None:
    """Logging out ends admin access too, not just ordinary access."""
    assert (
        await client.get(f"{api}/admin/users", headers=auth(admin_user["token"]))
    ).status_code == 200

    assert (
        await client.post(f"{api}/auth/logout", headers=auth(admin_user["token"]))
    ).status_code == 204

    after = await client.get(f"{api}/admin/users", headers=auth(admin_user["token"]))
    assert after.status_code == 401


# ------------------------------------------------- allowed: admin, 200


async def test_admin_can_list_users(
    client: httpx.AsyncClient, api: str, admin_user: dict, normal_user: dict
) -> None:
    response = await client.get(f"{api}/admin/users", headers=auth(admin_user["token"]))
    assert response.status_code == 200

    body = response.json()
    assert body["total"] == 2
    emails = {item["email"] for item in body["items"]}
    assert emails == {"admin@example.com", "user@example.com"}


async def test_admin_listing_never_exposes_password_hashes(
    client: httpx.AsyncClient, api: str, admin_user: dict, normal_user: dict
) -> None:
    response = await client.get(f"{api}/admin/users", headers=auth(admin_user["token"]))
    assert response.status_code == 200
    assert "password_hash" not in response.text
    assert "argon2" not in response.text
    for item in response.json()["items"]:
        assert set(item) == {"id", "full_name", "email", "role", "created_at"}


async def test_admin_can_promote_and_demote_another_account(
    client: httpx.AsyncClient, api: str, admin_user: dict, normal_user: dict
) -> None:
    promote = await client.patch(
        f"{api}/admin/users/{normal_user['id']}/role",
        headers=auth(admin_user["token"]),
        json={"role": "admin"},
    )
    assert promote.status_code == 200
    assert promote.json()["role"] == "admin"

    demote = await client.patch(
        f"{api}/admin/users/{normal_user['id']}/role",
        headers=auth(admin_user["token"]),
        json={"role": "user"},
    )
    assert demote.status_code == 200
    assert demote.json()["role"] == "user"


async def test_admin_cannot_change_their_own_role(
    client: httpx.AsyncClient, api: str, admin_user: dict
) -> None:
    """Guards against a sole admin locking everyone out of the admin API."""
    response = await client.patch(
        f"{api}/admin/users/{admin_user['id']}/role",
        headers=auth(admin_user["token"]),
        json={"role": "user"},
    )
    assert response.status_code == 403

    # And the role really is unchanged.
    still = await client.get(f"{api}/auth/me", headers=auth(admin_user["token"]))
    assert still.json()["role"] == "admin"


async def test_role_change_rejects_an_unknown_role(
    client: httpx.AsyncClient, api: str, admin_user: dict, normal_user: dict
) -> None:
    response = await client.patch(
        f"{api}/admin/users/{normal_user['id']}/role",
        headers=auth(admin_user["token"]),
        json={"role": "superuser"},
    )
    assert response.status_code == 422


async def test_role_change_on_a_missing_user_is_404(
    client: httpx.AsyncClient, api: str, admin_user: dict
) -> None:
    missing = str(ObjectId())
    response = await client.patch(
        f"{api}/admin/users/{missing}/role",
        headers=auth(admin_user["token"]),
        json={"role": "admin"},
    )
    assert response.status_code == 404


async def test_role_change_on_a_malformed_id_is_404_not_500(
    client: httpx.AsyncClient, api: str, admin_user: dict
) -> None:
    response = await client.patch(
        f"{api}/admin/users/not-an-object-id/role",
        headers=auth(admin_user["token"]),
        json={"role": "admin"},
    )
    assert response.status_code == 404


# ------------------------------------- role is live, not baked into the token


async def test_promotion_takes_effect_on_the_existing_token(
    client: httpx.AsyncClient, api: str, normal_user: dict
) -> None:
    """The role is read from the database per request, so no re-login is needed."""
    before = await client.get(f"{api}/admin/users", headers=auth(normal_user["token"]))
    assert before.status_code == 403

    await make_admin("user@example.com")

    after = await client.get(f"{api}/admin/users", headers=auth(normal_user["token"]))
    assert after.status_code == 200, "promotion should apply to the token already issued"


async def test_demotion_closes_admin_routes_immediately(
    client: httpx.AsyncClient, api: str, admin_user: dict
) -> None:
    """The flip side, and the reason the role is not a token claim."""
    from app.db.mongo import get_users_collection

    assert (
        await client.get(f"{api}/admin/users", headers=auth(admin_user["token"]))
    ).status_code == 200

    await get_users_collection().update_one(
        {"email": "admin@example.com"}, {"$set": {"role": "user"}}
    )

    after = await client.get(f"{api}/admin/users", headers=auth(admin_user["token"]))
    assert after.status_code == 403, "a demoted admin must lose access without re-login"


async def test_role_is_not_a_token_claim(
    client: httpx.AsyncClient, api: str, admin_user: dict
) -> None:
    import jwt

    claims = jwt.decode(admin_user["token"], options={"verify_signature": False})
    assert "role" not in claims
    assert set(claims) == {"sub", "jti", "iat", "exp"}
