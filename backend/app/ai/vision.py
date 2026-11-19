"""OCR by vision model: read the text out of a scanned page or a photo.

Primary: Groq (same key as the chat). Fallback: Google Gemini. Only
`read_image()` is used by the rest of the app, mirroring `llm.generate()`.

The image is sent to the provider. That is a deliberate product choice (a
vision model reads Urdu and poor phone photos far better than a local OCR
engine), and it is why the Documents page tells the user so.
"""

from __future__ import annotations

import base64
import logging

import httpx

from app.ai.llm import LLMUnavailable
from app.core.config import settings

logger = logging.getLogger("app.ai.vision")

# Returned by the model when the picture has no writing on it at all.
NO_TEXT = "NO_TEXT"

OCR_PROMPT = f"""You are an OCR engine. Transcribe ALL text visible in this image.

Rules:
- Copy the text exactly as written. Do not translate, summarise, correct or explain.
- Keep Urdu in Urdu script and English in English. Keep numbers, dates and ID numbers \
digit for digit.
- Follow the natural reading order and keep line breaks. For a form or an ID card, write \
each label with its value on one line, e.g. "Name: Muhammad Ali".
- If a word is unreadable write [illegible] instead of guessing.
- Output plain text only: no Markdown, no commentary before or after.
- If the image contains no text at all, reply with exactly {NO_TEXT}."""


def _data_url(image: bytes, mime: str) -> str:
    return f"data:{mime};base64,{base64.b64encode(image).decode('ascii')}"


async def _groq(image: bytes, mime: str, prompt: str, *, max_tokens: int) -> str:
    if not settings.GROQ_API_KEY or settings.GROQ_API_KEY.startswith("PASTE_"):
        raise LLMUnavailable("GROQ_API_KEY is not set")
    payload = {
        "model": settings.GROQ_VISION_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": _data_url(image, mime)}},
                ],
            }
        ],
        "temperature": 0.0,
        "max_tokens": max_tokens,
    }
    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
            json=payload,
        )
    if response.status_code != 200:
        raise LLMUnavailable(f"Groq vision {response.status_code}: {response.text[:200]}")
    choice = response.json()["choices"][0]
    text = (choice["message"].get("content") or "").strip()
    if not text:
        raise LLMUnavailable(
            f"Groq vision returned nothing (finish_reason={choice.get('finish_reason')!r})"
        )
    return text


async def _gemini(image: bytes, mime: str, prompt: str, *, max_tokens: int) -> str:
    if not settings.GEMINI_API_KEY:
        raise LLMUnavailable("GEMINI_API_KEY is not set")
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"mime_type": mime, "data": base64.b64encode(image).decode("ascii")}},
                ],
            }
        ],
        "generationConfig": {"temperature": 0.0, "maxOutputTokens": max_tokens},
    }
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    )
    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(url, json=payload)
    if response.status_code != 200:
        raise LLMUnavailable(f"Gemini vision {response.status_code}: {response.text[:200]}")
    data = response.json()
    try:
        text = (data["candidates"][0]["content"]["parts"][0]["text"] or "").strip()
    except (KeyError, IndexError) as exc:
        raise LLMUnavailable("Gemini vision returned no text") from exc
    if not text:
        raise LLMUnavailable("Gemini vision returned an empty answer")
    return text


async def read_image(
    image: bytes,
    mime: str = "image/jpeg",
    *,
    prompt: str = OCR_PROMPT,
    max_tokens: int = 4096,
) -> tuple[str, str]:
    """Return (text, provider). Text is "" when the image has no writing.

    Raises `LLMUnavailable` when no provider could read the image (no key, quota,
    network), so the caller can mark the document as failed with a clear reason.
    """
    errors: list[str] = []
    for provider, call in (("groq", _groq), ("gemini", _gemini)):
        try:
            text = await call(image, mime, prompt, max_tokens=max_tokens)
        except (LLMUnavailable, httpx.HTTPError) as exc:
            logger.warning("%s vision failed: %s", provider, exc)
            errors.append(f"{provider}: {exc}")
            continue
        return ("" if text.strip() == NO_TEXT else text), provider
    raise LLMUnavailable("; ".join(errors))
