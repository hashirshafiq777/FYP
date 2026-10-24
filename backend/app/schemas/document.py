"""Schemas for private, per-user document records.

This is metadata only. File upload, text extraction, OCR and indexing belong to
a later module; the `status` field is already here so those stages have
somewhere to report progress without a schema change.
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

DocumentLanguage = Literal["en", "ur"]
DocumentType = Literal["contract", "policy", "scan", "agreement"]

# Anticipates the pipeline documented in the README:
#   queued -> extracting -> ocr -> indexing -> ready | failed
DocumentStatus = Literal[
    "queued", "extracting", "ocr", "indexing", "ready", "failed"
]

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
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_document(cls, document: dict[str, Any]) -> "DocumentPublic":
        return cls(
            id=str(document["_id"]),
            title=document["title"],
            language=document.get("language", "en"),
            doc_type=document.get("doc_type", "contract"),
            status=document.get("status", "queued"),
            created_at=document["created_at"],
            updated_at=document.get("updated_at", document["created_at"]),
        )


class DocumentList(BaseModel):
    items: list[DocumentPublic]
    total: int
