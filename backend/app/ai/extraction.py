"""Turn an uploaded file into pages of text.

Everything here is synchronous and CPU-bound (call it through
`asyncio.to_thread`). It never talks to a model: a page whose text cannot be
read directly comes back with an `image` instead, and the caller decides
whether to OCR it.

The file type is decided from the bytes, not from the name or the browser's
Content-Type, both of which the uploader controls.
"""

from __future__ import annotations

import io
import re
import zipfile
from dataclasses import dataclass
from typing import Literal

FileKind = Literal["pdf", "image", "docx", "text"]

# A PDF page with fewer characters than this is treated as a scan and rendered
# for OCR (a stray page number or watermark is not "the text of the page").
MIN_PAGE_TEXT_CHARS = 40
# Longest side of an image sent for OCR. Large enough for small print on an ID
# card, small enough to stay well under the provider's request-size limit.
MAX_IMAGE_SIDE = 2000
PDF_RENDER_DPI = 170
# Characters stored per document; far beyond any contract, it only stops a
# pathological file from producing a record MongoDB will not accept.
MAX_TOTAL_CHARS = 2_000_000

_URDU_SCRIPT = re.compile(r"[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]")
_LATIN = re.compile(r"[A-Za-z]")

MIME_BY_KIND: dict[str, str] = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text": "text/plain",
}


class UnreadableFile(ValueError):
    """The bytes are of a supported type but could not be opened (corrupt, encrypted)."""


@dataclass
class Sniffed:
    kind: FileKind
    mime: str
    extension: str


@dataclass
class PageDraft:
    page: int
    text: str = ""
    # JPEG bytes to OCR when `text` is missing; None when the text was read directly.
    image: bytes | None = None


def sniff(data: bytes, filename: str = "") -> Sniffed | None:
    """Identify a supported file by its content. None means "not supported"."""
    head = data[:16]
    name = filename.lower()

    if data[:1024].lstrip().startswith(b"%PDF-"):
        return Sniffed("pdf", MIME_BY_KIND["pdf"], "pdf")
    if head.startswith(b"\xff\xd8\xff"):
        return Sniffed("image", "image/jpeg", "jpg")
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return Sniffed("image", "image/png", "png")
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return Sniffed("image", "image/webp", "webp")
    if head.startswith(b"PK\x03\x04"):
        # A .docx is a zip with a word/document.xml inside; any other zip is refused.
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                if "word/document.xml" in archive.namelist():
                    return Sniffed("docx", MIME_BY_KIND["docx"], "docx")
        except zipfile.BadZipFile:
            return None
        return None
    if name.endswith(".txt") and b"\x00" not in data[:4096]:
        return Sniffed("text", MIME_BY_KIND["text"], "txt")
    return None


def prepare_image(data: bytes) -> bytes:
    """Photo -> upright, reasonably sized JPEG for the vision model."""
    from PIL import Image, ImageOps, UnidentifiedImageError

    try:
        with Image.open(io.BytesIO(data)) as image:
            # Phone cameras store rotation in EXIF; without this a portrait
            # photo of a card reaches the model lying on its side.
            image = ImageOps.exif_transpose(image)
            if image.mode not in ("RGB", "L"):
                image = image.convert("RGB")
            image.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE))
            out = io.BytesIO()
            image.save(out, format="JPEG", quality=88)
            return out.getvalue()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise UnreadableFile("image could not be opened") from exc


def _clean(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n").replace("\x00", "")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _pdf_pages(data: bytes) -> list[PageDraft]:
    import pymupdf

    try:
        document = pymupdf.open(stream=data, filetype="pdf")
    except Exception as exc:  # noqa: BLE001 - MuPDF raises several unrelated types
        raise UnreadableFile("PDF could not be opened") from exc

    with document:
        if document.needs_pass:
            raise UnreadableFile("PDF is password-protected")
        pages: list[PageDraft] = []
        for index, page in enumerate(document, start=1):
            text = _clean(page.get_text())
            if len(text) >= MIN_PAGE_TEXT_CHARS:
                pages.append(PageDraft(page=index, text=text))
                continue
            # No usable text layer: a scan. Keep whatever little text there was
            # in case OCR is unavailable, and hand back an image of the page.
            pixmap = page.get_pixmap(dpi=PDF_RENDER_DPI)
            pages.append(
                PageDraft(page=index, text=text, image=pixmap.tobytes("jpeg", jpg_quality=85))
            )
        return pages


def _docx_pages(data: bytes) -> list[PageDraft]:
    import docx
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    try:
        document = docx.Document(io.BytesIO(data))
    except Exception as exc:  # noqa: BLE001
        raise UnreadableFile("Word file could not be opened") from exc

    # Walk the body in order so a table stays where it sits between paragraphs.
    lines: list[str] = []
    for block in document.iter_inner_content():
        if isinstance(block, Paragraph):
            lines.append(block.text)
        elif isinstance(block, Table):
            for row in block.rows:
                cells: list[str] = []
                for cell in row.cells:
                    value = cell.text.strip()
                    # Merged cells repeat; keep each value once per row.
                    if value and (not cells or cells[-1] != value):
                        cells.append(value)
                if cells:
                    lines.append(" | ".join(cells))
    # A .docx has no fixed pages (they depend on the printer), so it is one page.
    return [PageDraft(page=1, text=_clean("\n".join(lines)))]


def _text_pages(data: bytes) -> list[PageDraft]:
    for encoding in ("utf-8-sig", "utf-16", "cp1252"):
        try:
            return [PageDraft(page=1, text=_clean(data.decode(encoding)))]
        except (UnicodeDecodeError, UnicodeError):
            continue
    raise UnreadableFile("text file is not in a readable encoding")


def extract_pages(data: bytes, kind: FileKind) -> list[PageDraft]:
    """Pages of the file. Image-only pages carry `image` for the OCR step."""
    if kind == "pdf":
        return _pdf_pages(data)
    if kind == "docx":
        return _docx_pages(data)
    if kind == "text":
        return _text_pages(data)
    return [PageDraft(page=1, image=prepare_image(data))]


def detect_language(text: str) -> Literal["en", "ur"]:
    """Dominant script of a document: Urdu when Urdu letters outnumber Latin ones."""
    urdu = len(_URDU_SCRIPT.findall(text))
    latin = len(_LATIN.findall(text))
    return "ur" if urdu > latin else "en"
