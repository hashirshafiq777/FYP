"""Thin LLM wrapper. Primary: Groq (free tier, fast). Fallback: Google Gemini (free tier).

Only `generate()` is used by the rest of the app, so swapping providers is a
change to this file alone.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

from app.core.config import settings

logger = logging.getLogger("app.ai.llm")


class LLMUnavailable(RuntimeError):
    """No configured provider could answer."""


@dataclass
class Message:
    role: str  # "system" | "user" | "assistant"
    content: str


async def _groq(messages: list[Message], *, temperature: float, max_tokens: int) -> str:
    if not settings.GROQ_API_KEY or settings.GROQ_API_KEY.startswith("PASTE_"):
        raise LLMUnavailable("GROQ_API_KEY is not set")
    payload = {
        "model": settings.GROQ_MODEL,
        "messages": [{"role": m.role, "content": m.content} for m in messages],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
            json=payload,
        )
    if response.status_code != 200:
        raise LLMUnavailable(f"Groq {response.status_code}: {response.text[:200]}")
    data = response.json()
    return data["choices"][0]["message"]["content"].strip()


async def _gemini(messages: list[Message], *, temperature: float, max_tokens: int) -> str:
    if not settings.GEMINI_API_KEY:
        raise LLMUnavailable("GEMINI_API_KEY is not set")
    system = "\n\n".join(m.content for m in messages if m.role == "system")
    contents = [
        {"role": "user" if m.role == "user" else "model", "parts": [{"text": m.content}]}
        for m in messages
        if m.role != "system"
    ]
    payload = {
        "contents": contents,
        "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens},
    }
    if system:
        payload["systemInstruction"] = {"parts": [{"text": system}]}
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
    )
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json=payload)
    if response.status_code != 200:
        raise LLMUnavailable(f"Gemini {response.status_code}: {response.text[:200]}")
    data = response.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except (KeyError, IndexError) as exc:
        raise LLMUnavailable(f"Gemini returned no text: {data}") from exc


async def generate(
    messages: list[Message],
    *,
    temperature: float = 0.2,
    max_tokens: int = 1024,
    prefer: str | None = None,
) -> tuple[str, str]:
    """Return (answer_text, provider_name). Tries Groq, then Gemini."""
    order = ["groq", "gemini"]
    if prefer in order:
        order.remove(prefer)
        order.insert(0, prefer)

    errors: list[str] = []
    for provider in order:
        try:
            if provider == "groq":
                return await _groq(messages, temperature=temperature, max_tokens=max_tokens), "groq"
            return await _gemini(messages, temperature=temperature, max_tokens=max_tokens), "gemini"
        except (LLMUnavailable, httpx.HTTPError) as exc:
            logger.warning("%s failed: %s", provider, exc)
            errors.append(f"{provider}: {exc}")
    raise LLMUnavailable("; ".join(errors))


def configured_providers() -> list[str]:
    providers = []
    if settings.GROQ_API_KEY and not settings.GROQ_API_KEY.startswith("PASTE_"):
        providers.append("groq")
    if settings.GEMINI_API_KEY:
        providers.append("gemini")
    return providers
