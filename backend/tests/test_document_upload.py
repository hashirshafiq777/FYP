"""Module 3 — document upload, text extraction, OCR, and chat over a document.

The vision model, the language model and the embedding model are replaced with
fakes: the suite must run offline and without an API key. What is tested is the
pipeline around them — type detection, the status the record ends in, what is
stored, ownership, and what the chat model is actually shown.
"""

from __future__ import annotations

import io
import json
from pathlib import Path

import httpx
import pytest
from bson import ObjectId

from app.ai.llm import LLMUnavailable, Message

PASSWORD = "S3cure-pass!"

CNIC_TEXT = (
    "PAKISTAN National Identity Card\n"
    "Name: Muhammad Ali\n"
    "Father Name: Ahmed Khan\n"
    "Gender: M\n"
    "Identity Number: 42101-1234567-1\n"
    "Date of Birth: 14.08.1995\n"
    "Date of Issue: 01.01.2020\n"
    "Date of Expiry: 01.01.2030"
)

FIELDS_REPLY = json.dumps(
    {
        "kind": "cnic",
        "title": "CNIC - Muhammad Ali",
        "summary": "A Pakistani national identity card.",
        "fields": [
            {"key": "full_name", "label": "Name", "value": "Muhammad Ali"},
            {"key": "father_name", "label": "Father's name", "value": "Ahmed Khan"},
            {"key": "cnic_number", "label": "CNIC number", "value": "42101-1234567-1"},
            {"key": "date_of_birth", "label": "Date of birth", "value": "14.08.1995"},
            {"key": "empty", "label": "Empty", "value": ""},
        ],
    }
)


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


