"""Roman-Urdu / Urdu legal vocabulary -> English statute vocabulary.

The statutes are in English. A question like "khula kaise lete hain" shares no
tokens with "dissolution of marriage", so before retrieval the question is
expanded with the English terms the statutes actually use. This is deliberately
a small, hand-checked list of the words citizens actually use, not a translator.
"""

from __future__ import annotations

import re

# Each entry: list of surface forms (lower-case; Roman Urdu spellings vary) -> English terms.
_ENTRIES: list[tuple[list[str], str]] = [
    (["talaq", "talak", "طلاق"], "talaq divorce dissolution of marriage"),
    (["khula", "khulla", "خلع"], "khula dissolution of marriage by wife family court"),
    (["nikah", "nikkah", "shadi", "shaadi", "نکاح", "شادی"], "marriage nikah"),
    (["mehr", "mahr", "haq mehr", "مہر"], "dower mehr"),
    (["nan nafqa", "nafqa", "kharcha", "نان نفقہ", "نفقہ"], "maintenance wife children"),
    (["warasat", "wirasat", "virasat", "waris", "وراثت"], "inheritance succession heirs"),
    (["wasiyat", "وصیت"], "will testament succession"),
    (["bacha", "bachay", "bachon", "bachhe", "بچہ", "بچے"], "child minor"),
    (["custody", "hirasat", "parvarish", "حضانت"], "custody of minor guardian"),
    (["chori", "چوری"], "theft stolen property"),
    (["daketi", "dakaiti", "ڈکیتی"], "robbery dacoity"),
    (["qatal", "qatl", "qatil", "murder", "قتل"], "murder qatl-i-amd homicide"),
    (["zina", "rape", "zyadti", "ziadti", "زنا", "زیادتی"], "rape zina sexual assault"),
    (["dhoka", "dhokha", "fraud", "faraud", "دھوکہ"], "cheating fraud dishonestly"),
    (["jhoot", "jhoota", "jhuta", "جھوٹ"], "false statement perjury"),
    (["maar peet", "marpeet", "mara", "tashaddud", "تشدد"], "hurt assault criminal force"),
    (["dhamki", "dhamkana", "دھمکی"], "criminal intimidation threat"),
    (["ghar", "makan", "گھر", "مکان"], "house dwelling"),
    (["zameen", "zamin", "jaidad", "jaedad", "زمین", "جائیداد"], "land immovable property"),
    (["qabza", "kabza", "قبضہ"], "possession illegal dispossession"),
    (["kiraya", "kirayedar", "kiraye", "کرایہ"], "rent tenant landlord"),
    (["registry", "registri", "رجسٹری"], "registration of document sale deed"),
    (["police", "پولیس", "thana", "تھانہ"], "police officer station"),
    (["fir", "ایف آئی آر", "report darj"], "first information report FIR section 154"),
    (["giraftar", "giraftari", "arrest", "گرفتار"], "arrest without warrant"),
    (["zamanat", "zamanaat", "bail", "ضمانت"], "bail bailable"),
    (["saza", "sazaa", "سزا"], "punishment imprisonment fine"),
    (["jurm", "جرم"], "offence crime"),
    (["qaid", "qayd", "jail", "قید"], "imprisonment"),
    (["jurmana", "جرمانہ"], "fine"),
    (["adalat", "عدالت", "court"], "court"),
    (["wakeel", "vakeel", "وکیل"], "advocate lawyer"),
    (["muqadma", "mukadma", "مقدمہ", "case"], "case suit proceedings"),
    (["faisla", "faisala", "فیصلہ"], "judgment decree order"),
    (["appeal", "اپیل"], "appeal"),
    (["haq", "huqooq", "haqooq", "حق", "حقوق"], "right rights"),
    (["aain", "aaeen", "آئین"], "constitution fundamental rights"),
    (["azadi", "آزادی"], "freedom liberty"),
    (["barabari", "برابری"], "equality equal protection of law"),
    (["mazhab", "مذہب"], "religion"),
    (["tanakhwa", "tankhwah", "tankha", "تنخواہ"], "wages salary"),
    (["mulazim", "naukri", "ملازم", "نوکری"], "employee employment worker"),
    (["mobile", "moobile", "facebook", "whatsapp", "internet", "online", "cyber", "سائبر"],
     "electronic crimes information system online"),
    (["harassment", "harasment", "tang karna", "ہراساں"], "harassment cyber stalking"),
    (["photo", "tasveer", "video", "تصویر"], "image video intimate electronic"),
    (["hacking", "hack", "ہیکنگ"], "unauthorized access information system"),
    (["shakayat", "shikayat", "شکایت", "complaint"], "complaint"),
    (["umar", "umr", "عمر", "age"], "age child marriage restraint minimum age eighteen sixteen"),
    (["nabalig", "nabaligh", "نابالغ"], "minor child under eighteen"),
    (["jahez", "jahaiz", "جہیز"], "dowry bridal gifts"),
    (["doosri shadi", "dusri shadi", "دوسری شادی"], "second marriage polygamy permission arbitration council"),
    (["consumer", "sarif", "صارف", "kharidar"], "consumer defective product service"),
    (["cheque", "check", "چیک"], "cheque dishonour negotiable instrument"),
    (["karza", "qarz", "qarza", "قرض"], "loan debt recovery"),
    (["gawah", "gawahi", "گواہ"], "witness evidence"),
    (["saboot", "sabut", "ثبوت"], "evidence proof"),
    (["dehshatgardi", "دہشت گردی", "terrorism"], "terrorism"),
    (["nasha", "nashay", "drugs", "charas", "heroin", "نشہ"], "narcotic drugs possession"),
    (["hathiyar", "pistol", "asla", "ہتھیار", "اسلحہ"], "arms weapon licence"),
    (["ghair qanooni", "ghair kanooni", "غیر قانونی"], "unlawful illegal"),
    (["nokri se nikal", "bartarf", "برطرف"], "termination of employment dismissal"),
]


def _compile() -> list[tuple[re.Pattern[str], str]]:
    compiled = []
    for forms, english in _ENTRIES:
        alternatives = "|".join(re.escape(form) for form in sorted(forms, key=len, reverse=True))
        # Latin forms need word boundaries; Urdu script has no \b semantics worth relying on.
        compiled.append((re.compile(rf"(?<![A-Za-z])(?:{alternatives})(?![A-Za-z])", re.IGNORECASE), english))
    return compiled


_COMPILED = _compile()


def expand(question: str) -> str:
    """Return the English terms matched in the question (deduplicated, space-joined)."""
    found: list[str] = []
    for pattern, english in _COMPILED:
        if pattern.search(question):
            for term in english.split():
                if term not in found:
                    found.append(term)
    return " ".join(found)
