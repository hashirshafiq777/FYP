"""Fetch Pakistani federal statutes from pakistancode.gov.pk (Ministry of Law & Justice).

Usage (from backend/):
    python -m scripts.fetch_laws --index            # build knowledge/laws/index.json (all titles)
    python -m scripts.fetch_laws --download         # download PDFs listed in LAW_LIST
    python -m scripts.fetch_laws --extract          # PDFs -> knowledge/laws/text/*.txt

Only the statutes in LAW_LIST are downloaded, so the corpus stays small enough for git.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import urljoin

import httpx

BASE = "https://pakistancode.gov.pk/english/"
KNOWLEDGE = Path(__file__).resolve().parent.parent / "knowledge" / "laws"
INDEX_FILE = KNOWLEDGE / "index.json"
PDF_DIR = KNOWLEDGE / "pdf"
TEXT_DIR = KNOWLEDGE / "text"

# Title substrings (case-insensitive) of the statutes to include. Matched against
# the alphabetical index built by --index.
LAW_LIST = [
    # Constitution & citizen rights
    "Constitution of the Islamic Republic of Pakistan",
    "Right of Access to Information Act, 2017",
    "Protection Against Harassment of Women at the Work Place Act, 2010",
    "Payment of Wages Act, 1936",
        "National Commission for Human Rights Act, 2012",
    # Criminal
    "Pakistan Penal Code",
    "Code of Criminal Procedure (CrPC), 1898",
    "Qanun-e-Shahadat",
    "Anti Terrorism Act (ATA),1997",
    "Control of Narcotic Substances Act (CNSA), 1997",
    "Anti-Money Laundering (AML) Act, 2010",
    "National Accountability Ordinance, 1999",
    "Probation of Offenders Ordinance, 1960",
    "Juvenile Justice System Act, 2018",
    "Zainab Alert, Response and Recovery Act, 2020",
    "Prevention of Trafficking in Persons Act, 2018",
        "Anti-Rape (Investigation and Trial) Act, 2021",
    "Offence of Zina (Enforcement of Hudood) Ordinance,1979",
    "Offence of Qazf (Enforcement of Hadd) Ordinance, 1979",
    "Prohibition (Enforcement of Hadd) Order, 1979",
    "Offences Against Property (Enforcement of Hudood) Ordinance, 1979",
    "Pakistan Arms Ordinance, 1965",
    "Police Order, 2002",
    "Illegal Dispossession Act, 2005",
    "Protection of Pakistan Act, 2014",
    "Surrender of Illicit Arms Act, 1991",
    "Prisons Act, 1894",
    # Family
    "Muslim Family Laws Ordinance, 1961",
    "Dissolution of Muslim Marriages Act, 1939",
    "Guardians and Wards Act, 1890",
    "Child Marriage Restraint Act, 1929",
    "Dowry and Bridal Gifts (Restriction) Act, 1976",
    "Family Courts Act, 1964",
    "Muslim Personal Law (Shariat) Application Act, 1962",
    "Christian Marriage Act, 1872",
    "Divorce Act,1869",
    "Hindu Marriage Act, 2017",
    "Succession Act, 1925",
    "Islamabad Capital Territory Child Protection Act, 2018",
    "Domestic Violence (Prevention and Protection) Act",
    "Enforcement of Women's Property Rights Act, 2020",
    "Married Women's Property Act, 1874",
    "National Commission on the Status of Women Act, 2012",
    # Property / civil
    "Transfer of Property Act, 1882",
    "Registration Act, 1908",
    "Specific Relief Act, 1877",
    "Contract Act, 1872",
    "Limitation Act, 1908",
    "Code of Civil Procedure (CPC) , 1908",
    "Land Acquisition Act, 1894",
    "Stamp Act, 1899",
    "Easements Act, 1882",
    "Partition Act, 1893",
    "Sale of Goods Act, 1930",
    "Partnership Act, 1932",
    "Islamabad Capital Territory Trust Act, 2020",
    "Arbitration Act, 1940",
    "Negotiable Instruments Act, 1881",
    "Companies Act, 2017",
    "Benami Transactions (Prohibition) Act, 2017",
    "Cantonments Rent Restriction Act, 1963",
    "Islamabad Rent Restriction Ordinance, 2001",
    "Financial Institutions (Recovery of Finances) Ordinance, 2001",
    # Cyber / digital / consumer
    "Prevention of Electronic Crimes Act, 2016",
    "Electronic Transactions Ordinance, 2002",
    "Pakistan Telecommunication (Re-organization) Act, 1996",
    "Pakistan Electronic Media Regulatory Authority Ordinance (PEMRA), 2002",
    "Islamabad Consumers Protection Act, 1995",
    "Competition Act, 2010",
    "Copyright Ordinance, 1962",
    "Trade Marks Ordinance, 2001",
    "Patents Ordinance, 2000",
    # Employment / misc citizen
    "Industrial Relations Act, 2012",
    "Minimum Wages Ordinance, 1961",
    "Bonded Labour System (Abolition) Act, 1992",
    "Employment of Children Act, 1991",
    "Citizenship Act, 1951",
    "Elections Act, 2017",
    "Supreme Court (Practice and Procedure) Act, 2023",
    "Legal Practitioners and Bar Councils Act, 1973",
    "Alternative Dispute Resolution Act, 2017",
    "Costs of Litigation Act, 2017",
    "Letters of Administration and Succession Certificates Act, 2020",
    # Additional federal / Islamabad Capital Territory laws
    "Federal Investigation Agency Act (FIA), 1974",
    "Investigation for fair Trial Act, 2013",
    "National Counter Terrorism Authority (NaCTA) Act, 2013",
    "National Database and Registration Authority Ordinance (NADRA), 2000",
    "Passports Act, 1974",
    "Pakistan Environmental Protection Act, 1997",
    "National Commission on the Rights of Child Act, 2017",
    "National Commission for Minorities Rights Act, 2025",
    "Legal Aid and Justice Authority Act, 2020",
    "Lawyers Welfare and Protection Act, 2023",
    "ICT Rights of Persons with Disability Act, 2020",
    "Right to Free and Compulsory Education Act, 2012",
    "Islamabad Capital Territory Child Marriage Restraint Act, 2025",
    "Islamabad Capital Territory Food Safety Act, 2021",
    "National Agri-trade and Food Safety Authority Act, 2026",
    "Pakistan General Cosmetics Act, 2023",
    "Pakistan Halal Authority Act, 2016",
    "Price Control and Prevention of Profiteering and Hoarding Act, 1977",
    "Digital Presence Proceeds Tax Act, 2025",
    "Islamabad Capital Territory Waqf Properties Act, 2020",
    "Islamabad Real Estate (Regulation and Development) Act, 2020",
]

HEADERS = {"User-Agent": "LegalDocReader-FYP corpus builder (student project)"}


def _client() -> httpx.Client:
    return httpx.Client(headers=HEADERS, timeout=60.0, follow_redirects=True)


def build_index() -> dict[str, str]:
    """Walk the alphabetical listing (A..Z, every page) and collect title -> page url."""
    index: dict[str, str] = {}
    link_re = re.compile(r'<a href="(UY2Fqa[^"]+)">([^<]+)</a>')
    with _client() as client:
        for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
            page = 1
            while True:
                url = f"{BASE}LGu0xAD?alp={letter}&page={page}&action=active"
                response = client.get(url)
                found = 0
                for href, title in link_re.findall(response.text):
                    title = html.unescape(title).strip()
                    if title and href not in index.values():
                        index[title] = urljoin(BASE, href)
                        found += 1
                print(f"{letter} page {page}: {found} new", file=sys.stderr)
                if found == 0 or page > 30:
                    break
                page += 1
                time.sleep(0.3)
    KNOWLEDGE.mkdir(parents=True, exist_ok=True)
    INDEX_FILE.write_text(json.dumps(index, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Indexed {len(index)} statutes -> {INDEX_FILE}")
    return index


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def _slug(title: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9]+", "_", title).strip("_")
    return slug[:90]


def pick(index: dict[str, str]) -> list[tuple[str, str]]:
    chosen: list[tuple[str, str]] = []
    for wanted in LAW_LIST:
        matches = [
            (title, url)
            for title, url in index.items()
            if _norm(wanted) in _norm(title) and "repealed" not in title.lower()
        ]
        if not matches:
            print(f"  !! not found in index: {wanted}", file=sys.stderr)
            continue
        # Shortest title is the base act (amendments have longer names).
        matches.sort(key=lambda item: len(item[0]))
        chosen.append(matches[0])
    return chosen


def download(index: dict[str, str]) -> None:
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    pdf_re = re.compile(r'href="(https://pakistancode\.gov\.pk/pdffiles/[^"]+\.pdf)"')
    manifest: list[dict[str, str]] = []
    with _client() as client:
        for title, page_url in pick(index):
            target = PDF_DIR / f"{_slug(title)}.pdf"
            if target.exists() and target.stat().st_size > 1000:
                manifest.append({"title": title, "page": page_url, "file": target.name})
                print(f"  have  {title}")
                continue
            page = client.get(page_url).text
            links = pdf_re.findall(page)
            if not links:
                print(f"  !! no pdf link on page: {title}", file=sys.stderr)
                continue
            pdf = client.get(links[0])
            if pdf.status_code != 200 or not pdf.content.startswith(b"%PDF"):
                print(f"  !! bad pdf: {title} ({pdf.status_code})", file=sys.stderr)
                continue
            target.write_bytes(pdf.content)
            manifest.append({"title": title, "page": page_url, "file": target.name})
            print(f"  saved {title} ({len(pdf.content) // 1024} KB)")
            time.sleep(0.5)
    (KNOWLEDGE / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"{len(manifest)} statutes in manifest")


def extract() -> None:
    from pypdf import PdfReader

    TEXT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((KNOWLEDGE / "manifest.json").read_text(encoding="utf-8"))
    for entry in manifest:
        pdf_path = PDF_DIR / entry["file"]
        txt_path = TEXT_DIR / (pdf_path.stem + ".txt")
        if txt_path.exists():
            continue
        try:
            reader = PdfReader(str(pdf_path))
            pages = [(page.extract_text() or "") for page in reader.pages]
        except Exception as exc:  # noqa: BLE001
            print(f"  !! could not read {pdf_path.name}: {exc}", file=sys.stderr)
            continue
        text = "\n\n".join(pages)
        text = re.sub(r"[ \t]+\n", "\n", text)
        header = f"TITLE: {entry['title']}\nSOURCE: {entry['page']}\n\n"
        txt_path.write_text(header + text, encoding="utf-8")
        print(f"  {pdf_path.name}: {len(reader.pages)} pages, {len(text) // 1000}k chars")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", action="store_true")
    parser.add_argument("--download", action="store_true")
    parser.add_argument("--extract", action="store_true")
    args = parser.parse_args()
    if args.index or not INDEX_FILE.exists():
        index = build_index()
    else:
        index = json.loads(INDEX_FILE.read_text(encoding="utf-8"))
    if args.download:
        download(index)
    if args.extract:
        extract()


if __name__ == "__main__":
    main()
