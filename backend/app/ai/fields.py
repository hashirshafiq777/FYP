"""Pull the key facts out of a document's text as labelled fields.

One model call turns extracted text into `{kind, summary, fields[]}`. The
fields are what a later agreement form pre-fills from (name, CNIC number,
address ...), so the prompt forbids guessing: a value is either copied from the
text or left out.

Best-effort. If the model is unavailable or answers with something that is not
JSON, the document still becomes `ready` with its text and no fields.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field

from app.ai import llm
from app.ai.llm import LLMUnavailable, Message

logger = logging.getLogger("app.ai.fields")

# Specific kinds the UI has a label for. Anything else is shown as "other".
DOCUMENT_KINDS = (
    "cnic",
    "passport",
    "driving_licence",
    "birth_certificate",
    "nikah_nama",
    "rent_agreement",
    "sale_agreement",
    "employment_contract",
    "agreement",
    "contract",
    "policy",
    "affidavit",
    "power_of_attorney",
    "court_document",
    "bill",
    "letter",
    "other",
)

IDENTITY_KINDS = {"cnic", "passport", "driving_licence", "birth_certificate"}
AGREEMENT_KINDS = {"rent_agreement", "sale_agreement", "agreement", "nikah_nama", "power_of_attorney"}
CONTRACT_KINDS = {"contract", "employment_contract"}

# Only this much text is sent: the facts worth pre-filling sit at the start of a
# document (parties, dates, amounts), and the model's context is not unlimited.
MAX_PROMPT_CHARS = 12000
MAX_FIELDS = 40
MAX_VALUE_CHARS = 500

_PROMPT = """You extract structured data from the text of a document uploaded in Pakistan. \
The text may be English, Urdu or both, and may come from OCR of a photo.

Reply with ONE JSON object and nothing else:
{
  "kind": "<one of: KINDS>",
  "title": "<short human title, e.g. 'CNIC - Muhammad Ali' or 'Rent Agreement - House 12, Gulshan'>",
  "summary": "<one sentence saying what this document is>",
  "fields": [{"key": "<snake_case key>", "label": "<English label>", "value": "<value copied from the text>"}]
}

Rules:
1. Copy every value EXACTLY from the text. Never guess, complete, translate or reformat a value. \
If something is not in the text, leave that field out. An Urdu value stays in Urdu script.
2. Use these keys when they apply, so the data can pre-fill forms later:
   - people / identity: full_name, father_name, husband_name, gender, cnic_number, date_of_birth, \
date_of_issue, date_of_expiry, country_of_stay, current_address, permanent_address, passport_number, \
licence_number, phone, email
   - agreements / contracts: first_party, second_party, first_party_cnic, second_party_cnic, \
property_address, agreement_date, start_date, end_date, term, amount, monthly_rent, security_deposit, \
notice_period, governing_law, witness_1, witness_2
   For anything else important use a short descriptive snake_case key.
3. A Pakistani CNIC number looks like 12345-1234567-1. On a CNIC the name, father's name, gender, \
identity number, date of birth, date of issue and date of expiry are on the front; the addresses are \
on the back, usually in Urdu.
4. At most 30 fields, the most useful first. No duplicates. No field with an empty value.
5. "kind" must be one of the listed values; use "other" if unsure.

DOCUMENT TEXT:
<<<
TEXT
>>>"""


@dataclass
class Field:
    key: str
    label: str
    value: str


@dataclass
class Extracted:
    kind: str = "other"
    title: str = ""
    summary: str = ""
    fields: list[Field] = field(default_factory=list)


def doc_type_for(kind: str) -> str:
    """Map the specific kind onto the coarse `doc_type` the rest of the app already uses."""
    if kind in IDENTITY_KINDS:
        return "identity"
    if kind in AGREEMENT_KINDS:
        return "agreement"
    if kind in CONTRACT_KINDS:
        return "contract"
    if kind == "policy":
        return "policy"
    return "other"


def _key(raw: str) -> str:
    key = re.sub(r"[^a-z0-9]+", "_", raw.strip().lower()).strip("_")
    return key[:60]


def _label(key: str) -> str:
    return key.replace("_", " ").strip().capitalize()


def parse(text: str) -> Extracted | None:
    """Parse the model's reply. None when it is not usable JSON."""
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError:
        return None
    if not isinstance(data, dict):
        return None

    kind = _key(str(data.get("kind") or "other"))
    if kind not in DOCUMENT_KINDS:
        kind = "other"

    fields: list[Field] = []
    seen: set[str] = set()
    raw_fields = data.get("fields")
    for item in raw_fields if isinstance(raw_fields, list) else []:
        if not isinstance(item, dict):
            continue
        value = item.get("value")
        if isinstance(value, (list, dict)) or value is None:
            continue
        value_text = " ".join(str(value).split())
        key = _key(str(item.get("key") or item.get("label") or ""))
        if not key or not value_text or key in seen:
            continue
        seen.add(key)
        label = " ".join(str(item.get("label") or "").split()) or _label(key)
        fields.append(Field(key=key, label=label[:80], value=value_text[:MAX_VALUE_CHARS]))
        if len(fields) >= MAX_FIELDS:
            break

    return Extracted(
        kind=kind,
        title=" ".join(str(data.get("title") or "").split())[:200],
        summary=" ".join(str(data.get("summary") or "").split())[:400],
        fields=fields,
    )


async def extract(text: str) -> Extracted | None:
    """Fields for a document's text, or None when they could not be produced."""
    body = text.strip()
    if not body:
        return None
    prompt = _PROMPT.replace("KINDS", " | ".join(DOCUMENT_KINDS)).replace("TEXT", body[:MAX_PROMPT_CHARS])
    try:
        reply, _ = await llm.generate(
            [Message(role="user", content=prompt)], temperature=0.0, max_tokens=2048
        )
    except LLMUnavailable as exc:
        logger.info("field extraction skipped: %s", exc)
        return None
    extracted = parse(reply)
    if extracted is None:
        logger.info("field extraction reply was not JSON")
    return extracted
