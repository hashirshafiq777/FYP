"""Retrieval over the vector store.

Hybrid retrieval, because legal questions are unforgiving:

* **dense** (multilingual embeddings) catches paraphrases and cross-language asks;
* **lexical** (BM25 over the same chunks) catches exact words — "theft", "khula",
  "warrant" — that a small embedding model ranks poorly;
* **section boost**: a question naming "section 302" must surface s. 302 even if
  neither ranker puts it first, preferring the statute the question names;
* the question is first **expanded** with English statute vocabulary from the
  Roman-Urdu/Urdu glossary and, when available, an LLM rewrite.

The lists are merged with reciprocal rank fusion, so no score calibration is
needed between the two rankers.
"""

from __future__ import annotations

import asyncio
import logging
import re
import threading
from typing import Any

from app.ai import embeddings, glossary, vector_store
from app.ai.rewrite import Rewrite
from app.ai.vector_store import LAW_COLLECTION, USER_DOCS_COLLECTION, Hit
from app.core.config import settings
from app.schemas.chat import Source

logger = logging.getLogger("app.knowledge")

_SECTION_IN_QUESTION = re.compile(
    r"\b(?:section|sec|s|article|art|dafa|dafah|دفعہ|آرٹیکل)\.?\s*(\d{1,4}[A-Za-z]{0,3})\b", re.IGNORECASE
)

# (needle in statute title, short name for citations, aliases a user might type)
_STATUTES: list[tuple[str, str, list[str]]] = [
    ("constitution of the islamic republic of pakistan", "Constitution", ["constitution", "aain", "aaeen", "آئین", "article"]),
    ("pakistan penal code", "Pakistan Penal Code", ["ppc", "penal code", "tazirat", "تعزیرات"]),
    ("code of criminal procedure", "CrPC", ["crpc", "cr.p.c", "criminal procedure", "zabta faujdari"]),
    ("code of civil procedure", "CPC", ["cpc", "c.p.c", "civil procedure"]),
    ("qanun-e-shahadat", "Qanun-e-Shahadat", ["qanun-e-shahadat", "qanoon e shahadat", "evidence order", "qso"]),
    ("prevention of electronic crimes", "PECA 2016", ["peca", "electronic crimes", "cyber crime", "cybercrime"]),
    ("muslim family laws ordinance", "Muslim Family Laws Ordinance 1961", ["mflo", "family laws ordinance"]),
    ("dissolution of muslim marriages", "Dissolution of Muslim Marriages Act 1939", ["dissolution of muslim marriages"]),
    ("family courts act", "Family Courts Act 1964", ["family court"]),
    ("guardians and wards", "Guardians and Wards Act 1890", ["guardians and wards", "guardian"]),
    ("transfer of property act", "Transfer of Property Act 1882", ["transfer of property"]),
    ("contract act", "Contract Act 1872", ["contract act"]),
    ("specific relief act", "Specific Relief Act 1877", ["specific relief"]),
    ("registration act", "Registration Act 1908", ["registration act"]),
    ("limitation act", "Limitation Act 1908", ["limitation act"]),
    ("anti terrorism act", "Anti-Terrorism Act 1997", ["ata", "anti-terrorism", "anti terrorism"]),
    ("control of narcotic", "Control of Narcotic Substances Act 1997", ["cnsa", "narcotic"]),
    ("illegal dispossession", "Illegal Dispossession Act 2005", ["illegal dispossession"]),
    ("companies act", "Companies Act 2017", ["companies act"]),
    ("elections act", "Elections Act 2017", ["elections act"]),
    ("juvenile justice", "Juvenile Justice System Act 2018", ["juvenile"]),
    ("consumers protection", "Islamabad Consumers Protection Act 1995", ["consumer protection"]),
]


def short_title(title: str) -> str:
    lowered = title.lower()
    for needle, short, _ in _STATUTES:
        if needle in lowered:
            return short
    return title


def statutes_named(text: str) -> list[str]:
    """Title needles of statutes the text explicitly mentions (by alias or short name)."""
    lowered = text.lower()
    named: list[str] = []
    for needle, short, aliases in _STATUTES:
        if short.lower() in lowered or needle in lowered or any(alias in lowered for alias in aliases):
            named.append(needle)
    return named


def label_for(meta: dict[str, Any]) -> str:
    kind = meta.get("kind", "statute")
    title = str(meta.get("title", "Unknown source"))
    if kind == "guide":
        return f"Guide: {title}"
    if kind == "case":
        return f"Case: {title}"
    if kind == "document":
        page = meta.get("page")
        return f"{title} p. {page}" if page else title
    section = meta.get("section")
    short = short_title(title)
    if section:
        unit = "Art." if short == "Constitution" else "s."
        return f"{short} {unit} {section}"
    return short


def to_source(hit: Hit) -> Source:
    meta = hit.metadata
    excerpt = hit.text if len(hit.text) <= 600 else hit.text[:600].rsplit(" ", 1)[0] + " …"
    page = meta.get("page")
    return Source(
        label=label_for(meta),
        title=str(meta.get("title", "")),
        section=str(meta["section"]) if meta.get("section") else None,
        category=meta.get("category"),
        kind=meta.get("kind", "statute"),
        url=meta.get("url") or None,
        page=int(page) if page not in (None, "") else None,
        excerpt=excerpt,
        score=round(hit.score, 4),
    )


# ------------------------------------------------------------- lexical index


