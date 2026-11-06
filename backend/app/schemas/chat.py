"""Schemas for the RAG chat (Module 2)."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

ChatMode = Literal["law", "document"]
ChatLanguage = Literal["en", "ur", "roman-ur"]
MessageRole = Literal["user", "assistant"]

Question = Annotated[str, Field(min_length=1, max_length=4000, examples=["Section 302 PPC ki saza kya hai?"])]


class AskRequest(BaseModel):
    """One user turn. Omit `conversation_id` to start a new thread."""

    model_config = ConfigDict(extra="forbid")

    question: Question
    conversation_id: str | None = None
    mode: ChatMode = "law"
    # Only for mode="document": which of the caller's documents to answer from.
    document_id: str | None = None

    @field_validator("question")
    @classmethod
    def _trim(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("question must not be blank")
        return trimmed


class Source(BaseModel):
    """A retrieved passage the answer was grounded on."""

    label: str = Field(examples=["Pakistan Penal Code s. 302"])
    title: str
    section: str | None = None
    category: str | None = None
    kind: Literal["statute", "case", "document", "guide"] = "statute"
    url: str | None = None
    page: int | None = None
    excerpt: str
    score: float


class MessagePublic(BaseModel):
    id: str
    conversation_id: str
    role: MessageRole
    content: str
    language: ChatLanguage | None = None
    sources: list[Source] = []
    provider: str | None = None
    created_at: datetime

    @classmethod
    def from_document(cls, document: dict[str, Any]) -> "MessagePublic":
        return cls(
            id=str(document["_id"]),
            conversation_id=str(document["conversation_id"]),
            role=document["role"],
            content=document["content"],
            language=document.get("language"),
            sources=[Source(**s) for s in document.get("sources", [])],
            provider=document.get("provider"),
            created_at=document["created_at"],
        )


class ConversationPublic(BaseModel):
    id: str
    title: str
    mode: ChatMode
    language: ChatLanguage
    document_id: str | None = None
    message_count: int = 0
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_document(cls, document: dict[str, Any]) -> "ConversationPublic":
        return cls(
            id=str(document["_id"]),
            title=document.get("title", "New conversation"),
            mode=document.get("mode", "law"),
            language=document.get("language", "en"),
            document_id=str(document["document_id"]) if document.get("document_id") else None,
            message_count=int(document.get("message_count", 0)),
            created_at=document["created_at"],
            updated_at=document.get("updated_at", document["created_at"]),
        )


class ConversationList(BaseModel):
    items: list[ConversationPublic]
    total: int


class ConversationDetail(BaseModel):
    conversation: ConversationPublic
    messages: list[MessagePublic]


class AskResponse(BaseModel):
    conversation: ConversationPublic
    question: MessagePublic
    answer: MessagePublic


class ConversationRename(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Annotated[str, Field(min_length=1, max_length=120)]


class ChatStatus(BaseModel):
    """Public-ish health for the AI layer (still needs a login)."""

    providers: list[str]
    llm_model: str
    embedding_model: str
    law_chunks: int
    ready: bool
