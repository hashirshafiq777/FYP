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


def _supports_reasoning_effort(model: str) -> bool:
    """Only reasoning models accept the parameter; others reject it with a 400."""
    return "gpt-oss" in model.lower()


@dataclass
class Message:
    role: str  # "system" | "user" | "assistant"
    content: str


async def _groq(messages: list[Message], *, temperature: float, max_tokens: int) -> str:
    if not settings.GROQ_API_KEY or settings.GROQ_API_KEY.startswith("PASTE_"):
        raise LLMUnavailable("GROQ_API_KEY is not set")
    payload: dict[str, object] = {
        "model": settings.GROQ_MODEL,
        "messages": [{"role": m.role, "content": m.content} for m in messages],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    # gpt-oss reasons before it answers, and that reasoning is charged against
    # max_tokens. Left at the default effort it can consume the whole budget and
    # return an EMPTY `content` with finish_reason="length" - which looked like a
    # blank reply in the UI. "low" keeps reasoning short so the answer fits.
    if _supports_reasoning_effort(settings.GROQ_MODEL) and settings.LLM_REASONING_EFFORT:
        payload["reasoning_effort"] = settings.LLM_REASONING_EFFORT
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
            json=payload,
        )
    if response.status_code != 200:
        raise LLMUnavailable(f"Groq {response.status_code}: {response.text[:200]}")
    data = response.json()
    choice = data["choices"][0]
    # `content` can be null as well as empty, so do not call .strip() on it blind.
    text = (choice["message"].get("content") or "").strip()
    if not text:
        raise LLMUnavailable(
            f"Groq returned an empty answer (finish_reason="
            f"{choice.get('finish_reason')!r}); the reasoning budget was probably exhausted"
        )
    return text


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
        text = (data["candidates"][0]["content"]["parts"][0]["text"] or "").strip()
    except (KeyError, IndexError) as exc:
        raise LLMUnavailable(f"Gemini returned no text: {data}") from exc
    if not text:
        raise LLMUnavailable("Gemini returned an empty answer")
    return text


async def generate(
    messages: list[Message],
    *,
    temperature: float = 0.2,
    max_tokens: int | None = None,
    prefer: str | None = None,
) -> tuple[str, str]:
    """Return (answer_text, provider_name). Tries Groq, then Gemini.

    A provider that answers with an empty string is treated as a failure, so the
    next provider gets a turn rather than the user being shown a blank reply.
    """
    if max_tokens is None:
        max_tokens = settings.LLM_MAX_TOKENS
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
