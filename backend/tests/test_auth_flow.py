from __future__ import annotations

from datetime import datetime, timedelta, timezone

import httpx
import jwt
import pytest

SIGNUP = {
    "full_name": "Ayesha Khan",
    "email": "ayesha@example.com",
    "password": "S3cure-pass!",
}


@pytest.fixture
async def registered_user(client: httpx.AsyncClient, api: str) -> dict:
    response = await client.post(f"{api}/auth/signup", json=SIGNUP)
    assert response.status_code == 201
    return response.json()


async def login(client: httpx.AsyncClient, api: str, **overrides) -> httpx.Response:
    payload = {"email": SIGNUP["email"], "password": SIGNUP["password"]} | overrides
    return await client.post(f"{api}/auth/login", json=payload)


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# --------------------------------------------------------------------------- login


async def test_login_returns_a_token(
    client: httpx.AsyncClient, api: str, registered_user: dict
) -> None:
    response = await login(client, api)
    assert response.status_code == 200
    body = response.json()

    assert body["token_type"] == "bearer"
    assert body["expires_in"] == 3600
    assert body["access_token"]

    claims = jwt.decode(body["access_token"], options={"verify_signature": False})
    assert claims["sub"] == registered_user["id"]
    assert claims["jti"]
    assert claims["iat"] and claims["exp"]
    # The role is loaded from the database per request, never carried in the token.
    assert "role" not in claims


async def test_login_is_case_insensitive_on_email(
    client: httpx.AsyncClient, api: str, registered_user: dict
) -> None:
    response = await login(client, api, email="AYESHA@Example.COM")
    assert response.status_code == 200


async def test_wrong_password_and_unknown_email_are_indistinguishable(
    client: httpx.AsyncClient, api: str, registered_user: dict
) -> None:
    wrong_password = await login(client, api, password="definitely-not-it")
    unknown_email = await login(client, api, email="nobody@example.com")

    assert wrong_password.status_code == 401
    assert unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json()
    assert wrong_password.json()["error"]["code"] == "invalid_credentials"


# ------------------------------------------------------------------------------ me


async def test_me_with_valid_token(
    client: httpx.AsyncClient, api: str, registered_user: dict
) -> None:
    token = (await login(client, api)).json()["access_token"]

    response = await client.get(f"{api}/auth/me", headers=auth_header(token))
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "ayesha@example.com"
    assert body["full_name"] == "Ayesha Khan"
    assert body["role"] == "user"
    assert body["id"] == registered_user["id"]
    assert "password_hash" not in body


async def test_me_without_token_returns_401_not_403(
    client: httpx.AsyncClient, api: str
) -> None:
    response = await client.get(f"{api}/auth/me")
    assert response.status_code == 401
    assert response.headers.get("WWW-Authenticate") == "Bearer"


async def test_me_with_garbage_token(client: httpx.AsyncClient, api: str) -> None:
    response = await client.get(f"{api}/auth/me", headers=auth_header("not.a.jwt"))
    assert response.status_code == 401
    assert response.headers.get("WWW-Authenticate") == "Bearer"


async def test_me_with_token_signed_by_another_key(
    client: httpx.AsyncClient, api: str, registered_user: dict
) -> None:
    now = datetime.now(timezone.utc)
    forged = jwt.encode(
        {
            "sub": registered_user["id"],
            "jti": "forged",
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(hours=1)).timestamp()),
        },
        "a-completely-different-signing-key-value",
        algorithm="HS256",
    )
    response = await client.get(f"{api}/auth/me", headers=auth_header(forged))
    assert response.status_code == 401


async def test_me_with_expired_token(
    client: httpx.AsyncClient, api: str, registered_user: dict
) -> None:
    from app.core.config import settings

    now = datetime.now(timezone.utc)
    expired = jwt.encode(
        {
            "sub": registered_user["id"],
            "jti": "expired-token",
            "iat": int((now - timedelta(hours=2)).timestamp()),
            "exp": int((now - timedelta(hours=1)).timestamp()),
        },
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )
    response = await client.get(f"{api}/auth/me", headers=auth_header(expired))
    assert response.status_code == 401


async def test_me_with_token_for_a_deleted_user(
    client: httpx.AsyncClient, api: str, registered_user: dict
) -> None:
    from bson import ObjectId

    from app.db.mongo import get_users_collection

    token = (await login(client, api)).json()["access_token"]
    await get_users_collection().delete_one({"_id": ObjectId(registered_user["id"])})

    response = await client.get(f"{api}/auth/me", headers=auth_header(token))
    assert response.status_code == 401


# -------------------------------------------------------------------------- logout


async def test_logout_revokes_the_token(
    client: httpx.AsyncClient, api: str, registered_user: dict
) -> None:
    token = (await login(client, api)).json()["access_token"]

    assert (await client.get(f"{api}/auth/me", headers=auth_header(token))).status_code == 200

    logout = await client.post(f"{api}/auth/logout", headers=auth_header(token))
    assert logout.status_code == 204

    after = await client.get(f"{api}/auth/me", headers=auth_header(token))
    assert after.status_code == 401
    assert after.json()["error"]["message"] == "Token has been revoked."


async def test_logout_requires_a_token(client: httpx.AsyncClient, api: str) -> None:
    response = await client.post(f"{api}/auth/logout")
    assert response.status_code == 401


async def test_logout_twice_is_rejected_the_second_time(
    client: httpx.AsyncClient, api: str, registered_user: dict
) -> None:
    token = (await login(client, api)).json()["access_token"]
    assert (await client.post(f"{api}/auth/logout", headers=auth_header(token))).status_code == 204
    assert (await client.post(f"{api}/auth/logout", headers=auth_header(token))).status_code == 401


async def test_logout_does_not_affect_other_sessions(
    client: httpx.AsyncClient, api: str, registered_user: dict
) -> None:
    first = (await login(client, api)).json()["access_token"]
    second = (await login(client, api)).json()["access_token"]
    assert first != second

    assert (await client.post(f"{api}/auth/logout", headers=auth_header(first))).status_code == 204

    assert (await client.get(f"{api}/auth/me", headers=auth_header(first))).status_code == 401
    assert (await client.get(f"{api}/auth/me", headers=auth_header(second))).status_code == 200


async def test_revoked_token_is_stored_with_its_expiry(
    client: httpx.AsyncClient, api: str, registered_user: dict
) -> None:
    from app.db.mongo import get_revoked_tokens_collection

    token = (await login(client, api)).json()["access_token"]
    claims = jwt.decode(token, options={"verify_signature": False})

    await client.post(f"{api}/auth/logout", headers=auth_header(token))

    record = await get_revoked_tokens_collection().find_one({"jti": claims["jti"]})
    assert record is not None
    expires_at = record["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    assert int(expires_at.timestamp()) == claims["exp"]
