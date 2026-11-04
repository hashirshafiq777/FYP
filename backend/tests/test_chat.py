"""Module 2 — RAG chat.

The language model and the vector store are replaced with fakes here: the suite
must run offline, without an API key and without the embedding model download.
What is tested is everything around them — ownership, persistence, the error
contract, language detection and the retrieval-to-prompt plumbing.
"""

from __future__ import annotations

import httpx
import pytest
from bson import ObjectId

from app.ai.llm import LLMUnavailable, Message
from app.ai.vector_store import Hit

PASSWORD = "S3cure-pass!"


async def register_and_login(client: httpx.AsyncClient, api: str, email: str, name: str) -> dict:
    signup = await client.post(
        f"{api}/auth/signup", json={"full_name": name, "email": email, "password": PASSWORD}
    )
    assert signup.status_code == 201, signup.text
    login = await client.post(f"{api}/auth/login", json={"email": email, "password": PASSWORD})
    assert login.status_code == 200, login.text
    account = signup.json()
    account["headers"] = {"Authorization": f"Bearer {login.json()['access_token']}"}
    return account


@pytest.fixture
async def alice(client: httpx.AsyncClient, api: str) -> dict:
    return await register_and_login(client, api, "alice@example.com", "Alice Owner")


@pytest.fixture
async def bob(client: httpx.AsyncClient, api: str) -> dict:
    return await register_and_login(client, api, "bob@example.com", "Bob Intruder")


FAKE_HITS = [
    Hit(
        id="ppc-0302",
        text="302. Punishment of qatl-i-amd. Whoever commits qatl-e-amd shall, subject to the "
        "provisions of this Chapter be punished with death as qisas, or imprisonment for life as tazir.",
        metadata={
            "title": "Pakistan Penal Code (PPC),1860",
            "section": "302",
            "kind": "statute",
            "category": "criminal",
            "url": "https://pakistancode.gov.pk/english/x",
        },
        score=0.81,
    ),
    Hit(
        id="case-asia-bibi-0000",
        text="The Supreme Court acquitted Asia Bibi, holding the prosecution had not proved its case.",
        metadata={"title": "Asia Bibi v. The State", "kind": "case", "category": "cases", "url": ""},
        score=0.62,
    ),
]


@pytest.fixture
def fake_ai(monkeypatch: pytest.MonkeyPatch) -> dict:
    """Stub retrieval and generation; record what the model was asked."""
    from app.services import chat_service, knowledge_service

    calls: dict = {"prompts": []}

    async def fake_retrieve_law(question: str, *, k: int | None = None, rewrite=None) -> list[Hit]:
        calls["question"] = question
        return FAKE_HITS

    async def no_rewrite(question: str):
        return None

    async def fake_generate(messages: list[Message], **_: object) -> tuple[str, str]:
        calls["prompts"].append(messages)
        return (
            "Under the Pakistan Penal Code, murder is punished with death or life imprisonment "
            "[Pakistan Penal Code s. 302].",
            "fake",
        )

    monkeypatch.setattr(knowledge_service, "retrieve_law", fake_retrieve_law)
    monkeypatch.setattr(chat_service.query_rewrite, "rewrite", no_rewrite)
    monkeypatch.setattr(chat_service.llm, "generate", fake_generate)
    return calls


# ------------------------------------------------------------------ asking


async def test_ask_creates_a_conversation_and_stores_both_turns(
    client: httpx.AsyncClient, api: str, alice: dict, fake_ai: dict
) -> None:
    response = await client.post(
        f"{api}/chat/ask",
        headers=alice["headers"],
        json={"question": "What is the punishment for murder?"},
    )
    assert response.status_code == 200, response.text
    body = response.json()

    assert body["conversation"]["mode"] == "law"
    assert body["conversation"]["language"] == "en"
    assert body["conversation"]["message_count"] == 2
    assert body["question"]["role"] == "user"
    assert body["answer"]["role"] == "assistant"
    assert body["answer"]["provider"] == "fake"
    assert "[Pakistan Penal Code s. 302]" in body["answer"]["content"]

    # The retrieved passages come back as citeable sources.
    labels = [source["label"] for source in body["answer"]["sources"]]
    assert labels == ["Pakistan Penal Code s. 302", "Case: Asia Bibi v. The State"]
    assert body["answer"]["sources"][0]["kind"] == "statute"
    assert body["answer"]["sources"][1]["kind"] == "case"

    # ...and they were actually in the prompt the model saw.
    last_prompt = fake_ai["prompts"][-1]
    assert last_prompt[0].role == "system"
    assert "English" in last_prompt[0].content
    assert "qatl-e-amd" in last_prompt[-1].content
    assert "What is the punishment for murder?" in last_prompt[-1].content

    # Persisted, owner-scoped.
    from app.db.mongo import get_conversations_collection, get_messages_collection

    stored = await get_conversations_collection().find_one({"_id": ObjectId(body["conversation"]["id"])})
    assert stored is not None and stored["owner_id"] == ObjectId(alice["id"])
    assert await get_messages_collection().count_documents({"owner_id": ObjectId(alice["id"])}) == 2


