"""The upload pipeline: file -> text -> (OCR) -> fields -> index.

Runs as a FastAPI background task after `POST /documents/upload` returns, and
reports progress through the record's `status`:

    queued -> extracting -> ocr -> indexing -> ready | failed

`ocr` is entered only when a page has no text layer (a scan or a photo).

Ownership: the task is started with the owner's id and every read and write
below filters by it, exactly like the request-time services do.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId

from app.ai import extraction, fields as field_extraction, vision
from app.ai.extraction import PageDraft, UnreadableFile
from app.ai.llm import LLMUnavailable
from app.core.config import settings
from app.db.mongo import get_documents_collection
from app.services import document_service, knowledge_service

logger = logging.getLogger("app.documents.processing")


def _filter(owner_id: str, document_id: str) -> dict[str, Any]:
    return {"_id": ObjectId(document_id), "owner_id": ObjectId(owner_id)}


async def _set(owner_id: str, document_id: str, **changes: Any) -> None:
    changes["updated_at"] = datetime.now(timezone.utc)
    await get_documents_collection().update_one(_filter(owner_id, document_id), {"$set": changes})


async def _fail(owner_id: str, document_id: str, error: str) -> None:
    logger.info("document %s failed: %s", document_id, error)
    await _set(owner_id, document_id, status="failed", error=error)


async def _ocr(drafts: list[PageDraft]) -> tuple[int, bool]:
    """Read image-only pages with the vision model, in place.

    Returns (pages read, whether the model became unavailable part-way).
    """
    read = 0
    for draft in drafts[: settings.MAX_OCR_PAGES]:
        assert draft.image is not None
        try:
            text, _ = await vision.read_image(draft.image, "image/jpeg")
        except LLMUnavailable as exc:
            logger.warning("OCR stopped at page %d: %s", draft.page, exc)
            return read, True
        cleaned = text.strip()
        if cleaned:
            draft.text = cleaned
            read += 1
        draft.image = None
    return read, False


async def process(owner_id: str, document_id: str) -> None:
    """Entry point for the background task. Never raises."""
    try:
        await _run(owner_id, document_id)
    except Exception:  # noqa: BLE001 - a background task has nobody to raise to
        logger.exception("Unexpected error while processing document %s", document_id)
        try:
            await _fail(owner_id, document_id, "internal")
        except Exception:  # noqa: BLE001
            logger.exception("Could not mark document %s as failed", document_id)


async def _run(owner_id: str, document_id: str) -> None:
    record = await get_documents_collection().find_one(_filter(owner_id, document_id))
    if record is None:
        return  # Deleted between the upload and the task starting.

    path = document_service.stored_file_path(record)
    if path is None or not path.is_file():
        await _fail(owner_id, document_id, "unreadable")
        return

    # 1. Text that is already in the file.
    await _set(owner_id, document_id, status="extracting", error=None)
    data = await asyncio.to_thread(path.read_bytes)
    try:
        drafts = await asyncio.to_thread(extraction.extract_pages, data, record["file_kind"])
    except UnreadableFile as exc:
        logger.info("document %s is unreadable: %s", document_id, exc)
        await _fail(owner_id, document_id, "unreadable")
        return

    # 2. OCR for pages that are pictures of text.
    needs_ocr = [draft for draft in drafts if draft.image is not None]
    ocr_pages = 0
    ocr_unavailable = False
    if needs_ocr:
        await _set(owner_id, document_id, status="ocr")
        ocr_pages, ocr_unavailable = await _ocr(needs_ocr)

    ocr_page_numbers = {draft.page for draft in needs_ocr if draft.image is None and draft.text}
    pages: list[dict[str, Any]] = []
    total_chars = 0
    for draft in drafts:
        text = draft.text.strip()
        if not text:
            continue
        text = text[: max(0, extraction.MAX_TOTAL_CHARS - total_chars)]
        if not text:
            break
        total_chars += len(text)
        pages.append(
            {
                "page": draft.page,
                "text": text,
                "method": "ocr" if draft.page in ocr_page_numbers else "text",
            }
        )

    if not pages:
        await _fail(owner_id, document_id, "ocr_unavailable" if ocr_unavailable else "no_text")
        return

    full_text = "\n\n".join(page["text"] for page in pages)

    # 3. Key facts, for display now and for pre-filling agreements later. Best-effort.
    extracted = await field_extraction.extract(full_text)

    title = record["title"]
    changes: dict[str, Any] = {
        "status": "indexing",
        "pages": pages,
        "page_count": len(drafts),
        # Pages that ended with no text: blank, or a scan the vision model could not read.
        "pages_unread": len(drafts) - len(pages),
        "char_count": total_chars,
        "ocr_used": ocr_pages > 0,
        "language": extraction.detect_language(full_text),
        "fields": [],
        "detected_kind": None,
        "summary": None,
    }
    if extracted is not None:
        changes["fields"] = [
            {"key": item.key, "label": item.label, "value": item.value} for item in extracted.fields
        ]
        changes["detected_kind"] = extracted.kind
        changes["summary"] = extracted.summary or None
        changes["doc_type"] = field_extraction.doc_type_for(extracted.kind)
        if record.get("auto_title") and extracted.title:
            title = extracted.title
            changes["title"] = title
    await _set(owner_id, document_id, **changes)

    # 4. Index for the chat. A short document is answered from its full text, so
    #    a failed index is logged and does not fail the upload.
    indexed = False
    try:
        await asyncio.to_thread(
            knowledge_service.index_document,
            owner_id,
            document_id,
            title,
            [(page["page"], page["text"]) for page in pages],
        )
        indexed = True
    except Exception:  # noqa: BLE001
        logger.exception("Could not index document %s; it stays readable", document_id)

    await _set(owner_id, document_id, status="ready", error=None, indexed=indexed)
    logger.info(
        "document %s ready: %d page(s), %d chars, %d by OCR", document_id, len(pages), total_chars, ocr_pages
    )
