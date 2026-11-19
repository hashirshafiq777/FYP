"""Schemas for private, per-user document records.

A record is created either as bare metadata (`POST /documents`) or by uploading
a file (`POST /documents/upload`). An uploaded file moves through `status` while
its text is extracted, OCR'd where needed, and indexed for the chat.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

DocumentLanguage = Literal["en", "ur"]
DocumentType = Literal["contract", "policy", "scan", "agreement", "identity", "other"]

# The processing pipeline:
#   queued -> extracting -> ocr -> indexing -> ready | failed
DocumentStatus = Literal[
    "queued", "extracting", "ocr", "indexing", "ready", "failed"
]

# Why a document ended up `failed`. A code, not prose, so the UI can translate it.
#   unreadable       the file is corrupt or password-protected
#   no_text          nothing readable was found, even after OCR
#   ocr_unavailable  the page is a scan/photo and the vision model could not be reached
#   internal         anything unexpected
DocumentError = Literal["unreadable", "no_text", "ocr_unavailable", "internal"]

# How a page's text was obtained.
PageMethod = Literal["text", "ocr"]

Title = Annotated[str, Field(min_length=1, max_length=200, examples=["Office Lease 2026"])]


class DocumentCreate(BaseModel):
    """Create payload. `owner_id` is absent on purpose — the server sets it."""

    model_config = ConfigDict(extra="forbid")

    title: Title
    language: DocumentLanguage = "en"
    doc_type: DocumentType = "contract"

    @field_validator("title")
    @classmethod
    def _trim_title(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("title must not be blank")
        if len(trimmed) > 200:
            raise ValueError("title must be at most 200 characters")
        return trimmed


class DocumentUpdate(BaseModel):
    """Partial update. Every field optional; at least one must be supplied."""

    model_config = ConfigDict(extra="forbid")

    title: Title | None = None
    language: DocumentLanguage | None = None
    doc_type: DocumentType | None = None

    @field_validator("title")
    @classmethod
    def _trim_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("title must not be blank")
        return trimmed

    def changes(self) -> dict[str, Any]:
        """Only the fields the caller actually sent."""
        return self.model_dump(exclude_unset=True, exclude_none=True)


class DocumentPublic(BaseModel):
    """What leaves the API.

    `owner_id` is deliberately NOT exposed: the caller is always the owner, so
    it carries no information, and publishing other users' ids invites probing.
    """

    id: str = Field(examples=["6711f0a2c3d4e5f60718293a"])
    title: str
    language: DocumentLanguage
    doc_type: DocumentType
    status: DocumentStatus
    # Set only when status == "failed".
    error: DocumentError | None = None
    # --- present for uploaded files; None for a metadata-only record
    filename: str | None = None
    content_type: str | None = None
    size_bytes: int | None = None
    page_count: int = 0
    # Pages with no text at all: blank, or a scan that could not be read.
    pages_unread: int = 0
    char_count: int = 0
    # True when at least one page was read by the vision model.
    ocr_used: bool = False
    # Specific kind detected from the text ("cnic", "rent_agreement", ...).
    detected_kind: str | None = None
    summary: str | None = None
    field_count: int = 0
    created_at: datetime
    updated_at: datetime

    @classmethod
    def _base(cls, document: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": str(document["_id"]),
            "title": document["title"],
            "language": document.get("language", "en"),
            "doc_type": document.get("doc_type", "contract"),
            "status": document.get("status", "queued"),
            "error": document.get("error"),
            "filename": document.get("filename"),
            "content_type": document.get("content_type"),
            "size_bytes": document.get("size_bytes"),
            "page_count": int(document.get("page_count", 0)),
            "pages_unread": int(document.get("pages_unread", 0)),
            "char_count": int(document.get("char_count", 0)),
            "ocr_used": bool(document.get("ocr_used", False)),
            "detected_kind": document.get("detected_kind"),
            "summary": document.get("summary") or None,
            "field_count": len(document.get("fields") or []),
            "created_at": document["created_at"],
            "updated_at": document.get("updated_at", document["created_at"]),
        }

    @classmethod
    def from_document(cls, document: dict[str, Any]) -> "DocumentPublic":
        return cls(**cls._base(document))


class DocumentPage(BaseModel):
    page: int
    text: str
    method: PageMethod = "text"


class DocumentField(BaseModel):
    """One fact pulled out of the document, e.g. key="cnic_number"."""

    key: str
    label: str
    value: str


class DocumentDetail(DocumentPublic):
    """One document with its extracted text and fields (list responses omit these)."""

    pages: list[DocumentPage] = []
    fields: list[DocumentField] = []

    @classmethod
    def from_document(cls, document: dict[str, Any]) -> "DocumentDetail":
        return cls(
            **cls._base(document),
            pages=[DocumentPage(**page) for page in document.get("pages") or []],
            fields=[DocumentField(**item) for item in document.get("fields") or []],
        )


class DocumentList(BaseModel):
    items: list[DocumentPublic]
    total: int