async def test_follow_up_reuses_the_conversation_and_sends_history(
    client: httpx.AsyncClient, api: str, alice: dict, fake_ai: dict
) -> None:
    first = await client.post(
        f"{api}/chat/ask", headers=alice["headers"], json={"question": "Section 302 PPC ki saza kya hai?"}
    )
    conversation_id = first.json()["conversation"]["id"]
    assert first.json()["conversation"]["language"] == "roman-ur"

    second = await client.post(
        f"{api}/chat/ask",
        headers=alice["headers"],
        json={"question": "aur section 303?", "conversation_id": conversation_id},
    )
    assert second.status_code == 200, second.text
    assert second.json()["conversation"]["id"] == conversation_id
    assert second.json()["conversation"]["message_count"] == 4

    # The second prompt carries the first exchange as history.
    roles = [m.role for m in fake_ai["prompts"][-1]]
    assert roles == ["system", "user", "assistant", "user"]

    detail = await client.get(f"{api}/chat/conversations/{conversation_id}", headers=alice["headers"])
    assert detail.status_code == 200
    assert [m["role"] for m in detail.json()["messages"]] == ["user", "assistant", "user", "assistant"]


async def test_urdu_script_question_is_answered_in_urdu_mode(
    client: httpx.AsyncClient, api: str, alice: dict, fake_ai: dict
) -> None:
    response = await client.post(
        f"{api}/chat/ask", headers=alice["headers"], json={"question": "قتل کی سزا کیا ہے؟"}
    )
    assert response.status_code == 200
    assert response.json()["conversation"]["language"] == "ur"
    assert "Urdu script" in fake_ai["prompts"][-1][0].content


