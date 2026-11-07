"""Guards on the LLM wrapper.

The bug these cover: `openai/gpt-oss-20b` is a *reasoning* model, and Groq
charges its hidden reasoning against `max_tokens`. With the old 1024-token
budget the reasoning sometimes consumed the lot, Groq replied 200 OK with an
EMPTY `content` and `finish_reason="length"`, and the app cheerfully stored and
rendered that as a blank answer bubble.

So: an empty completion must be treated as a provider failure, not an answer.
"""

from __future__ import annotations

import httpx
import pytest

from app.ai import llm
from app.ai.llm import LLMUnavailable, Message
from app.core.config import settings

MESSAGES = [Message(role="user", content="hello")]


class FakeResponse:
    def __init__(self, payload: dict, status_code: int = 200) -> None:
        self._payload = payload
        self.status_code = status_code
        self.text = str(payload)

    def json(self) -> dict:
        return self._payload


def groq_payload(content, finish_reason: str = "stop") -> dict:
    return {"choices": [{"finish_reason": finish_reason, "message": {"content": content}}]}


@pytest.fixture
def captured(monkeypatch: pytest.MonkeyPatch) -> dict:
    """Capture the request body the wrapper would send, and script the reply."""
    box: dict = {"payload": None, "reply": groq_payload("A real answer.")}

    async def fake_post(self, url, **kwargs):  # noqa: ANN001, ARG001
        box["payload"] = kwargs.get("json")
        reply = box["reply"]
        return FakeResponse(reply) if isinstance(reply, dict) else reply

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    monkeypatch.setattr(settings, "GROQ_API_KEY", "gsk_test_key", raising=False)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "", raising=False)
    return box


async def test_a_normal_answer_comes_through(captured: dict) -> None:
    text, provider = await llm.generate(MESSAGES)
    assert text == "A real answer."
    assert provider == "groq"


@pytest.mark.parametrize(
    ("content", "label"),
    [("", "empty string"), ("   \n  ", "whitespace only"), (None, "null content")],
)
async def test_an_empty_completion_is_a_failure_not_an_answer(
    captured: dict, content, label: str
) -> None:
    """The blank-bubble bug: this must raise rather than return ""."""
    captured["reply"] = groq_payload(content, finish_reason="length")

    with pytest.raises(LLMUnavailable) as caught:
        await llm.generate(MESSAGES)

    # The reason is spelled out, so the log says why instead of just "failed".
    assert "empty" in str(caught.value).lower(), f"unhelpful message for {label}"


async def test_an_empty_groq_reply_falls_back_to_the_next_provider(
    captured: dict, monkeypatch: pytest.MonkeyPatch
) -> None:
    """With a second provider configured, an empty answer must not end the attempt."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "fake-gemini-key", raising=False)
    captured["reply"] = groq_payload("", finish_reason="length")

    async def fake_gemini(messages, *, temperature, max_tokens):  # noqa: ANN001, ARG001
        return "Gemini answered instead."

    monkeypatch.setattr(llm, "_gemini", fake_gemini)

    text, provider = await llm.generate(MESSAGES)
    assert text == "Gemini answered instead."
    assert provider == "gemini"


async def test_reasoning_effort_is_sent_for_gpt_oss(
    captured: dict, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "GROQ_MODEL", "openai/gpt-oss-20b", raising=False)
    await llm.generate(MESSAGES)
    assert captured["payload"]["reasoning_effort"] == settings.LLM_REASONING_EFFORT


async def test_reasoning_effort_is_not_sent_to_models_that_reject_it(
    captured: dict, monkeypatch: pytest.MonkeyPatch
) -> None:
    """A non-reasoning model answers 400 if the parameter is present."""
    monkeypatch.setattr(settings, "GROQ_MODEL", "llama-3.3-70b-versatile", raising=False)
    await llm.generate(MESSAGES)
    assert "reasoning_effort" not in captured["payload"]


async def test_the_token_budget_leaves_room_for_reasoning_plus_an_answer(
    captured: dict,
) -> None:
    await llm.generate(MESSAGES)
    sent = captured["payload"]["max_tokens"]
    assert sent == settings.LLM_MAX_TOKENS
    # 1024 was the value that produced blank answers; the default must exceed it.
    assert sent > 1024


async def test_an_explicit_budget_still_wins(captured: dict) -> None:
    await llm.generate(MESSAGES, max_tokens=512)
    assert captured["payload"]["max_tokens"] == 512


async def test_a_non_200_from_groq_is_reported(captured: dict) -> None:
    captured["reply"] = FakeResponse({"error": {"message": "Rate limit reached"}}, status_code=429)

    with pytest.raises(LLMUnavailable) as caught:
        await llm.generate(MESSAGES)
    assert "429" in str(caught.value)


def test_configured_providers_ignores_the_placeholder_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "GROQ_API_KEY", "PASTE_YOUR_GROQ_KEY_HERE", raising=False)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "", raising=False)
    assert llm.configured_providers() == []
