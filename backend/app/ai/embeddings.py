"""Local, free text embeddings (fastembed, ONNX on CPU — no PyTorch, no API key).

The model is multilingual, so English, Urdu-script and Roman Urdu questions all
land in the same vector space as the English statute text. It is downloaded once
(~450 MB) into the fastembed cache on first use and reused after that.
"""

from __future__ import annotations

import logging
from functools import lru_cache
from typing import Iterable

from app.core.config import settings

logger = logging.getLogger("app.ai.embeddings")


@lru_cache
def _model():
    import truststore

    truststore.inject_into_ssl()
    from fastembed import TextEmbedding

    logger.info("Loading embedding model %s (first run downloads it)", settings.EMBEDDING_MODEL)
    return TextEmbedding(model_name=settings.EMBEDDING_MODEL, cache_dir=str(settings.ai_cache_dir))


def embed_documents(texts: Iterable[str], *, batch_size: int = 64) -> list[list[float]]:
    return [vector.tolist() for vector in _model().embed(list(texts), batch_size=batch_size)]


def embed_query(text: str) -> list[float]:
    model = _model()
    # Some models expose a dedicated query path; fall back to plain embed.
    if hasattr(model, "query_embed"):
        return next(iter(model.query_embed(text))).tolist()
    return next(iter(model.embed([text]))).tolist()


def warm_up() -> None:
    """Load the model now rather than on the first user question."""
    embed_query("warm up")