class _Lexical:
    """BM25 over every chunk of a collection, built once per process on first use."""

    def __init__(self, collection_name: str) -> None:
        self.collection_name = collection_name
        self._lock = threading.Lock()
        self._bm25 = None
        self._hits: list[Hit] = []
        self._built_for = -1  # chunk count the index was built from

    @staticmethod
    def _tokens(text: str) -> list[str]:
        return re.findall(r"[a-z0-9]+(?:-[a-z0-9]+)*", text.lower())

    def _build(self) -> None:
        from rank_bm25 import BM25Okapi

        coll = vector_store.collection(self.collection_name)
        total = coll.count()
        hits: list[Hit] = []
        step = 2000
        for offset in range(0, total, step):
            batch = coll.get(limit=step, offset=offset, include=["documents", "metadatas"])
            for id_, doc, meta in zip(batch["ids"], batch["documents"], batch["metadatas"]):
                hits.append(Hit(id=id_, text=doc, metadata=meta or {}, score=0.0))
        corpus = [self._tokens(f"{h.metadata.get('title', '')} {h.text}") for h in hits]
        self._bm25 = BM25Okapi(corpus) if corpus else None
        self._hits = hits
        self._built_for = total
        logger.info("BM25 index built over %d chunks of %s", total, self.collection_name)

    def search(self, query: str, k: int) -> list[Hit]:
        with self._lock:
            if self._built_for != vector_store.count(self.collection_name):
                self._build()
            if self._bm25 is None:
                return []
            scores = self._bm25.get_scores(self._tokens(query))
        ranked = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:k]
        return [
            Hit(id=self._hits[i].id, text=self._hits[i].text, metadata=self._hits[i].metadata, score=float(scores[i]))
            for i in ranked
            if scores[i] > 0
        ]


_law_lexical = _Lexical(LAW_COLLECTION)


def _lexical(query: str, k: int) -> list[Hit]:
    try:
        return _law_lexical.search(query, k)
    except Exception as exc:  # noqa: BLE001 - lexical search is an improvement, not a dependency
        logger.warning("BM25 search failed: %s", exc)
        return []


# ------------------------------------------------------------------ fusion


def _rrf(ranked_lists: list[list[Hit]], *, k: int, constant: int = 60) -> list[Hit]:
    """Reciprocal rank fusion. Each hit keeps the best text/metadata it was seen with."""
    scores: dict[str, float] = {}
    seen: dict[str, Hit] = {}
    for hits in ranked_lists:
        for rank, hit in enumerate(hits):
            scores[hit.id] = scores.get(hit.id, 0.0) + 1.0 / (constant + rank + 1)
            seen.setdefault(hit.id, hit)
    order = sorted(scores, key=lambda id_: scores[id_], reverse=True)[:k]
    return [Hit(id=id_, text=seen[id_].text, metadata=seen[id_].metadata, score=round(scores[id_], 5)) for id_ in order]


def _section_hits(vector: list[float], number: str, preferred: list[str], k: int = 3) -> list[Hit]:
    """Chunks whose section label equals `number`, preferring the statutes named in the question."""
    hits = vector_store.query(LAW_COLLECTION, vector, k=max(k, 10), where={"section": number})
    if preferred:
        def rank(hit: Hit) -> int:
            title = str(hit.metadata.get("title", "")).lower()
            return 0 if any(needle in title for needle in preferred) else 1
        hits.sort(key=rank)
    return hits[:k]


def build_search_text(question: str, rewrite: Rewrite | None) -> str:
    """What is actually embedded / matched: question + glossary + LLM rewrite."""
    parts = [question]
    expanded = glossary.expand(question)
    if expanded:
        parts.append(expanded)
    if rewrite is not None:
        parts.append(rewrite.query)
        parts.extend(rewrite.statutes)
    return " ".join(parts)


def _retrieve_law_sync(question: str, k: int, rewrite: Rewrite | None = None) -> list[Hit]:
    search_text = build_search_text(question, rewrite)
    vector = embeddings.embed_query(search_text)

    dense = vector_store.query(LAW_COLLECTION, vector, k=k * 2)
    lexical = _lexical(search_text, k * 2)
    fused = _rrf([dense, lexical], k=k)

    # Exact section/article numbers named in the question (or by the rewrite) go first.
    preferred = statutes_named(question) + (
        [needle for needle, _, _ in _STATUTES if any(needle in s.lower() for s in rewrite.statutes)]
        if rewrite
        else []
    )
    numbers: list[str] = []
    for match in _SECTION_IN_QUESTION.finditer(question):
        numbers.append(match.group(1).upper())
    if rewrite:
        numbers.extend(n for n in rewrite.sections if n not in numbers)

    boosted: list[Hit] = []
    for number in numbers[:4]:
        boosted.extend(_section_hits(vector, number, preferred, k=2 if rewrite and number not in question else 3))

    merged: list[Hit] = []
    seen: set[str] = set()
    for hit in boosted + fused:
        if hit.id in seen:
            continue
        seen.add(hit.id)
        merged.append(hit)
    return merged[:k]


def _retrieve_document_sync(question: str, owner_id: str, document_id: str, k: int) -> list[Hit]:
    vector = embeddings.embed_query(question)
    where = {"$and": [{"owner_id": owner_id}, {"document_id": document_id}]}
    return vector_store.query(USER_DOCS_COLLECTION, vector, k=k, where=where)


async def retrieve_law(question: str, *, k: int | None = None, rewrite: Rewrite | None = None) -> list[Hit]:
    """Embedding + Chroma + BM25 are CPU-bound and synchronous; keep the event loop free."""
    return await asyncio.to_thread(_retrieve_law_sync, question, k or settings.RAG_TOP_K, rewrite)


async def retrieve_document(question: str, *, owner_id: str, document_id: str, k: int | None = None) -> list[Hit]:
    return await asyncio.to_thread(
        _retrieve_document_sync, question, owner_id, document_id, k or settings.RAG_TOP_K
    )


def law_chunk_count() -> int:
    return vector_store.count(LAW_COLLECTION)
