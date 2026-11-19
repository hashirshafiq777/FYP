"""Private document records.

Every route is owner-scoped through `document_service`, which always filters by
`owner_id`. A record belonging to another account is reported as 404, never 403
— see the service module for why.

`POST /documents/upload` stores a file and starts the pipeline in
`document_processing` (text extraction, OCR, field extraction, indexing).
Poll `GET /documents/{id}` until `status` is `ready` or `failed`.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, File, Form, Query, Response, UploadFile, status

from app.api.deps import CurrentUserDep
from app.core.config import settings
from app.core.errors import FileTooLargeError
from app.schemas.document import (
    DocumentCreate,
    DocumentDetail,
    DocumentList,
    DocumentPublic,
    DocumentUpdate,
)
from app.services import document_processing, document_service

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


@router.post(
    "/upload",
    response_model=DocumentPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a file (PDF, image, .docx or .txt) and start extracting its text",
    responses={
        413: {"description": "The file is larger than the configured limit."},
        415: {"description": "Not a PDF, an image, a .docx or a .txt file."},
        422: {"description": "The file is empty or missing."},
    },
)
async def upload_document(
    background_tasks: BackgroundTasks,
    current_user: CurrentUserDep,
    file: Annotated[UploadFile, File(description="PDF, JPG/PNG/WEBP, .docx or .txt")],
    title: Annotated[str | None, Form(max_length=200)] = None,
) -> DocumentPublic:
    """Returns at once with `status: "queued"`; the text arrives in the background."""
    # Read one byte past the limit: enough to know the file is too big without
    # holding an arbitrarily large upload in memory.
    data = await file.read(settings.max_upload_bytes + 1)
    if len(data) > settings.max_upload_bytes:
        raise FileTooLargeError(f"The file is larger than {settings.MAX_UPLOAD_MB} MB.")

    document = await document_service.create_upload(
        current_user, data=data, filename=file.filename or "document", title=title
    )
    background_tasks.add_task(document_processing.process, current_user.id, document.id)
    return document


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
    response_model=DocumentDetail,
    summary="Read one of your documents, with its extracted text and fields",
    responses={404: {"description": "No such document, or it belongs to someone else."}},
)
async def get_document(document_id: str, current_user: CurrentUserDep) -> DocumentDetail:
    return await document_service.get_document(current_user, document_id)


@router.post(
    "/{document_id}/reprocess",
    response_model=DocumentPublic,
    summary="Extract the text of an uploaded document again",
    responses={404: {"description": "No such document, it has no file, or it belongs to someone else."}},
)
async def reprocess_document(
    document_id: str, background_tasks: BackgroundTasks, current_user: CurrentUserDep
) -> DocumentPublic:
    document = await document_service.requeue_document(current_user, document_id)
    background_tasks.add_task(document_processing.process, current_user.id, document.id)
    return document


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
