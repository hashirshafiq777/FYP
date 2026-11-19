"""RAG chat: owner-scoped conversations + grounded answers.

Same ownership rule as `document_service`: every query is built through
`_owned_filter`, a foreign conversation is a 404, and admins get no bypass.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument

from app.ai import llm, prompts, rewrite as query_rewrite
from app.ai.language import detect
from app.ai.llm import LLMUnavailable, Message
from app.api.deps import CurrentUser
from app.core.config import settings
from app.core.errors import AIUnavailableError, DocumentNotReadyError, ResourceNotFoundError
from app.db.mongo import get_conversations_collection, get_messages_collection
from app.schemas.chat import (
    AskRequest,
    AskResponse,
    ChatStatus,
    ConversationDetail,
    ConversationList,
    ConversationPublic,
    MessagePublic,
    Source,
)
from app.services import document_service, knowledge_service

logger = logging.getLogger("app.chat")

MAX_PAGE_SIZE = 100
# How many previous turns go back to the model (each turn = user + assistant).
HISTORY_TURNS = 4


def _owner(current_user: CurrentUser) -> ObjectId:
    return ObjectId(current_user.id)


def _owned_filter(current_user: CurrentUser, conversation_id: str | None = None) -> dict[str, Any]:
    query: dict[str, Any] = {"owner_id": _owner(current_user)}
    if conversation_id is not None:
        try:
            query["_id"] = ObjectId(conversation_id)
        except (InvalidId, TypeError):
            raise ResourceNotFoundError("Conversation not found.") from None
    return query


# ------------------------------------------------------------- conversations


async def list_conversations(current_user: CurrentUser, *, limit: int = 20, skip: int = 0) -> ConversationList:
    coll = get_conversations_collection()
    query = _owned_filter(current_user)
    capped = max(1, min(limit, MAX_PAGE_SIZE))
    cursor = coll.find(query).sort("updated_at", -1).skip(max(0, skip)).limit(capped)
    items = [ConversationPublic.from_document(doc) async for doc in cursor]
    total = await coll.count_documents(query)
    return ConversationList(items=items, total=total)


async def get_conversation(current_user: CurrentUser, conversation_id: str) -> ConversationDetail:
    conversation = await get_conversations_collection().find_one(_owned_filter(current_user, conversation_id))
    if conversation is None:
        raise ResourceNotFoundError("Conversation not found.")
    cursor = (
        get_messages_collection()
        .find({"owner_id": _owner(current_user), "conversation_id": conversation["_id"]})
        .sort("created_at", 1)
    )
    messages = [MessagePublic.from_document(doc) async for doc in cursor]
    return ConversationDetail(conversation=ConversationPublic.from_document(conversation), messages=messages)


async def rename_conversation(current_user: CurrentUser, conversation_id: str, title: str) -> ConversationPublic:
    doc = await get_conversations_collection().find_one_and_update(
        _owned_filter(current_user, conversation_id),
        {"$set": {"title": title.strip(), "updated_at": datetime.now(timezone.utc)}},
        return_document=ReturnDocument.AFTER,
    )
    if doc is None:
        raise ResourceNotFoundError("Conversation not found.")
    return ConversationPublic.from_document(doc)


async def delete_conversation(current_user: CurrentUser, conversation_id: str) -> None:
    query = _owned_filter(current_user, conversation_id)
    result = await get_conversations_collection().delete_one(query)
    if result.deleted_count == 0:
        raise ResourceNotFoundError("Conversation not found.")
    await get_messages_collection().delete_many(
        {"owner_id": _owner(current_user), "conversation_id": query["_id"]}
    )


async def count_conversations_for_owner(current_user: CurrentUser) -> int:
    return await get_conversations_collection().count_documents(_owned_filter(current_user))


# --------------------------------------------------------------------- ask


def _fallback_title(question: str) -> str:
    words = question.split()
    title = " ".join(words[:7])
    return title if len(title) <= 60 else title[:57].rstrip() + "…"


async def _ensure_conversation(
    current_user: CurrentUser,
    payload: AskRequest,
    language: str,
    attached: dict[str, Any] | None,
) -> dict[str, Any]:
    """Find or create the thread. `attached` is a document the caller owns, already checked."""
    coll = get_conversations_collection()
    if payload.conversation_id:
        conversation = await coll.find_one(_owned_filter(current_user, payload.conversation_id))
        if conversation is None:
            raise ResourceNotFoundError("Conversation not found.")
        if attached is not None and conversation.get("document_id") != attached["_id"]:
            # A file attached part-way through: from here on the thread answers from it.
            changes = {
                "mode": "document",
                "document_id": attached["_id"],
                "document_title": attached["title"],
            }
            await coll.update_one(_owned_filter(current_user, payload.conversation_id), {"$set": changes})
            conversation.update(changes)
        return conversation

    now = datetime.now(timezone.utc)
    conversation: dict[str, Any] = {
        "owner_id": _owner(current_user),
        "title": _fallback_title(payload.question),
        "mode": "document" if attached is not None else payload.mode,
        "language": language,
        "document_id": attached["_id"] if attached is not None else None,
        "document_title": attached["title"] if attached is not None else None,
        "message_count": 0,
        "created_at": now,
        "updated_at": now,
    }
    result = await coll.insert_one(conversation)
    conversation["_id"] = result.inserted_id
    return conversation


async def _document_passages(
    current_user: CurrentUser, question: str, document: dict[str, Any]
) -> tuple[list[tuple[str, str]], list[Source]]:
    """Context for a question about one of the caller's documents.

    A short document (an ID card, a two-page agreement) is given to the model
    whole: nothing can be missed by retrieval, and "summarise this" works. A
    long one is answered from the chunks closest to the question.
    """
    if document.get("status") != "ready":
        raise DocumentNotReadyError()

    title = document["title"]
    pages = document.get("pages") or []
    whole = int(document.get("char_count", 0)) <= settings.DOCUMENT_CONTEXT_CHARS or not document.get("indexed")
    scores: list[float] = []
    if whole:
        budget = settings.DOCUMENT_CONTEXT_CHARS
        selected: list[tuple[int, str]] = []
        for page in pages:
            if budget <= 0:
                break
            text = page["text"][:budget]
            budget -= len(text)
            selected.append((int(page["page"]), text))
    else:
        hits = await knowledge_service.retrieve_document(
            question, owner_id=current_user.id, document_id=str(document["_id"])
        )
        selected = [(int(hit.metadata.get("page") or 1), hit.text) for hit in hits]
        scores = [hit.score for hit in hits]

    passages = [(f"p. {page}", text) for page, text in selected]
    sources = [
        knowledge_service.page_source(title, page, text, 1.0 if whole else scores[index])
        for index, (page, text) in enumerate(selected)
    ]
    return passages, sources


async def _history(current_user: CurrentUser, conversation_id: ObjectId) -> list[Message]:
    cursor = (
        get_messages_collection()
        .find({"owner_id": _owner(current_user), "conversation_id": conversation_id})
        .sort("created_at", -1)
        .limit(HISTORY_TURNS * 2)
    )
    recent = [doc async for doc in cursor]
    recent.reverse()
    # Previous assistant answers are sent without their CONTEXT blocks to keep
    # the prompt small; the current turn carries fresh retrieved passages.
    return [Message(role=doc["role"], content=doc["content"]) for doc in recent]


async def ask(current_user: CurrentUser, payload: AskRequest) -> AskResponse:
    language = detect(payload.question)
    # An attached document is looked up through the owner filter before anything
    # is created, so someone else's id (or a malformed one) is a plain 404.
    attached = (
        await document_service.get_owned_record(current_user, payload.document_id)
        if payload.document_id
        else None
    )
    conversation = await _ensure_conversation(current_user, payload, language, attached)
    mode = conversation.get("mode", payload.mode)

    # 1. Retrieve.
    if mode == "document":
        document = attached
        if document is None:
            document_id = str(conversation.get("document_id") or "")
            if not document_id:
                raise ResourceNotFoundError("This conversation has no document attached.")
            # Raises 404 if the document was deleted since it was attached.
            document = await document_service.get_owned_record(current_user, document_id)
        passages, sources = await _document_passages(current_user, payload.question, document)
    else:
        # Best-effort English rewrite of the question for retrieval (None if the model is down).
        rewritten = await query_rewrite.rewrite(payload.question)
        hits = await knowledge_service.retrieve_law(payload.question, rewrite=rewritten)
        sources = [knowledge_service.to_source(hit) for hit in hits]
        passages = [(source.label, hit.text) for source, hit in zip(sources, hits)]

    # 2. Generate.
    messages = [Message(role="system", content=prompts.system_prompt(mode, language))]
    messages.extend(await _history(current_user, conversation["_id"]))
    messages.append(Message(role="user", content=prompts.user_turn(payload.question, passages)))

    try:
        answer_text, provider = await llm.generate(messages)
    except LLMUnavailable as exc:
        logger.error("LLM unavailable: %s", exc)
        raise AIUnavailableError() from None

    # 3. Persist both turns.
    now = datetime.now(timezone.utc)
    msgs = get_messages_collection()
    user_doc: dict[str, Any] = {
        "owner_id": _owner(current_user),
        "conversation_id": conversation["_id"],
        "role": "user",
        "content": payload.question,
        "language": language,
        "sources": [],
        "created_at": now,
    }
    user_doc["_id"] = (await msgs.insert_one(user_doc)).inserted_id

    answer_doc: dict[str, Any] = {
        "owner_id": _owner(current_user),
        "conversation_id": conversation["_id"],
        "role": "assistant",
        "content": answer_text,
        "language": language,
        "sources": [source.model_dump() for source in sources],
        "provider": provider,
        "created_at": datetime.now(timezone.utc),
    }
    answer_doc["_id"] = (await msgs.insert_one(answer_doc)).inserted_id

    updated = await get_conversations_collection().find_one_and_update(
        {"_id": conversation["_id"], "owner_id": _owner(current_user)},
        {"$set": {"updated_at": answer_doc["created_at"], "language": language}, "$inc": {"message_count": 2}},
        return_document=ReturnDocument.AFTER,
    )

    return AskResponse(
        conversation=ConversationPublic.from_document(updated or conversation),
        question=MessagePublic.from_document(user_doc),
        answer=MessagePublic.from_document(answer_doc),
    )


def status() -> ChatStatus:
    providers = llm.configured_providers()
    chunks = knowledge_service.law_chunk_count()
    return ChatStatus(
        providers=providers,
        llm_model=settings.GROQ_MODEL if "groq" in providers else settings.GEMINI_MODEL,
        embedding_model=settings.EMBEDDING_MODEL,
        law_chunks=chunks,
        ready=bool(providers) and chunks > 0,
    )
