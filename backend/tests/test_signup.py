from __future__ import annotations

import httpx
import pytest


async def test_signup_creates_user_and_normalises_email(
    client: httpx.AsyncClient, api: str
) -> None:
    response = await client.post(
        f"{api}/auth/signup",
        json={
            "full_name": "  Ayesha Khan  ",
            "email": "Ayesha@Example.com",
            "password": "S3cure-pass!",
        },
    )
    assert response.status_code == 201
    body = response.json()

    assert body["full_name"] == "Ayesha Khan"   # trimmed
    assert body["email"] == "ayesha@example.com"  # lowercased
    assert body["role"] == "user"
    assert body["id"]
    assert body["created_at"]

    # Nothing password-shaped ever leaves the API.
    assert "password" not in body
    assert "password_hash" not in body
    assert "argon2" not in response.text


async def test_signup_rejects_duplicate_email(client: httpx.AsyncClient, api: str) -> None:
    payload = {
        "full_name": "Ayesha Khan",
        "email": "ayesha@example.com",
        "password": "S3cure-pass!",
    }
    assert (await client.post(f"{api}/auth/signup", json=payload)).status_code == 201

    response = await client.post(f"{api}/auth/signup", json=payload)
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "email_already_registered"


async def test_signup_duplicate_check_is_case_insensitive(
    client: httpx.AsyncClient, api: str
) -> None:
    first = await client.post(
        f"{api}/auth/signup",
        json={
            "full_name": "Ayesha Khan",
            "email": "ayesha@example.com",
            "password": "S3cure-pass!",
        },
    )
    assert first.status_code == 201

    second = await client.post(
        f"{api}/auth/signup",
        json={
            "full_name": "Ayesha Khan",
            "email": "AYESHA@Example.COM",
            "password": "S3cure-pass!",
        },
    )
    assert second.status_code == 409


async def test_signup_cannot_set_role(client: httpx.AsyncClient, api: str) -> None:
    response = await client.post(
        f"{api}/auth/signup",
        json={
            "full_name": "Sneaky User",
            "email": "sneaky@example.com",
            "password": "S3cure-pass!",
            "role": "admin",
        },
    )
    # `extra="forbid"` rejects the attempt outright rather than silently dropping it.
    assert response.status_code == 422


@pytest.mark.parametrize(
    ("payload", "label"),
    [
        (
            {"full_name": "Ayesha Khan", "email": "not-an-email", "password": "S3cure-pass!"},
            "bad email",
        ),
        (
            {"full_name": "Ayesha Khan", "email": "a@example.com", "password": "short"},
            "password under 8 characters",
        ),
        ({"email": "a@example.com", "password": "S3cure-pass!"}, "missing full_name"),
        (
            {"full_name": "   ", "email": "a@example.com", "password": "S3cure-pass!"},
            "blank full_name",
        ),
        (
            {"full_name": "A" * 101, "email": "a@example.com", "password": "S3cure-pass!"},
            "full_name over 100 characters",
        ),
        (
            {"full_name": "Ayesha Khan", "email": "a@example.com", "password": "x" * 129},
            "password over 128 characters",
        ),
    ],
)
async def test_signup_rejects_invalid_payloads(
    client: httpx.AsyncClient, api: str, payload: dict, label: str
) -> None:
    response = await client.post(f"{api}/auth/signup", json=payload)
    assert response.status_code == 422, f"expected 422 for {label}"
    assert response.json()["error"]["code"] == "validation_error"
