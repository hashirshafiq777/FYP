"""Split long legal text into retrieval-sized chunks.

Statutes are naturally sectioned ("302. Punishment of qatl-i-amd.—"), so the
splitter prefers to cut at section/article boundaries and only falls back to a
plain sliding window when a section is too long. Each chunk keeps the section
heading it belongs to so a retrieved chunk can be cited as "PPC s. 302".
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

# A section/article start at the beginning of a line:
#   "302. Punishment..."   "25A. Right to education"   "Article 19. Freedom of speech"
_SECTION_RE = re.compile(
    r"^(?:(?:Article|Section|Sec\.|Art\.)\s+)?(\d{1,4}[A-Z]{0,3})\s*[.\-–—:]\s+(?=\S)",
    re.MULTILINE,
)

DEFAULT_CHUNK_CHARS = 1400
DEFAULT_OVERLAP_CHARS = 200
MIN_CHUNK_CHARS = 200


@dataclass
class Chunk:
    text: str
    section: str | None = None
    index: int = 0
    metadata: dict[str, str] = field(default_factory=dict)


def _window(text: str, size: int, overlap: int) -> list[str]:
    pieces: list[str] = []
    start = 0
    while start < len(text):
        end = min(len(text), start + size)
        # Prefer to end on a sentence or line boundary.
        if end < len(text):
            cut = max(text.rfind("\n", start + size // 2, end), text.rfind(". ", start + size // 2, end))
            if cut > start:
                end = cut + 1
        pieces.append(text[start:end].strip())
        if end >= len(text):
            break
        start = max(end - overlap, start + 1)
    return [piece for piece in pieces if piece]


def split_sections(text: str) -> list[tuple[str | None, str]]:
    """Return (section_label, section_text) pairs; label is None for preamble."""
    matches = list(_SECTION_RE.finditer(text))
    if not matches:
        return [(None, text)]

    sections: list[tuple[str | None, str]] = []
    preamble = text[: matches[0].start()].strip()
    if preamble:
        sections.append((None, preamble))

    for i, match in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[match.start() : end].strip()
        if body:
            sections.append((match.group(1), body))
    return sections


def chunk_text(
    text: str,
    *,
    chunk_chars: int = DEFAULT_CHUNK_CHARS,
    overlap_chars: int = DEFAULT_OVERLAP_CHARS,
) -> list[Chunk]:
    chunks: list[Chunk] = []
    buffer = ""
    buffer_section: str | None = None

    def flush() -> None:
        nonlocal buffer, buffer_section
        if buffer.strip():
            chunks.append(Chunk(text=buffer.strip(), section=buffer_section, index=len(chunks)))
        buffer = ""
        buffer_section = None

    for section, body in split_sections(text):
        if len(body) > chunk_chars:
            flush()
            for piece in _window(body, chunk_chars, overlap_chars):
                chunks.append(Chunk(text=piece, section=section, index=len(chunks)))
            continue

        # Pack several short sections into one chunk so tiny definitions are
        # not retrieved without their neighbours.
        if buffer and len(buffer) + len(body) + 2 > chunk_chars:
            flush()
        if not buffer:
            buffer_section = section
        buffer = f"{buffer}\n\n{body}" if buffer else body

    flush()

    # Merge a trailing runt into the previous chunk, but only when it carries no
    # section of its own: a short final section must stay retrievable by number.
    if len(chunks) >= 2 and len(chunks[-1].text) < MIN_CHUNK_CHARS and chunks[-1].section is None:
        last = chunks.pop()
        chunks[-1].text = f"{chunks[-1].text}\n\n{last.text}"

    for i, chunk in enumerate(chunks):
        chunk.index = i
    return chunks
