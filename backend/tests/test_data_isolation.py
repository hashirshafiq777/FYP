"""M1-T7 — User Data Isolation.

Completion check from the milestone:
    "Account A cannot read, modify or delete account B records."

So every test here uses two real accounts with two real tokens and has one try to
reach the other's records directly over the API.

A record owned by someone else comes back as **404, not 403**. 403 would confirm
the id exists, which makes the endpoint an oracle for enumerating other people's
data; a flat 404 is indistinguishable from "no such id".
"""

from __future__ import annotations

import httpx
import pytest
from bson import ObjectId

PASSWORD = "S3cure-pass!"


async def register_and_login(
    client: httpx.AsyncClient, api: str, email: str, name: str
) -> dict:
    signup = await client.post(
        f"{api}/auth/signup",
        json={"full_name": name, "email": email, "password": PASSWORD},
    )
    assert signup.status_code == 201, signup.text

    login = await client.post(
        f"{api}/auth/login", json={"email": email, "password": PASSWORD}
    )
    assert login.status_code == 200, login.text

    account = signup.json()
    account["token"] = login.json()["access_token"]
    account["headers"] = {"Authorization": f"Bearer {account['token']}"}
    return account


@pytest.fixture
async def alice(client: httpx.AsyncClient, api: str) -> dict:
    return await register_and_login(client, api, "alice@example.com", "Alice Owner")


@pytest.fixture
async def bob(client: httpx.AsyncClient, api: str) -> dict:
    return await register_and_login(client, api, "bob@example.com", "Bob Intruder")


async def create_document(
    client: httpx.AsyncClient, api: str, account: dict, title: str = "Private Lease"
) -> dict:
    response = await client.post(
        f"{api}/documents",
        headers=account["headers"],
        json={"title": title, "language": "en", "doc_type": "contract"},
    )
    assert response.status_code == 201, response.text
    return response.json()


# ------------------------------------------------------------- ownership basics


async def test_creating_a_document_assigns_the_caller_as_owner(
    client: httpx.AsyncClient, api: str, alice: dict
) -> None:
    from app.db.mongo import get_documents_collection

    created = await create_document(client, api, alice)

    stored = await get_documents_collection().find_one({"_id": ObjectId(created["id"])})
    assert stored is not None
    # Stored as an ObjectId, not a string, so it joins against users._id.
    assert stored["owner_id"] == ObjectId(alice["id"])
    assert stored["created_at"] is not None


async def test_owner_id_is_never_returned_to_the_client(
    client: httpx.AsyncClient, api: str, alice: dict
) -> None:
    response = await client.post(
        f"{api}/documents",
        headers=alice["headers"],
        json={"title": "Private Lease"},
    )
    assert response.status_code == 201
    assert "owner_id" not in response.json()
    assert alice["id"] not in response.text


async def test_owner_id_cannot_be_supplied_by_the_caller(
    client: httpx.AsyncClient, api: str, alice: dict, bob: dict
) -> None:
    """Ownership comes from the session, never the request body."""
    response = await client.post(
        f"{api}/documents",
        headers=alice["headers"],
        json={"title": "Smuggled", "owner_id": bob["id"]},
    )
    assert response.status_code == 422


# -------------------------------------------------------------- list isolation


async def test_each_account_lists_only_its_own_documents(
    client: httpx.AsyncClient, api: str, alice: dict, bob: dict
) -> None:
    await create_document(client, api, alice, "Alice lease")
    await create_document(client, api, alice, "Alice policy")
    await create_document(client, api, bob, "Bob contract")

    alice_list = await client.get(f"{api}/documents", headers=alice["headers"])
    bob_list = await client.get(f"{api}/documents", headers=bob["headers"])

    assert alice_list.status_code == 200
    assert bob_list.status_code == 200

    assert {item["title"] for item in alice_list.json()["items"]} == {
        "Alice lease",
        "Alice policy",
    }
    assert {item["title"] for item in bob_list.json()["items"]} == {"Bob contract"}


