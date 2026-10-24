from __future__ import annotations

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

from app.core.errors import error_body
from app.db.mongo import ping_database
from app.schemas.auth import HealthResponse

router = APIRouter(tags=["health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Liveness and database check",
    responses={503: {"description": "Database unreachable."}},
)
async def health():
    """200 when MongoDB answers a ping, 503 when it does not."""
    if not await ping_database():
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=error_body("database_unavailable", "Database is unavailable."),
        )
    return HealthResponse(status="ok", database="ok")
