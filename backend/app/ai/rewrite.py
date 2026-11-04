"""Optional LLM query rewrite: turn the user's question into an English retrieval query.

Statutes are English; questions arrive in English, Urdu or Roman Urdu with
everyday words ("khula", "chori"). One short model call maps the question to
the vocabulary and statute the corpus uses. It is best-effort: if the model is
down or slow the caller falls back to the glossary expansion alone.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field

from app.ai import llm
from app.ai.llm import LLMUnavailable, Message

logger = logging.getLogger("app.ai.rewrite")

_PROMPT = """You help a search engine over Pakistani statutes (Constitution 1973, Pakistan Penal Code, \
Code of Criminal Procedure, Qanun-e-Shahadat, family laws, property laws, PECA 2016, etc.).

Rewrite the user's question (which may be in English, Urdu or Roman Urdu) as ONE short English \
search query using the words a statute would use. Also name the most likely statute and section \
or article numbers if you know them. Reply with JSON only, no prose:
{"query": "...", "statutes": ["Pakistan Penal Code"], "sections": ["379", "380"]}

Question: {question}"""


@dataclass
class Rewrite:
    query: str
    statutes: list[str] = field(default_factory=list)
    sections: list[str] = field(default_factory=list)


async def rewrite(question: str) -> Rewrite | None:
    try:
        text, _ = await llm.generate(
            [Message(role="user", content=_PROMPT.replace("{question}", question))],
            temperature=0.0,
            max_tokens=200,
        )
    except LLMUnavailable as exc:
        logger.info("rewrite skipped: %s", exc)
        return None

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None

    query = str(data.get("query") or "").strip()
    if not query:
        return None
    statutes = [str(s).strip() for s in data.get("statutes") or [] if str(s).strip()]
    sections = [str(s).strip().upper() for s in data.get("sections") or [] if str(s).strip()]
    return Rewrite(query=query, statutes=statutes[:3], sections=sections[:5])