async def test_the_total_count_is_owner_scoped_not_global(
    client: httpx.AsyncClient, api: str, alice: dict, bob: dict
) -> None:
    """A global count would leak how much other people have stored."""
    for index in range(3):
        await create_document(client, api, alice, f"Alice {index}")
    await create_document(client, api, bob, "Bob only")

    assert (await client.get(f"{api}/documents", headers=alice["headers"])).json()[
        "total"
    ] == 3
    assert (await client.get(f"{api}/documents", headers=bob["headers"])).json()[
        "total"
    ] == 1


async def test_a_new_account_sees_an_empty_list(
    client: httpx.AsyncClient, api: str, alice: dict, bob: dict
) -> None:
    await create_document(client, api, alice, "Alice lease")

    response = await client.get(f"{api}/documents", headers=bob["headers"])
    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0}


# ------------------------------------- the milestone check: read, modify, delete


async def test_account_b_cannot_read_account_a_record(
    client: httpx.AsyncClient, api: str, alice: dict, bob: dict
) -> None:
    document = await create_document(client, api, alice, "Alice confidential")

    response = await client.get(f"{api}/documents/{document['id']}", headers=bob["headers"])

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"
    # Nothing about the record leaks through the error.
    assert "Alice confidential" not in response.text


async def test_account_b_cannot_modify_account_a_record(
    client: httpx.AsyncClient, api: str, alice: dict, bob: dict
) -> None:
    document = await create_document(client, api, alice, "Alice original")

    response = await client.patch(
        f"{api}/documents/{document['id']}",
        headers=bob["headers"],
        json={"title": "Bob was here"},
    )
    assert response.status_code == 404

    # And the record really is untouched.
    unchanged = await client.get(
        f"{api}/documents/{document['id']}", headers=alice["headers"]
    )
    assert unchanged.status_code == 200
    assert unchanged.json()["title"] == "Alice original"


async def test_account_b_cannot_delete_account_a_record(
    client: httpx.AsyncClient, api: str, alice: dict, bob: dict
) -> None:
    document = await create_document(client, api, alice, "Alice keeps this")

    response = await client.delete(
        f"{api}/documents/{document['id']}", headers=bob["headers"]
    )
    assert response.status_code == 404

    # And it is still there afterwards.
    survivor = await client.get(
        f"{api}/documents/{document['id']}", headers=alice["headers"]
    )
    assert survivor.status_code == 200


@pytest.mark.parametrize(
    ("method", "payload"),
    [("GET", None), ("PATCH", {"title": "x"}), ("DELETE", None)],
)
async def test_every_verb_is_owner_scoped(
    client: httpx.AsyncClient,
    api: str,
    alice: dict,
    bob: dict,
    method: str,
    payload: dict | None,
) -> None:
    """No verb may be left unguarded — the whole surface is checked, not a sample."""
    document = await create_document(client, api, alice)

    response = await client.request(
        method,
        f"{api}/documents/{document['id']}",
        headers=bob["headers"],
        json=payload,
    )
    assert response.status_code == 404, f"{method} leaked another user's record"


# ------------------------------------------------------- the owner can do it all