@pytest.fixture
def pipeline(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> dict:
    """Fake the three models and keep uploaded files in a temp directory."""
    from app.services import document_processing, document_service, knowledge_service

    calls: dict = {"ocr": [], "indexed": [], "deleted_chunks": [], "ocr_text": CNIC_TEXT}

    async def fake_read_image(image: bytes, mime: str = "image/jpeg", **_: object) -> tuple[str, str]:
        calls["ocr"].append((len(image), mime))
        if calls["ocr_text"] is None:
            raise LLMUnavailable("groq: GROQ_API_KEY is not set")
        return calls["ocr_text"], "fake-vision"

    async def fake_generate(messages: list[Message], **_: object) -> tuple[str, str]:
        calls["fields_prompt"] = messages[-1].content
        return FIELDS_REPLY, "fake"

    def fake_index(owner_id: str, document_id: str, title: str, pages: list[tuple[int, str]]) -> int:
        calls["indexed"].append({"owner_id": owner_id, "document_id": document_id, "title": title, "pages": pages})
        return len(pages)

    def fake_delete_chunks(owner_id: str, document_id: str) -> None:
        calls["deleted_chunks"].append((owner_id, document_id))

    monkeypatch.setattr(document_processing.vision, "read_image", fake_read_image)
    monkeypatch.setattr(document_processing.field_extraction.llm, "generate", fake_generate)
    monkeypatch.setattr(knowledge_service, "index_document", fake_index)
    monkeypatch.setattr(knowledge_service, "delete_document_chunks", fake_delete_chunks)
    monkeypatch.setattr(document_service, "uploads_dir", lambda: tmp_path)
    calls["dir"] = tmp_path
    return calls


# ----------------------------------------------------------------- file makers


def make_pdf(*page_texts: str) -> bytes:
    """A PDF with one page per string; an empty string makes a page with no text layer."""
    import pymupdf

    document = pymupdf.open()
    for text in page_texts:
        page = document.new_page()
        if text:
            page.insert_textbox(pymupdf.Rect(50, 50, 545, 790), text, fontsize=11)
    data = document.tobytes()
    document.close()
    return data


def make_png() -> bytes:
    from PIL import Image

    out = io.BytesIO()
    Image.new("RGB", (640, 400), "white").save(out, format="PNG")
    return out.getvalue()


def make_docx() -> bytes:
    import docx

    document = docx.Document()
    document.add_paragraph("RENT AGREEMENT")
    document.add_paragraph("This agreement is made between Ali Raza (landlord) and Bilal Ahmed (tenant).")
    table = document.add_table(rows=1, cols=2)
    table.rows[0].cells[0].text = "Monthly rent"
    table.rows[0].cells[1].text = "Rs. 45,000"
    out = io.BytesIO()
    document.save(out)
    return out.getvalue()


RENT_PAGE_1 = (
    "RENT AGREEMENT. This agreement is made on 1 January 2026 between Ali Raza, the landlord, "
    "and Bilal Ahmed, the tenant, for House 12, Block 5, Gulshan-e-Iqbal, Karachi."
)
RENT_PAGE_2 = "The monthly rent is Rs. 45,000, payable by the 5th of each month. Notice period: two months."


async def upload(
    client: httpx.AsyncClient,
    api: str,
    account: dict,
    data: bytes,
    filename: str,
    *,
    content_type: str = "application/octet-stream",
    title: str | None = None,
) -> httpx.Response:
    return await client.post(
        f"{api}/documents/upload",
        headers=account["headers"],
        files={"file": (filename, data, content_type)},
        data={"title": title} if title else None,
    )


# ---------------------------------------------------------------- extraction


async def test_pdf_with_text_is_extracted_page_by_page_without_ocr(
    client: httpx.AsyncClient, api: str, alice: dict, pipeline: dict
) -> None:
    response = await upload(client, api, alice, make_pdf(RENT_PAGE_1, RENT_PAGE_2), "rent_agreement-2026.pdf")
    assert response.status_code == 201, response.text
    created = response.json()
    assert created["filename"] == "rent_agreement-2026.pdf"
    assert created["content_type"] == "application/pdf"

    # The background task has run by the time the test client returns.
    detail = (await client.get(f"{api}/documents/{created['id']}", headers=alice["headers"])).json()
    assert detail["status"] == "ready" and detail["error"] is None
    assert detail["page_count"] == 2
    assert [page["page"] for page in detail["pages"]] == [1, 2]
    assert [page["method"] for page in detail["pages"]] == ["text", "text"]
    assert "Bilal Ahmed" in detail["pages"][0]["text"]
    assert "45,000" in detail["pages"][1]["text"]
    assert detail["ocr_used"] is False
    assert detail["char_count"] == sum(len(page["text"]) for page in detail["pages"])
    assert pipeline["ocr"] == []  # a text PDF never reaches the vision model

    # Indexed for the chat under the owner's id.
    assert pipeline["indexed"][0]["owner_id"] == alice["id"]
    assert [page for page, _ in pipeline["indexed"][0]["pages"]] == [1, 2]


async def test_photo_is_read_by_ocr_and_fields_are_extracted(
    client: httpx.AsyncClient, api: str, alice: dict, pipeline: dict
) -> None:
    response = await upload(client, api, alice, make_png(), "IMG_2041.png", content_type="image/png")
    assert response.status_code == 201, response.text
    assert response.json()["doc_type"] == "scan"

    detail = (await client.get(f"{api}/documents/{response.json()['id']}", headers=alice["headers"])).json()
    assert detail["status"] == "ready"
    assert detail["ocr_used"] is True
    assert detail["pages"] == [{"page": 1, "text": CNIC_TEXT, "method": "ocr"}]
    # The image is re-encoded as JPEG before it is sent.
    assert pipeline["ocr"][0][1] == "image/jpeg"

    # Fields come from the model's JSON; the empty one is dropped.
    assert detail["detected_kind"] == "cnic"
    assert detail["doc_type"] == "identity"
    assert detail["summary"] == "A Pakistani national identity card."
    fields = {field["key"]: field["value"] for field in detail["fields"]}
    assert fields == {
        "full_name": "Muhammad Ali",
        "father_name": "Ahmed Khan",
        "cnic_number": "42101-1234567-1",
        "date_of_birth": "14.08.1995",
    }
    assert detail["field_count"] == 4
    # No title was given, so the one read from the document replaces the filename.
    assert detail["title"] == "CNIC - Muhammad Ali"
    # The model was shown the OCR text, not asked to invent anything.
    assert "42101-1234567-1" in pipeline["fields_prompt"]


async def test_scanned_pdf_page_goes_to_ocr_and_text_pages_do_not(
    client: httpx.AsyncClient, api: str, alice: dict, pipeline: dict
) -> None:
    pipeline["ocr_text"] = "Scanned annexure: list of fixtures and fittings."
    response = await upload(client, api, alice, make_pdf(RENT_PAGE_1, ""), "scan.pdf", title="My lease")
    detail = (await client.get(f"{api}/documents/{response.json()['id']}", headers=alice["headers"])).json()

    assert detail["status"] == "ready"
    assert [page["method"] for page in detail["pages"]] == ["text", "ocr"]
    assert detail["pages"][1]["text"] == "Scanned annexure: list of fixtures and fittings."
    assert len(pipeline["ocr"]) == 1
    assert detail["ocr_used"] is True
    # A title the user typed is kept.
    assert detail["title"] == "My lease"


async def test_text_pages_survive_when_a_scanned_page_cannot_be_read(
    client: httpx.AsyncClient, api: str, alice: dict, pipeline: dict
) -> None:
    pipeline["ocr_text"] = None  # the vision model is down
    response = await upload(client, api, alice, make_pdf(RENT_PAGE_1, ""), "mixed.pdf")
    detail = (await client.get(f"{api}/documents/{response.json()['id']}", headers=alice["headers"])).json()

    # The readable page is kept and usable; the unread one is counted, not hidden.
    assert detail["status"] == "ready"
    assert [page["page"] for page in detail["pages"]] == [1]
    assert detail["page_count"] == 2 and detail["pages_unread"] == 1
    assert detail["ocr_used"] is False


async def test_docx_and_txt_are_read_directly(
    client: httpx.AsyncClient, api: str, alice: dict, pipeline: dict
) -> None:
    word = await upload(client, api, alice, make_docx(), "agreement.docx")
    assert word.status_code == 201, word.text
    detail = (await client.get(f"{api}/documents/{word.json()['id']}", headers=alice["headers"])).json()
    assert detail["status"] == "ready"
    text = detail["pages"][0]["text"]
    assert "RENT AGREEMENT" in text and "Bilal Ahmed" in text
    assert "Monthly rent | Rs. 45,000" in text  # table cells keep their row

    plain = await upload(client, api, alice, "معاہدہ کرایہ داری\nکرایہ دار: بلال احمد".encode("utf-8"), "urdu.txt")
    assert plain.status_code == 201, plain.text
    detail = (await client.get(f"{api}/documents/{plain.json()['id']}", headers=alice["headers"])).json()
    assert detail["status"] == "ready"
    assert detail["language"] == "ur"
    assert "بلال احمد" in detail["pages"][0]["text"]
    assert pipeline["ocr"] == []


async def test_photo_fails_clearly_when_the_vision_model_is_unavailable_and_can_be_retried(
    client: httpx.AsyncClient, api: str, alice: dict, pipeline: dict
) -> None:
    pipeline["ocr_text"] = None  # the provider is down / no key
    response = await upload(client, api, alice, make_png(), "card.png")
    document_id = response.json()["id"]

    detail = (await client.get(f"{api}/documents/{document_id}", headers=alice["headers"])).json()
    assert detail["status"] == "failed"
    assert detail["error"] == "ocr_unavailable"
    assert detail["pages"] == []

    # Once the model is back, the same file can be processed again.
    pipeline["ocr_text"] = CNIC_TEXT
    retry = await client.post(f"{api}/documents/{document_id}/reprocess", headers=alice["headers"])
    assert retry.status_code == 200, retry.text
    detail = (await client.get(f"{api}/documents/{document_id}", headers=alice["headers"])).json()
    assert detail["status"] == "ready" and detail["error"] is None
    assert detail["pages"][0]["text"] == CNIC_TEXT


async def test_blank_image_ends_as_no_text(
    client: httpx.AsyncClient, api: str, alice: dict, pipeline: dict
) -> None:
    pipeline["ocr_text"] = ""
    response = await upload(client, api, alice, make_png(), "blank.png")
    detail = (await client.get(f"{api}/documents/{response.json()['id']}", headers=alice["headers"])).json()
    assert detail["status"] == "failed" and detail["error"] == "no_text"


async def test_document_stays_ready_when_field_extraction_fails(
    client: httpx.AsyncClient, api: str, alice: dict, pipeline: dict, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.services import document_processing

    async def broken_generate(messages: list[Message], **_: object) -> tuple[str, str]:
        raise LLMUnavailable("groq: 429")

    monkeypatch.setattr(document_processing.field_extraction.llm, "generate", broken_generate)

    response = await upload(client, api, alice, make_pdf(RENT_PAGE_1), "lease.pdf")
    detail = (await client.get(f"{api}/documents/{response.json()['id']}", headers=alice["headers"])).json()
    assert detail["status"] == "ready"
    assert detail["fields"] == [] and detail["detected_kind"] is None
    assert detail["title"] == "lease"
    assert "Bilal Ahmed" in detail["pages"][0]["text"]


# ---------------------------------------------------------------- validation


async def test_unsupported_empty_and_oversized_files_are_refused(
    client: httpx.AsyncClient, api: str, alice: dict, pipeline: dict, monkeypatch: pytest.MonkeyPatch
) -> None:
    # An executable renamed to .pdf is judged by its bytes, not its name.
    fake_pdf = await upload(client, api, alice, b"MZ\x90\x00" + b"\x00" * 64, "invoice.pdf", content_type="application/pdf")
    assert fake_pdf.status_code == 415
    assert fake_pdf.json()["error"]["code"] == "unsupported_file_type"

    # A zip that is not a Word document.
    import zipfile

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("notes.txt", "hello")
    assert (await upload(client, api, alice, buffer.getvalue(), "archive.docx")).status_code == 415

    empty = await upload(client, api, alice, b"", "empty.pdf")
    assert empty.status_code == 422
    assert empty.json()["error"]["code"] == "empty_file"

    from app.core.config import settings

    monkeypatch.setattr(settings, "MAX_UPLOAD_MB", 1)
    too_big = await upload(client, api, alice, b"%PDF-1.7\n" + b"0" * (1024 * 1024 + 10), "big.pdf")
    assert too_big.status_code == 413
    assert too_big.json()["error"]["code"] == "file_too_large"

    # Nothing was stored for any of them.
    listing = (await client.get(f"{api}/documents", headers=alice["headers"])).json()
    assert listing == {"items": [], "total": 0}
    assert list(pipeline["dir"].rglob("*.*")) == []


async def test_corrupt_pdf_is_stored_but_marked_unreadable(
    client: httpx.AsyncClient, api: str, alice: dict, pipeline: dict
) -> None:
    response = await upload(client, api, alice, b"%PDF-1.7\nthis is not really a pdf", "broken.pdf")
    assert response.status_code == 201
    detail = (await client.get(f"{api}/documents/{response.json()['id']}", headers=alice["headers"])).json()
    assert detail["status"] == "failed" and detail["error"] == "unreadable"


async def test_upload_requires_a_token(client: httpx.AsyncClient, api: str) -> None:
    response = await client.post(f"{api}/documents/upload", files={"file": ("a.txt", b"hello", "text/plain")})
    assert response.status_code == 401


async def test_filename_never_becomes_a_path_on_disk(
    client: httpx.AsyncClient, api: str, alice: dict, pipeline: dict
) -> None:
    response = await upload(client, api, alice, b"hello world, this is a note", "..\\..\\..\\evil.txt")
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["filename"] == "evil.txt"

    stored = [path for path in pipeline["dir"].rglob("*") if path.is_file()]
    assert len(stored) == 1
    # <uploads>/<owner id>/<document id>.txt — nothing from the request.
    assert stored[0] == pipeline["dir"] / alice["id"] / f"{body['id']}.txt"


# ----------------------------------------------------------------- isolation


async def test_uploaded_documents_are_private_to_their_owner(
    client: httpx.AsyncClient, api: str, alice: dict, bob: dict, pipeline: dict
) -> None:
    response = await upload(client, api, alice, make_pdf(RENT_PAGE_1), "lease.pdf")
    document_id = response.json()["id"]

    assert (await client.get(f"{api}/documents", headers=bob["headers"])).json() == {"items": [], "total": 0}
    assert (await client.get(f"{api}/documents/{document_id}", headers=bob["headers"])).status_code == 404
    assert (
        await client.post(f"{api}/documents/{document_id}/reprocess", headers=bob["headers"])
    ).status_code == 404
    assert (await client.delete(f"{api}/documents/{document_id}", headers=bob["headers"])).status_code == 404

    # Still there, text intact, for Alice.
    mine = await client.get(f"{api}/documents/{document_id}", headers=alice["headers"])
    assert mine.status_code == 200 and "Bilal Ahmed" in mine.json()["pages"][0]["text"]


async def test_list_omits_the_text_and_delete_removes_file_and_chunks(
    client: httpx.AsyncClient, api: str, alice: dict, pipeline: dict
) -> None:
    from app.db.mongo import get_documents_collection

    response = await upload(client, api, alice, make_pdf(RENT_PAGE_1), "lease.pdf")
    document_id = response.json()["id"]
    # Stored under the owner, and flagged as indexed once the indexer returned.
    stored = await get_documents_collection().find_one({"_id": ObjectId(document_id)})
    assert stored is not None and stored["indexed"] is True and stored["owner_id"] == ObjectId(alice["id"])

    listing = (await client.get(f"{api}/documents", headers=alice["headers"])).json()
    assert listing["total"] == 1
    assert "pages" not in listing["items"][0] and "fields" not in listing["items"][0]
    assert listing["items"][0]["field_count"] == 4
    assert listing["items"][0]["status"] == "ready"

    file_path = pipeline["dir"] / alice["id"] / f"{document_id}.pdf"
    assert file_path.is_file()

    deleted = await client.delete(f"{api}/documents/{document_id}", headers=alice["headers"])
    assert deleted.status_code == 204
    assert not file_path.exists()
    assert pipeline["deleted_chunks"] == [(alice["id"], document_id)]
    assert (await client.get(f"{api}/documents/{document_id}", headers=alice["headers"])).status_code == 404


# ----------------------------------------------------- chat over a document


@pytest.fixture
def fake_chat(monkeypatch: pytest.MonkeyPatch) -> dict:
    """Record what the chat model is asked; fail loudly if the law index is consulted."""
    from app.services import chat_service, knowledge_service

    calls: dict = {"prompts": []}

    async def fake_generate(messages: list[Message], **_: object) -> tuple[str, str]:
        calls["prompts"].append(messages)
        return "The tenant is Bilal Ahmed [p. 1].", "fake"

    async def no_law(question: str, **_: object):
        raise AssertionError("a document question must not search the law knowledge base")

    async def no_rewrite(question: str):
        raise AssertionError("a document question must not be rewritten for the law index")

    monkeypatch.setattr(chat_service.llm, "generate", fake_generate)
    monkeypatch.setattr(knowledge_service, "retrieve_law", no_law)
    monkeypatch.setattr(chat_service.query_rewrite, "rewrite", no_rewrite)
    return calls


async def test_question_about_an_uploaded_document_is_answered_from_its_text(
    client: httpx.AsyncClient, api: str, alice: dict, pipeline: dict, fake_chat: dict
) -> None:
    uploaded = await upload(client, api, alice, make_pdf(RENT_PAGE_1, RENT_PAGE_2), "lease.pdf", title="Gulshan lease")
    document_id = uploaded.json()["id"]

    response = await client.post(
        f"{api}/chat/ask",
        headers=alice["headers"],
        json={"question": "Who is the tenant and what is the rent?", "document_id": document_id},
    )
    assert response.status_code == 200, response.text
    body = response.json()

    assert body["conversation"]["mode"] == "document"
    assert body["conversation"]["document_id"] == document_id
    assert body["conversation"]["document_title"] == "Gulshan lease"

    # The model saw the document prompt and the document's own text, page by page.
    prompt = fake_chat["prompts"][-1]
    assert "explains a document the user uploaded" in prompt[0].content
    assert "[p. 1]" in prompt[-1].content and "[p. 2]" in prompt[-1].content
    assert "Bilal Ahmed" in prompt[-1].content and "45,000" in prompt[-1].content

    sources = body["answer"]["sources"]
    assert [source["label"] for source in sources] == ["p. 1", "p. 2"]
    assert all(source["kind"] == "document" and source["title"] == "Gulshan lease" for source in sources)

    # A follow-up needs no document_id: the thread remembers it.
    follow_up = await client.post(
        f"{api}/chat/ask",
        headers=alice["headers"],
        json={"question": "aur notice period kitna hai?", "conversation_id": body["conversation"]["id"]},
    )
    assert follow_up.status_code == 200, follow_up.text
    assert follow_up.json()["conversation"]["mode"] == "document"
    assert "Notice period" in fake_chat["prompts"][-1][-1].content


async def test_long_document_is_answered_from_retrieved_chunks(
    client: httpx.AsyncClient,
    api: str,
    alice: dict,
    pipeline: dict,
    fake_chat: dict,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.ai.vector_store import Hit
    from app.core.config import settings
    from app.services import knowledge_service

    uploaded = await upload(client, api, alice, make_pdf(RENT_PAGE_1, RENT_PAGE_2), "lease.pdf")
    document_id = uploaded.json()["id"]
    monkeypatch.setattr(settings, "DOCUMENT_CONTEXT_CHARS", 1000)
    from app.db.mongo import get_documents_collection

    await get_documents_collection().update_one({"_id": ObjectId(document_id)}, {"$set": {"char_count": 50_000}})

    seen: dict = {}

    async def fake_retrieve_document(question: str, *, owner_id: str, document_id: str, k: int | None = None):
        seen.update(owner_id=owner_id, document_id=document_id)
        return [Hit(id="x", text="Clause 9: two months notice.", metadata={"page": 7}, score=0.73)]

    monkeypatch.setattr(knowledge_service, "retrieve_document", fake_retrieve_document)

    response = await client.post(
        f"{api}/chat/ask", headers=alice["headers"], json={"question": "Notice?", "document_id": document_id}
    )
    assert response.status_code == 200, response.text
    assert seen == {"owner_id": alice["id"], "document_id": document_id}
    assert response.json()["answer"]["sources"][0]["label"] == "p. 7"
    assert "Clause 9" in fake_chat["prompts"][-1][-1].content
    assert "Bilal Ahmed" not in fake_chat["prompts"][-1][-1].content


async def test_attaching_a_document_switches_an_existing_law_conversation(
    client: httpx.AsyncClient, api: str, alice: dict, pipeline: dict, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.services import chat_service, knowledge_service

    async def fake_generate(messages: list[Message], **_: object) -> tuple[str, str]:
        return "ok", "fake"

    async def fake_retrieve_law(question: str, **_: object):
        return []

    async def no_rewrite(question: str):
        return None

    monkeypatch.setattr(chat_service.llm, "generate", fake_generate)
    monkeypatch.setattr(knowledge_service, "retrieve_law", fake_retrieve_law)
    monkeypatch.setattr(chat_service.query_rewrite, "rewrite", no_rewrite)

    first = await client.post(f"{api}/chat/ask", headers=alice["headers"], json={"question": "What is khula?"})
    conversation_id = first.json()["conversation"]["id"]
    assert first.json()["conversation"]["mode"] == "law"

    uploaded = await upload(client, api, alice, make_pdf(RENT_PAGE_1), "lease.pdf")
    second = await client.post(
        f"{api}/chat/ask",
        headers=alice["headers"],
        json={
            "question": "Summarise this",
            "conversation_id": conversation_id,
            "document_id": uploaded.json()["id"],
        },
    )
    assert second.status_code == 200, second.text
    assert second.json()["conversation"]["mode"] == "document"
    assert second.json()["conversation"]["document_id"] == uploaded.json()["id"]
    assert second.json()["answer"]["sources"][0]["kind"] == "document"


async def test_cannot_ask_about_someone_elses_document_or_an_unfinished_one(
    client: httpx.AsyncClient, api: str, alice: dict, bob: dict, pipeline: dict, fake_chat: dict
) -> None:
    from app.db.mongo import get_conversations_collection, get_documents_collection

    uploaded = await upload(client, api, alice, make_pdf(RENT_PAGE_1), "lease.pdf")
    document_id = uploaded.json()["id"]
    # The upload's own field-extraction call went through the same fake; start counting here.
    fake_chat["prompts"].clear()

    stolen = await client.post(
        f"{api}/chat/ask", headers=bob["headers"], json={"question": "What does it say?", "document_id": document_id}
    )
    assert stolen.status_code == 404
    malformed = await client.post(
        f"{api}/chat/ask", headers=bob["headers"], json={"question": "x", "document_id": "not-an-id"}
    )
    assert malformed.status_code == 404
    # No thread was created for the refused asks, and the model was never called.
    assert await get_conversations_collection().count_documents({}) == 0
    assert fake_chat["prompts"] == []

    await get_documents_collection().update_one({"_id": ObjectId(document_id)}, {"$set": {"status": "ocr"}})
    early = await client.post(
        f"{api}/chat/ask", headers=alice["headers"], json={"question": "x", "document_id": document_id}
    )
    assert early.status_code == 409
    assert early.json()["error"]["code"] == "document_not_ready"


# --------------------------------------------------------------- pure units


def test_sniff_goes_by_content_not_by_name() -> None:
    from app.ai.extraction import sniff

    assert sniff(make_pdf("hello"), "x.bin").kind == "pdf"  # type: ignore[union-attr]
    assert sniff(make_png(), "photo.pdf").mime == "image/png"  # type: ignore[union-attr]
    assert sniff(b"\xff\xd8\xff\xe0" + b"0" * 20, "a").kind == "image"  # type: ignore[union-attr]
    assert sniff(make_docx(), "a.docx").kind == "docx"  # type: ignore[union-attr]
    assert sniff(b"plain words", "notes.txt").kind == "text"  # type: ignore[union-attr]
    assert sniff(b"plain words", "notes.exe") is None
    assert sniff(b"GIF89a....", "a.gif") is None


def test_field_reply_parsing_is_defensive() -> None:
    from app.ai.fields import doc_type_for, parse

    parsed = parse(
        'Here you go:\n```json\n{"kind": "Rent Agreement", "title": "Lease", "fields": ['
        '{"key": "Monthly Rent", "label": "", "value": 45000},'
        '{"key": "monthly_rent", "label": "dup", "value": "x"},'
        '{"key": "parties", "value": ["a", "b"]},'
        '"nonsense"]}\n```'
    )
    assert parsed is not None
    assert parsed.kind == "rent_agreement" and doc_type_for(parsed.kind) == "agreement"
    assert [(f.key, f.label, f.value) for f in parsed.fields] == [("monthly_rent", "Monthly rent", "45000")]

    assert parse("I could not read this document.") is None
    assert parse('{"kind": "spaceship", "fields": "none"}').kind == "other"  # type: ignore[union-attr]
