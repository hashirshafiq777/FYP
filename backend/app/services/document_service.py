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

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument

from app.api.deps import CurrentUser
from app.core.errors import ResourceNotFoundError
from app.db.mongo import get_documents_collection
from app.schemas.document import (
    DocumentCreate,
    DocumentList,
    DocumentPublic,
    DocumentUpdate,
)

# Cap on a single page of results, so a caller cannot ask for the whole table.
MAX_PAGE_SIZE = 100


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

    cursor = collection.find(query).sort("created_at", -1).skip(max(0, skip)).limit(capped)
    items = [DocumentPublic.from_document(doc) async for doc in cursor]

    # Counted with the same owner filter, so the total cannot leak a global count.
    total = await collection.count_documents(query)
    return DocumentList(items=items, total=total)


async def get_document(current_user: CurrentUser, document_id: str) -> DocumentPublic:
    document = await get_documents_collection().find_one(
        _owned_filter(current_user, document_id)
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
        return await get_document(current_user, document_id)

    changes["updated_at"] = datetime.now(timezone.utc)

    document = await get_documents_collection().find_one_and_update(
        _owned_filter(current_user, document_id),
        {"$set": changes},
        return_document=ReturnDocument.AFTER,
    )
    if document is None:
        raise ResourceNotFoundError("Document not found.")
    return DocumentPublic.from_document(document)


async def delete_document(current_user: CurrentUser, document_id: str) -> None:
    result = await get_documents_collection().delete_one(
        _owned_filter(current_user, document_id)
    )
    if result.deleted_count == 0:
        raise ResourceNotFoundError("Document not found.")


async def count_documents_for_owner(current_user: CurrentUser) -> int:
    return await get_documents_collection().count_documents(_owned_filter(current_user))
