"""Private document records — owner-scoped at every entry point.

**The rule this module enforces:** there is no way to reach a document record
without naming its owner. Every public function takes the authenticated user and
builds its filter through `_owned_filter`, which always includes `owner_id`.
Nothing here accepts a bare document id.

A record belonging to someone else is reported as **404, not 403**. A 403 would
confirm the id exists, which turns the endpoint into an oracle for enumerating
other people's data. From the caller's point of view a record they do not own
simply is not there.

Being an admin does not bypass any of this. Admins manage the shared legal
knowledge base (a later module); users' private documents are private from
everyone, which is the promise the product makes about confidential contracts.
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument

from app.ai import extraction
from app.api.deps import CurrentUser
from app.core.config import settings
from app.core.errors import (
    EmptyFileError,
    FileTooLargeError,
    ResourceNotFoundError,
    UnsupportedFileError,
)
from app.db.mongo import get_documents_collection
from app.schemas.document import (
    DocumentCreate,
    DocumentDetail,
    DocumentList,
    DocumentPublic,
    DocumentUpdate,
)

logger = logging.getLogger("app.documents")

# Cap on a single page of results, so a caller cannot ask for the whole table.
MAX_PAGE_SIZE = 100

# List responses never carry the extracted text: it can be megabytes per record.
_LIST_PROJECTION = {"pages": 0}


def uploads_dir() -> Path:
    """Where original files are kept. A function so tests can point it elsewhere."""
    return settings.uploads_dir


def stored_file_path(document: dict[str, Any]) -> Path | None:
    """Path of a record's original file, built only from ids the server generated.

    Nothing the uploader typed (the filename least of all) is ever part of a
    path on disk.
    """
    extension = document.get("storage_ext")
    if not extension:
        return None
    return uploads_dir() / str(document["owner_id"]) / f"{document['_id']}.{extension}"


def _last_segment(filename: str) -> str:
    return filename.replace("\\", "/").rsplit("/", 1)[-1]


def _safe_filename(filename: str) -> str:
    """Display name only: last path segment, control characters removed."""
    name = "".join(ch for ch in _last_segment(filename) if ch.isprintable()).strip()
    return (name or "document")[:200]


def _title_from_filename(filename: str) -> str:
    stem = Path(_last_segment(filename)).stem
    title = " ".join(re.sub(r"[_-]+", " ", stem).split())
    return (title or "Untitled document")[:200]


def _write_file(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def _owner_object_id(current_user: CurrentUser) -> ObjectId:
    return ObjectId(current_user.id)


def _owned_filter(current_user: CurrentUser, document_id: str | None = None) -> dict[str, Any]:
    """The only way this module builds a query.

    `owner_id` is always present. When a document id is supplied it is added to
    the same filter rather than being looked up first, so a record belonging to
    another user never gets read, let alone returned.
    """
    query: dict[str, Any] = {"owner_id": _owner_object_id(current_user)}

    if document_id is not None:
        try:
            query["_id"] = ObjectId(document_id)
        except (InvalidId, TypeError):
            # A malformed id cannot match anything. Treated as "not found" so a
            # bad id and someone else's id are indistinguishable to the caller.
            raise ResourceNotFoundError("Document not found.") from None

    return query


async def create_document(
    current_user: CurrentUser, payload: DocumentCreate
) -> DocumentPublic:
    """Create a record owned by the authenticated user."""
    now = datetime.now(timezone.utc)
    document: dict[str, Any] = {
        # Ownership is assigned from the session, never from the request body.
        "owner_id": _owner_object_id(current_user),
        "title": payload.title.strip(),
        "language": payload.language,
        "doc_type": payload.doc_type,
        # Extraction/OCR/indexing have not run yet.
        "status": "queued",
        "created_at": now,
        "updated_at": now,
    }

    result = await get_documents_collection().insert_one(document)
    document["_id"] = result.inserted_id
    return DocumentPublic.from_document(document)


async def list_documents(
    current_user: CurrentUser, *, limit: int = 20, skip: int = 0
) -> DocumentList:
    """List only the caller's own documents, newest first."""
    collection = get_documents_collection()
    query = _owned_filter(current_user)
    capped = max(1, min(limit, MAX_PAGE_SIZE))

    cursor = (
        collection.find(query, _LIST_PROJECTION)
        .sort("created_at", -1)
        .skip(max(0, skip))
        .limit(capped)
    )
    items = [DocumentPublic.from_document(doc) async for doc in cursor]

    # Counted with the same owner filter, so the total cannot leak a global count.
    total = await collection.count_documents(query)
    return DocumentList(items=items, total=total)


async def get_owned_record(current_user: CurrentUser, document_id: str) -> dict[str, Any]:
    """The raw record, for other services (chat). Same owner rule, same 404."""
    document = await get_documents_collection().find_one(
        _owned_filter(current_user, document_id)
    )
    if document is None:
        raise ResourceNotFoundError("Document not found.")
    return document


