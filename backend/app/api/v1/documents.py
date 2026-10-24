"""Private document records.

Every route is owner-scoped through `document_service`, which always filters by
`owner_id`. A record belonging to another account is reported as 404, never 403
— see the service module for why.

Metadata only: upload, extraction, OCR and indexing belong to a later module.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.api.deps import CurrentUserDep
from app.schemas.document import (
    DocumentCreate,
    DocumentList,
    DocumentPublic,
    DocumentUpdate,
)
from app.services import document_service

router = APIRouter(
    prefix="/documents",
    tags=["documents"],
    responses={401: {"description": "Missing, invalid, expired or revoked token."}},
)


@router.post(
    "",
    response_model=DocumentPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create a document record",
)
async def create_document(
    payload: DocumentCreate, current_user: CurrentUserDep
) -> DocumentPublic:
    """Ownership comes from the session, never from the request body."""
    return await document_service.create_document(current_user, payload)


@router.get(
    "",
    response_model=DocumentList,
    summary="List your own documents",
)
async def list_documents(
    current_user: CurrentUserDep,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    skip: Annotated[int, Query(ge=0)] = 0,
) -> DocumentList:
    return await document_service.list_documents(current_user, limit=limit, skip=skip)


@router.get(
    "/{document_id}",
    response_model=DocumentPublic,
    summary="Read one of your documents",
    responses={404: {"description": "No such document, or it belongs to someone else."}},
)
async def get_document(document_id: str, current_user: CurrentUserDep) -> DocumentPublic:
    return await document_service.get_document(current_user, document_id)


@router.patch(
    "/{document_id}",
    response_model=DocumentPublic,
    summary="Update one of your documents",
    responses={404: {"description": "No such document, or it belongs to someone else."}},
)
async def update_document(
    document_id: str, payload: DocumentUpdate, current_user: CurrentUserDep
) -> DocumentPublic:
    return await document_service.update_document(current_user, document_id, payload)


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete one of your documents",
    responses={404: {"description": "No such document, or it belongs to someone else."}},
)
async def delete_document(document_id: str, current_user: CurrentUserDep) -> Response:
    await document_service.delete_document(current_user, document_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
