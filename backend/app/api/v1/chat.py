"""RAG chat routes (Module 2). Thin: all logic lives in `chat_service`.

Every route is owner-scoped. A conversation that belongs to another account
is a 404, never a 403 — see `document_service` for why.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.api.deps import CurrentUserDep
from app.schemas.chat import (
    AskRequest,
    AskResponse,
    ChatStatus,
    ConversationDetail,
    ConversationList,
    ConversationPublic,
    ConversationRename,
)
from app.services import chat_service

router = APIRouter(
    prefix="/chat",
    tags=["chat"],
    responses={401: {"description": "Missing, invalid, expired or revoked token."}},
)


@router.get("/status", response_model=ChatStatus, summary="Is the assistant ready?")
async def chat_status(_: CurrentUserDep) -> ChatStatus:
    return chat_service.status()


@router.post(
    "/ask",
    response_model=AskResponse,
    summary="Ask a question (starts a conversation when no id is given)",
    responses={
        404: {"description": "No such conversation, or it belongs to someone else."},
        503: {"description": "The language model could not answer right now."},
    },
)
async def ask(payload: AskRequest, current_user: CurrentUserDep) -> AskResponse:
    return await chat_service.ask(current_user, payload)


@router.get("/conversations", response_model=ConversationList, summary="List your conversations")
async def list_conversations(
    current_user: CurrentUserDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    skip: Annotated[int, Query(ge=0)] = 0,
) -> ConversationList:
    return await chat_service.list_conversations(current_user, limit=limit, skip=skip)


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationDetail,
    summary="Read one conversation with its messages",
    responses={404: {"description": "No such conversation, or it belongs to someone else."}},
)
async def get_conversation(conversation_id: str, current_user: CurrentUserDep) -> ConversationDetail:
    return await chat_service.get_conversation(current_user, conversation_id)


@router.patch(
    "/conversations/{conversation_id}",
    response_model=ConversationPublic,
    summary="Rename a conversation",
    responses={404: {"description": "No such conversation, or it belongs to someone else."}},
)
async def rename_conversation(
    conversation_id: str, payload: ConversationRename, current_user: CurrentUserDep
) -> ConversationPublic:
    return await chat_service.rename_conversation(current_user, conversation_id, payload.title)


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a conversation and its messages",
    responses={404: {"description": "No such conversation, or it belongs to someone else."}},
)
async def delete_conversation(conversation_id: str, current_user: CurrentUserDep) -> Response:
    await chat_service.delete_conversation(current_user, conversation_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
