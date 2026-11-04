"""Detect which language a question is written in: English, Urdu script, or Roman Urdu.

The answer is generated in the same language the question was asked in, so the
detector only needs to be good enough to pick one of three labels.
"""

from __future__ import annotations

import re
from typing import Literal

Language = Literal["en", "ur", "roman-ur"]

# Arabic / Urdu script block (Urdu letters live in the Arabic Unicode range).
_URDU_SCRIPT = re.compile(r"[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]")

# High-frequency Roman Urdu tokens that are rare in English text.
_ROMAN_URDU_WORDS = {
    "kya", "kia", "hai", "hain", "hy", "hain", "kaise", "kesay", "kese", "kis", "kisi",
    "mujhe", "mujhy", "mera", "meri", "mere", "apna", "apni", "apne", "humara", "hamara",
    "ka", "ki", "ke", "kay", "mein", "main", "mai", "may", "se", "sy", "ko", "par", "pe",
    "nahi", "nahin", "nai", "nhi", "haan", "han", "ho", "hoga", "hogi", "hota", "hoti",
    "sakta", "sakti", "sakte", "saktay", "karna", "karne", "karni", "kar", "karo", "karein",
    "kaun", "kon", "kab", "kahan", "kahaan", "kyun", "kyu", "kiun", "kitna", "kitni", "kitne",
    "agar", "lekin", "magar", "phir", "wala", "wali", "wale", "walay", "bhi", "sirf", "bohot",
    "bahut", "bht", "zyada", "ziada", "kam", "sab", "koi", "kuch", "kuchh", "yeh", "ye", "wo",
    "woh", "us", "is", "un", "in", "hum", "tum", "aap", "ap", "shadi", "talaq", "khula",
    "nikah", "mehr", "haq", "qanoon", "kanoon", "saza", "jurm", "police", "adalat", "court",
    "zameen", "jaidad", "makan", "ghar", "warasat", "wirasat", "bacha", "bachay", "bacho",
    "ladki", "larki", "larka", "ladka", "shohar", "biwi", "paisa", "paise", "rupay", "fraud",
    "dhoka", "chori", "qatal", "qatl", "zina", "jhoot", "mukadma", "muqadma", "case",
    "wakeel", "vakeel", "judge", "faisla", "faisala", "huqooq", "haqooq", "batao", "bataen",
    "bataye", "samjhao", "samjhaen",
}

# Words that are plausible English *and* Roman Urdu are excluded from the count
# so an English sentence with "main", "in", "is" is not misread as Roman Urdu.
_AMBIGUOUS = {"main", "in", "is", "us", "may", "case", "court", "police", "judge", "fraud", "ap"}


def detect(text: str) -> Language:
    if _URDU_SCRIPT.search(text):
        return "ur"

    words = re.findall(r"[a-zA-Z]+", text.lower())
    if not words:
        return "en"

    hits = sum(1 for word in words if word in _ROMAN_URDU_WORDS and word not in _AMBIGUOUS)
    ratio = hits / len(words)

    # Short questions ("talaq kaise hoti hai") need a lower bar than long ones.
    threshold = 0.25 if len(words) <= 6 else 0.18
    return "roman-ur" if ratio >= threshold else "en"


LANGUAGE_NAMES: dict[Language, str] = {
    "en": "English",
    "ur": "Urdu (in Urdu script)",
    "roman-ur": "Roman Urdu (Urdu written with English letters)",
}
