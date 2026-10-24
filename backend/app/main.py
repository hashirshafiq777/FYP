"""LegalDocReader API — application entry point."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.db.indexes import ensure_indexes
from app.db.mongo import close_mongo_connection, connect_to_mongo

logging.basicConfig(
    level=logging.INFO if not settings.is_prod else logging.WARNING,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(_: FastAPI):
    database = await connect_to_mongo()
    try:
        await ensure_indexes(database)
    except Exception:  # noqa: BLE001 - startup must not die if Mongo is briefly down
        # /health will report the database as down; indexes are retried next start.
        logger.exception("Could not create MongoDB indexes at startup")
    yield
    await close_mongo_connection()


app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description=(
        "Authentication foundation for LegalDocReader, a bilingual (English/Urdu) "
        "legal and policy document analyzer. Use **Authorize** to send a bearer token."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {
        "name": settings.APP_NAME,
        "version": "0.1.0",
        "docs": "/docs",
        "api": settings.API_V1_PREFIX,
    }
