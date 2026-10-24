from __future__ import annotations

import httpx


async def test_health_reports_ok(client: httpx.AsyncClient, api: str) -> None:
    response = await client.get(f"{api}/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "database": "ok"}


async def test_health_returns_503_when_mongo_is_unreachable(
    client: httpx.AsyncClient, api: str, monkeypatch
) -> None:
    async def failing_command(*_args, **_kwargs):
        from pymongo.errors import ServerSelectionTimeoutError

        raise ServerSelectionTimeoutError("no server available")

    from app.db import mongo

    database = mongo.get_database()
    monkeypatch.setattr(database, "command", failing_command)

    response = await client.get(f"{api}/health")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "database_unavailable"