async def get_document(current_user: CurrentUser, document_id: str) -> DocumentDetail:
    return DocumentDetail.from_document(await get_owned_record(current_user, document_id))


async def create_upload(
    current_user: CurrentUser, *, data: bytes, filename: str, title: str | None = None
) -> DocumentPublic:
    """Store an uploaded file and its record. The caller starts the processing.

    The type is decided from the bytes. A file that is not a PDF, an image, a
    .docx or a .txt is refused before anything is written.
    """
    if not data:
        raise EmptyFileError()
    if len(data) > settings.max_upload_bytes:
        raise FileTooLargeError(f"The file is larger than {settings.MAX_UPLOAD_MB} MB.")

    display_name = _safe_filename(filename or "document")
    sniffed = extraction.sniff(data, display_name)
    if sniffed is None:
        raise UnsupportedFileError()

    cleaned_title = " ".join((title or "").split())[:200]
    now = datetime.now(timezone.utc)
    document: dict[str, Any] = {
        # Ownership is assigned from the session, never from the request.
        "owner_id": _owner_object_id(current_user),
        "title": cleaned_title or _title_from_filename(display_name),
        # Replaced by a title read from the document itself, unless the user chose one.
        "auto_title": not cleaned_title,
        "language": "en",
        "doc_type": "scan" if sniffed.kind == "image" else "other",
        "status": "queued",
        "error": None,
        "filename": display_name,
        "content_type": sniffed.mime,
        "file_kind": sniffed.kind,
        "storage_ext": sniffed.extension,
        "size_bytes": len(data),
        "page_count": 0,
        "char_count": 0,
        "ocr_used": False,
        "indexed": False,
        "pages": [],
        "fields": [],
        "created_at": now,
        "updated_at": now,
    }
    result = await get_documents_collection().insert_one(document)
    document["_id"] = result.inserted_id

    path = stored_file_path(document)
    assert path is not None  # storage_ext was just set
    try:
        await asyncio.to_thread(_write_file, path, data)
    except OSError:
        # No file means nothing to process: do not leave a record that can never be read.
        await get_documents_collection().delete_one({"_id": document["_id"]})
        raise
    return DocumentPublic.from_document(document)


async def requeue_document(current_user: CurrentUser, document_id: str) -> DocumentPublic:
    """Reset an uploaded document so it can be processed again (e.g. after a failed OCR)."""
    record = await get_owned_record(current_user, document_id)
    path = stored_file_path(record)
    if path is None or not path.is_file():
        # A metadata-only record, or the file is gone: there is nothing to re-read.
        raise ResourceNotFoundError("Document not found.")
    document = await get_documents_collection().find_one_and_update(
        _owned_filter(current_user, document_id),
        {"$set": {"status": "queued", "error": None, "updated_at": datetime.now(timezone.utc)}},
        projection=_LIST_PROJECTION,
        return_document=ReturnDocument.AFTER,
    )
    if document is None:
        raise ResourceNotFoundError("Document not found.")
    return DocumentPublic.from_document(document)


async def update_document(
    current_user: CurrentUser, document_id: str, payload: DocumentUpdate
) -> DocumentPublic:
    changes = payload.changes()
    if not changes:
        # Nothing to do, but the caller must still own the record to learn that.
        return DocumentPublic.from_document(await get_owned_record(current_user, document_id))

    changes["updated_at"] = datetime.now(timezone.utc)

    document = await get_documents_collection().find_one_and_update(
        _owned_filter(current_user, document_id),
        {"$set": changes},
        projection=_LIST_PROJECTION,
        return_document=ReturnDocument.AFTER,
    )
    if document is None:
        raise ResourceNotFoundError("Document not found.")
    return DocumentPublic.from_document(document)


async def delete_document(current_user: CurrentUser, document_id: str) -> None:
    document = await get_documents_collection().find_one_and_delete(
        _owned_filter(current_user, document_id), projection=_LIST_PROJECTION
    )
    if document is None:
        raise ResourceNotFoundError("Document not found.")
    # The record is gone; now remove what hung off it. Best-effort: a leftover
    # file or chunk is unreachable without the record, so it must not fail the delete.
    await asyncio.to_thread(_remove_artifacts, document)


def _remove_artifacts(document: dict[str, Any]) -> None:
    path = stored_file_path(document)
    if path is not None:
        try:
            path.unlink(missing_ok=True)
        except OSError:
            logger.warning("Could not remove the stored file of document %s", document["_id"])
    if document.get("indexed"):
        try:
            from app.services import knowledge_service

            knowledge_service.delete_document_chunks(str(document["owner_id"]), str(document["_id"]))
        except Exception:  # noqa: BLE001
            logger.warning("Could not remove indexed chunks of document %s", document["_id"])


async def count_documents_for_owner(current_user: CurrentUser) -> int:
    return await get_documents_collection().count_documents(_owned_filter(current_user))
