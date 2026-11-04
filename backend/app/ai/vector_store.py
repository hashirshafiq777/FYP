"""ChromaDB persistent vector store.

Two collections:

* ``pakistan_law`` — the shared knowledge base (statutes + case summaries). It
  has no owner; it is built offline by ``scripts/build_index.py``.
* ``user_documents`` — chunks of PDFs users upload. Every chunk carries an
  ``owner_id`` in its metadata and every query filters by it, mirroring the
  owner-scoping rule in ``document_service``.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

from app.core.config import settings

logger = logging.getLogger("app.ai.vector_store")

LAW_COLLECTION = "pakistan_law"
USER_DOCS_COLLECTION = "user_documents"


@dataclass
class Hit:
    id: str
    text: str
    metadata: dict[str, Any]
    score: float  # cosine similarity, higher is better


@lru_cache
def _client():
    import chromadb

    settings.chroma_dir.mkdir(parents=True, exist_ok=True)
    return chromadb.PersistentClient(path=str(settings.chroma_dir))


def collection(name: str):
    return _client().get_or_create_collection(name, metadata={"hnsw:space": "cosine"})


def add(name: str, *, ids: list[str], texts: list[str], vectors: list[list[float]], metadatas: list[dict]) -> None:
    coll = collection(name)
    # Chroma caps a single add; stay well under it.
    step = 500
    for start in range(0, len(ids), step):
        coll.upsert(
            ids=ids[start : start + step],
            documents=texts[start : start + step],
            embeddings=vectors[start : start + step],
            metadatas=metadatas[start : start + step],
        )


def delete_where(name: str, where: dict[str, Any]) -> None:
    collection(name).delete(where=where)


def count(name: str) -> int:
    try:
        return collection(name).count()
    except Exception:  # noqa: BLE001 - a missing store is "0 chunks", not an error
        return 0


def _to_hits(result: dict[str, Any]) -> list[Hit]:
    hits: list[Hit] = []
    ids = result.get("ids") or [[]]
    docs = result.get("documents") or [[]]
    metas = result.get("metadatas") or [[]]
    dists = result.get("distances") or [[]]
    for id_, doc, meta, dist in zip(ids[0], docs[0], metas[0], dists[0]):
        hits.append(Hit(id=id_, text=doc, metadata=meta or {}, score=1.0 - float(dist)))
    return hits


def query(
    name: str,
    vector: list[float],
    *,
    k: int = 8,
    where: dict[str, Any] | None = None,
    where_document: dict[str, Any] | None = None,
) -> list[Hit]:
    coll = collection(name)
    if coll.count() == 0:
        return []
    kwargs: dict[str, Any] = {
        "query_embeddings": [vector],
        "n_results": min(k, coll.count()),
        "include": ["documents", "metadatas", "distances"],
    }
    if where:
        kwargs["where"] = where
    if where_document:
        kwargs["where_document"] = where_document
    try:
        return _to_hits(coll.query(**kwargs))
    except Exception as exc:  # noqa: BLE001
        # A where_document that matches nothing raises in some Chroma versions.
        logger.debug("vector query failed (%s); returning no hits", type(exc).__name__)
        return []