async def test_the_owner_can_read_update_and_delete_their_own_record(
    client: httpx.AsyncClient, api: str, alice: dict
) -> None:
    document = await create_document(client, api, alice, "Mine")

    read = await client.get(f"{api}/documents/{document['id']}", headers=alice["headers"])
    assert read.status_code == 200
    assert read.json()["title"] == "Mine"

    updated = await client.patch(
        f"{api}/documents/{document['id']}",
        headers=alice["headers"],
        json={"title": "Mine, renamed", "language": "ur"},
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Mine, renamed"
    assert updated.json()["language"] == "ur"
    assert updated.json()["updated_at"] >= updated.json()["created_at"]

    deleted = await client.delete(
        f"{api}/documents/{document['id']}", headers=alice["headers"]
    )
    assert deleted.status_code == 204

    gone = await client.get(f"{api}/documents/{document['id']}", headers=alice["headers"])
    assert gone.status_code == 404


async def test_identical_titles_across_accounts_stay_separate(
    client: httpx.AsyncClient, api: str, alice: dict, bob: dict
) -> None:
    """Same title, different owners — deleting one must not touch the other."""
    alice_doc = await create_document(client, api, alice, "Rental Agreement")
    bob_doc = await create_document(client, api, bob, "Rental Agreement")
    assert alice_doc["id"] != bob_doc["id"]

    assert (
        await client.delete(f"{api}/documents/{alice_doc['id']}", headers=alice["headers"])
    ).status_code == 204

    still_there = await client.get(
        f"{api}/documents/{bob_doc['id']}", headers=bob["headers"]
    )
    assert still_there.status_code == 200


# ----------------------------------------------------- admins are not exempt


async def test_an_admin_cannot_read_another_users_private_documents(
    client: httpx.AsyncClient, api: str, alice: dict, bob: dict
) -> None:
    """Admins manage the shared knowledge base, not users' private records.

    The product's promise is that uploaded contracts are confidential; an admin
    override would quietly break it, so ownership is not role-aware.
    """
    from app.db.mongo import get_users_collection

    document = await create_document(client, api, alice, "Alice private")
    await get_users_collection().update_one(
        {"email": "bob@example.com"}, {"$set": {"role": "admin"}}
    )

    # Confirm Bob really is an admin now.
    me = await client.get(f"{api}/auth/me", headers=bob["headers"])
    assert me.json()["role"] == "admin"

    assert (
        await client.get(f"{api}/documents/{document['id']}", headers=bob["headers"])
    ).status_code == 404
    assert (
        await client.get(f"{api}/documents", headers=bob["headers"])
    ).json()["total"] == 0


# ------------------------------------------------------------ auth is required


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("GET", "/documents", None),
        ("POST", "/documents", {"title": "x"}),
        ("GET", "/documents/{id}", None),
        ("PATCH", "/documents/{id}", {"title": "x"}),
        ("DELETE", "/documents/{id}", None),
    ],
)
async def test_documents_require_authentication(
    client: httpx.AsyncClient,
    api: str,
    alice: dict,
    method: str,
    path: str,
    payload: dict | None,
) -> None:
    document = await create_document(client, api, alice)
    url = f"{api}{path.format(id=document['id'])}"

    response = await client.request(method, url, json=payload)

    assert response.status_code == 401
    assert response.headers.get("WWW-Authenticate") == "Bearer"


async def test_a_revoked_token_cannot_reach_documents(
    client: httpx.AsyncClient, api: str, alice: dict
) -> None:
    document = await create_document(client, api, alice)

    assert (
        await client.post(f"{api}/auth/logout", headers=alice["headers"])
    ).status_code == 204

    assert (
        await client.get(f"{api}/documents", headers=alice["headers"])
    ).status_code == 401
    assert (
        await client.get(f"{api}/documents/{document['id']}", headers=alice["headers"])
    ).status_code == 401


# ------------------------------------------------------------------ edge cases


async def test_a_malformed_id_is_404_not_a_server_error(
    client: httpx.AsyncClient, api: str, alice: dict
) -> None:
    response = await client.get(f"{api}/documents/not-an-object-id", headers=alice["headers"])
    assert response.status_code == 404


async def test_an_unknown_id_is_404(
    client: httpx.AsyncClient, api: str, alice: dict
) -> None:
    response = await client.get(f"{api}/documents/{ObjectId()}", headers=alice["headers"])
    assert response.status_code == 404


async def test_a_blank_title_is_rejected(
    client: httpx.AsyncClient, api: str, alice: dict
) -> None:
    response = await client.post(
        f"{api}/documents", headers=alice["headers"], json={"title": "   "}
    )
    assert response.status_code == 422


async def test_an_unknown_document_type_is_rejected(
    client: httpx.AsyncClient, api: str, alice: dict
) -> None:
    response = await client.post(
        f"{api}/documents",
        headers=alice["headers"],
        json={"title": "Thing", "doc_type": "spreadsheet"},
    )
    assert response.status_code == 422


async def test_a_new_document_starts_queued(
    client: httpx.AsyncClient, api: str, alice: dict
) -> None:
    """Extraction, OCR and indexing have not run yet — a later module sets this."""
    document = await create_document(client, api, alice)
    assert document["status"] == "queued"
