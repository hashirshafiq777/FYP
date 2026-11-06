"""Build (or rebuild) the shared Pakistan-law vector index.

Reads:
    knowledge/laws/text/*.txt      statutes (made by `scripts.fetch_laws --extract`)
    knowledge/cases/*.md           court-judgment / landmark-case summaries

Writes:
    data/chroma/                   ChromaDB collection "pakistan_law"

Usage (from backend/, venv active):
    python -m scripts.build_index            # add/refresh everything
    python -m scripts.build_index --reset    # wipe the collection first

Re-running is safe: chunk ids are deterministic (file + chunk index), so an
unchanged file is upserted in place.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import time
from pathlib import Path

from app.ai import embeddings, vector_store
from app.ai.chunking import chunk_text
from app.ai.vector_store import LAW_COLLECTION
from app.core.config import settings

LAW_TEXT_DIR = settings.knowledge_dir / "laws" / "text"
LAW_MANIFEST = settings.knowledge_dir / "laws" / "manifest.json"
CASES_DIR = settings.knowledge_dir / "cases"
GUIDES_DIR = settings.knowledge_dir / "guides"
CATEGORIES_FILE = settings.knowledge_dir / "categories.json"


def _category_for(title: str, categories: dict[str, list[str]]) -> str:
    lowered = title.lower()
    for category, needles in categories.items():
        if any(needle.lower() in lowered for needle in needles):
            return category
    return "general"


def _parse_front_matter(text: str) -> tuple[dict[str, str], str]:
    """Very small YAML-ish front matter: lines of `key: value` between --- fences."""
    if not text.startswith("---"):
        return {}, text
    end = text.find("\n---", 3)
    if end == -1:
        return {}, text
    meta: dict[str, str] = {}
    for line in text[3:end].strip().splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            meta[key.strip()] = value.strip().strip('"')
    return meta, text[end + 4 :].lstrip()


def _doc_id(path: Path) -> str:
    return hashlib.sha1(path.name.encode("utf-8")).hexdigest()[:12]


_PAGE_LINE = re.compile(r"^\s*Page \d+ of \d+\s*$", re.MULTILINE)


def clean_statute_text(text: str) -> str:
    """Undo PDF-extraction noise: soft hyphens, page footers, runs of blank lines."""
    text = text.replace("­", "").replace(" ", " ")
    text = _PAGE_LINE.sub("", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def load_statutes(categories: dict[str, list[str]]) -> list[dict]:
    manifest = {}
    if LAW_MANIFEST.exists():
        for entry in json.loads(LAW_MANIFEST.read_text(encoding="utf-8")):
            manifest[Path(entry["file"]).stem] = entry
    docs = []
    for path in sorted(LAW_TEXT_DIR.glob("*.txt")):
        text = path.read_text(encoding="utf-8", errors="ignore")
        title_match = re.match(r"TITLE: (.+)\nSOURCE: (\S+)", text)
        if title_match:
            title, url = title_match.group(1).strip(), title_match.group(2).strip()
            body = text[title_match.end() :].strip()
        else:
            entry = manifest.get(path.stem, {})
            title, url, body = entry.get("title", path.stem), entry.get("page", ""), text
        docs.append(
            {
                "doc_id": _doc_id(path),
                "title": title,
                "url": url,
                "kind": "statute",
                "category": _category_for(title, categories),
                "text": clean_statute_text(body),
            }
        )
    return docs


def load_cases() -> list[dict]:
    docs = []
    for path in sorted(CASES_DIR.glob("*.md")):
        meta, body = _parse_front_matter(path.read_text(encoding="utf-8", errors="ignore"))
        docs.append(
            {
                "doc_id": _doc_id(path),
                "title": meta.get("title", path.stem.replace("_", " ")),
                "url": meta.get("url", ""),
                "kind": "case",
                "category": meta.get("category", "cases"),
                "court": meta.get("court", ""),
                "citation": meta.get("citation", ""),
                "year": meta.get("year", ""),
                "text": body,
            }
        )
    return docs


def load_guides() -> list[dict]:
    """Load practical, source-linked legal information guides for citizens."""
    docs = []
    for path in sorted(GUIDES_DIR.glob("*.md")):
        meta, body = _parse_front_matter(path.read_text(encoding="utf-8", errors="ignore"))
        docs.append(
            {
                "doc_id": _doc_id(path),
                "title": meta.get("title", path.stem.replace("_", " ")),
                "url": meta.get("url", ""),
                "kind": "guide",
                "category": meta.get("category", "practical-guidance"),
                "text": body,
            }
        )
    return docs


def load_all_documents(categories: dict[str, list[str]] | None = None) -> list[dict]:
    """Load the committed statutes, cases, and practical guides."""
    if categories is None:
        categories = json.loads(CATEGORIES_FILE.read_text(encoding="utf-8")) if CATEGORIES_FILE.exists() else {}
    return load_statutes(categories) + load_cases() + load_guides()


def _source_fingerprint(docs: list[dict]) -> str:
    digest = hashlib.sha256()
    for doc in docs:
        digest.update(doc["doc_id"].encode("utf-8"))
        digest.update(doc["title"].encode("utf-8"))
        digest.update(doc["text"].encode("utf-8"))
    return digest.hexdigest()


def ensure_knowledge_base() -> int:
    """Build the local index on first app launch and refresh it when sources change."""
    docs = load_all_documents()
    if not docs:
        raise RuntimeError("No law knowledge sources found in backend/knowledge")

    fingerprint = _source_fingerprint(docs)
    marker = settings.ai_data_dir / "knowledge-index.sha256"
    current = marker.read_text(encoding="utf-8").strip() if marker.exists() else ""
    if current == fingerprint and vector_store.count(LAW_COLLECTION) > 0:
        return 0

    if vector_store.count(LAW_COLLECTION) > 0:
        try:
            vector_store._client().delete_collection(LAW_COLLECTION)  # noqa: SLF001
            print("knowledge sources changed; rebuilding the local index")
        except Exception:  # noqa: BLE001
            pass

    print(f"building local knowledge index from {len(docs)} committed documents")
    embeddings.warm_up()
    total = index_documents(docs)
    settings.ai_data_dir.mkdir(parents=True, exist_ok=True)
    marker.write_text(fingerprint + "\n", encoding="utf-8")
    print(f"knowledge index ready: {total} chunks")
    return total


def index_documents(docs: list[dict], *, batch: int = 128) -> int:
    total = 0
    for doc in docs:
        chunks = chunk_text(doc["text"])
        if not chunks:
            continue
        ids = [f"{doc['doc_id']}-{chunk.index:04d}" for chunk in chunks]
        texts = []
        metas = []
        for chunk in chunks:
            # Prefix the title so the embedding "knows" which statute it is from.
            texts.append(f"{doc['title']}\n{chunk.text}")
            meta = {
                "doc_id": doc["doc_id"],
                "title": doc["title"],
                "url": doc.get("url", ""),
                "kind": doc["kind"],
                "category": doc.get("category", "general"),
                "section": chunk.section or "",
                "chunk": chunk.index,
            }
            for extra in ("court", "citation", "year"):
                if doc.get(extra):
                    meta[extra] = doc[extra]
            metas.append(meta)

        started = time.time()
        vectors: list[list[float]] = []
        for start in range(0, len(texts), batch):
            vectors.extend(embeddings.embed_documents(texts[start : start + batch]))
        vector_store.add(LAW_COLLECTION, ids=ids, texts=[c.text for c in chunks], vectors=vectors, metadatas=metas)
        total += len(chunks)
        print(f"  {doc['kind']:7s} {doc['title'][:60]:60s} {len(chunks):5d} chunks  {time.time() - started:5.1f}s")
    return total


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true", help="delete the collection first")
    parser.add_argument("--only", choices=["statutes", "cases", "guides"], help="index one kind only")
    parser.add_argument("--match", help="index only documents whose title contains this text")
    args = parser.parse_args()

    categories: dict[str, list[str]] = {}
    if CATEGORIES_FILE.exists():
        categories = json.loads(CATEGORIES_FILE.read_text(encoding="utf-8"))

    if args.reset:
        try:
            vector_store._client().delete_collection(LAW_COLLECTION)  # noqa: SLF001
            print("collection reset")
        except Exception:  # noqa: BLE001
            pass

    docs: list[dict] = []
    if args.only is None:
        docs.extend(load_all_documents(categories))
    else:
        if args.only == "statutes":
            docs.extend(load_statutes(categories))
        elif args.only == "cases":
            docs.extend(load_cases())
        elif args.only == "guides":
            docs.extend(load_guides())
    if args.match:
        docs = [doc for doc in docs if args.match.casefold() in doc["title"].casefold()]
    if not docs:
        print("nothing to index: run `python -m scripts.fetch_laws --download --extract` first", file=sys.stderr)
        sys.exit(1)

    if args.only is None and not args.match and not args.reset:
        ensure_knowledge_base()
    else:
        print(f"indexing {len(docs)} documents with {settings.EMBEDDING_MODEL}")
        embeddings.warm_up()
        started = time.time()
        total = index_documents(docs)
        print(f"done: {total} chunks, collection now has {vector_store.count(LAW_COLLECTION)} chunks, {time.time() - started:.0f}s")


if __name__ == "__main__":
    main()