async def test_llm_outage_is_a_503_and_stores_nothing(
    client: httpx.AsyncClient, api: str, alice: dict, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.services import chat_service, knowledge_service

    async def fake_retrieve_law(question: str, *, k: int | None = None, rewrite=None) -> list[Hit]:
        return FAKE_HITS

    async def no_rewrite(question: str):
        return None

    monkeypatch.setattr(chat_service.query_rewrite, "rewrite", no_rewrite)

    async def broken_generate(messages: list[Message], **_: object) -> tuple[str, str]:
        raise LLMUnavailable("groq: 401")

    monkeypatch.setattr(knowledge_service, "retrieve_law", fake_retrieve_law)
    monkeypatch.setattr(chat_service.llm, "generate", broken_generate)

    response = await client.post(f"{api}/chat/ask", headers=alice["headers"], json={"question": "Hello?"})
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "ai_unavailable"

    from app.db.mongo import get_messages_collection

    assert await get_messages_collection().count_documents({}) == 0


async def test_blank_question_is_rejected(client: httpx.AsyncClient, api: str, alice: dict) -> None:
    response = await client.post(f"{api}/chat/ask", headers=alice["headers"], json={"question": "   "})
    assert response.status_code == 422


async def test_chat_requires_a_token(client: httpx.AsyncClient, api: str) -> None:
    assert (await client.post(f"{api}/chat/ask", json={"question": "x"})).status_code == 401
    assert (await client.get(f"{api}/chat/conversations")).status_code == 401
    assert (await client.get(f"{api}/chat/status")).status_code == 401


# --------------------------------------------------------------- isolation


async def test_conversations_are_private_to_their_owner(
    client: httpx.AsyncClient, api: str, alice: dict, bob: dict, fake_ai: dict
) -> None:
    created = await client.post(f"{api}/chat/ask", headers=alice["headers"], json={"question": "Theft?"})
    conversation_id = created.json()["conversation"]["id"]

    # Bob cannot list, read, continue, rename or delete Alice's thread.
    listing = await client.get(f"{api}/chat/conversations", headers=bob["headers"])
    assert listing.json() == {"items": [], "total": 0}

    assert (
        await client.get(f"{api}/chat/conversations/{conversation_id}", headers=bob["headers"])
    ).status_code == 404
    assert (
        await client.post(
            f"{api}/chat/ask",
            headers=bob["headers"],
            json={"question": "and?", "conversation_id": conversation_id},
        )
    ).status_code == 404
    assert (
        await client.patch(
            f"{api}/chat/conversations/{conversation_id}", headers=bob["headers"], json={"title": "Mine"}
        )
    ).status_code == 404
    assert (
        await client.delete(f"{api}/chat/conversations/{conversation_id}", headers=bob["headers"])
    ).status_code == 404

    # Still there for Alice, untouched.
    mine = await client.get(f"{api}/chat/conversations/{conversation_id}", headers=alice["headers"])
    assert mine.status_code == 200
    assert len(mine.json()["messages"]) == 2


async def test_delete_removes_the_thread_and_its_messages(
    client: httpx.AsyncClient, api: str, alice: dict, fake_ai: dict
) -> None:
    created = await client.post(f"{api}/chat/ask", headers=alice["headers"], json={"question": "Khula?"})
    conversation_id = created.json()["conversation"]["id"]

    renamed = await client.patch(
        f"{api}/chat/conversations/{conversation_id}", headers=alice["headers"], json={"title": "Khula"}
    )
    assert renamed.status_code == 200 and renamed.json()["title"] == "Khula"

    deleted = await client.delete(f"{api}/chat/conversations/{conversation_id}", headers=alice["headers"])
    assert deleted.status_code == 204

    from app.db.mongo import get_messages_collection

    assert await get_messages_collection().count_documents({}) == 0
    assert (
        await client.get(f"{api}/chat/conversations/{conversation_id}", headers=alice["headers"])
    ).status_code == 404


async def test_malformed_conversation_id_is_a_404_not_a_500(
    client: httpx.AsyncClient, api: str, alice: dict
) -> None:
    response = await client.get(f"{api}/chat/conversations/not-an-object-id", headers=alice["headers"])
    assert response.status_code == 404


# ------------------------------------------------------------------ status


async def test_status_reports_providers_and_index_size(
    client: httpx.AsyncClient, api: str, alice: dict, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.services import chat_service, knowledge_service

    monkeypatch.setattr(chat_service.llm, "configured_providers", lambda: ["groq"])
    monkeypatch.setattr(knowledge_service, "law_chunk_count", lambda: 1234)

    response = await client.get(f"{api}/chat/status", headers=alice["headers"])
    assert response.status_code == 200
    body = response.json()
    assert body["providers"] == ["groq"]
    assert body["law_chunks"] == 1234
    assert body["ready"] is True

    monkeypatch.setattr(knowledge_service, "law_chunk_count", lambda: 0)
    assert (await client.get(f"{api}/chat/status", headers=alice["headers"])).json()["ready"] is False


# ------------------------------------------------------------- pure units


@pytest.mark.parametrize(
    ("question", "expected"),
    [
        ("What is the punishment for theft?", "en"),
        ("The main issue in this case is bail.", "en"),
        ("Section 302 PPC ki saza kya hai?", "roman-ur"),
        ("mujhe khula lena hai kaise karun", "roman-ur"),
        ("nikah ke liye age kitni honi chahiye", "roman-ur"),
        ("طلاق کا طریقہ کیا ہے", "ur"),
        ("kya police bina warrant ke arrest کر سکتی ہے", "ur"),
    ],
)
def test_language_detection(question: str, expected: str) -> None:
    from app.ai.language import detect

    assert detect(question) == expected


def test_chunking_keeps_section_numbers_and_splits_long_sections() -> None:
    from app.ai.chunking import chunk_text

    text = (
        "PRELIMINARY\n1. Short title. This Act may be called the Test Act.\n"
        "2. Definitions. In this Act " + "word " * 500 + "\n"
        "302. Punishment of qatl-i-amd. Whoever commits qatl-e-amd shall be punished.\n"
        "303. Qatl under ikrah. Text."
    )
    chunks = chunk_text(text, chunk_chars=1000, overlap_chars=100)

    sections = [chunk.section for chunk in chunks]
    assert "2" in sections and "302" in sections
    assert all(len(chunk.text) <= 1000 + 50 for chunk in chunks)
    # Sections 302 and 303 are short, so they are packed into one chunk
    # whose label is the first section in it.
    last = chunks[-1]
    assert last.section == "302" and "303." in last.text


def test_section_boost_merges_exact_matches_first(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.services import knowledge_service

    dense = [Hit(id="a", text="a", metadata={"section": "1"}, score=0.9)]
    lexical = [Hit(id="c", text="c", metadata={"section": "9"}, score=3.0)]
    exact = [
        Hit(id="b2", text="b2", metadata={"section": "302", "title": "Companies Act, 2017"}, score=0.6),
        Hit(id="b", text="b", metadata={"section": "302", "title": "Pakistan Penal Code (PPC),1860"}, score=0.5),
    ]

    monkeypatch.setattr(knowledge_service.embeddings, "embed_query", lambda text: [0.0])
    monkeypatch.setattr(knowledge_service, "_lexical", lambda query, k: lexical)

    def fake_query(name: str, vector: list[float], *, k: int = 8, where=None, where_document=None):
        return exact if where else dense

    monkeypatch.setattr(knowledge_service.vector_store, "query", fake_query)

    # "PPC" in the question puts the Penal Code's s. 302 ahead of the Companies Act's.
    hits = knowledge_service._retrieve_law_sync("what does section 302 PPC say", 8)  # noqa: SLF001
    assert [hit.id for hit in hits] == ["b", "b2", "a", "c"]

    # Without a section number, dense and lexical results are fused.
    hits = knowledge_service._retrieve_law_sync("no numbers here", 8)  # noqa: SLF001
    assert sorted(hit.id for hit in hits) == ["a", "c"]


def test_glossary_expands_roman_urdu_into_statute_vocabulary() -> None:
    from app.ai.glossary import expand

    expanded = expand("khula kaise lete hain aur mehr ka kya hoga")
    assert "dissolution" in expanded and "dower" in expanded
    # Plain English is left alone.
    assert expand("What is the punishment for criminal breach of trust?") == ""
