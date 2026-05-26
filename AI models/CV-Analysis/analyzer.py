from __future__ import annotations

import logging
import re
from datetime import datetime

import spacy
from dateutil import parser as date_parser

from utils import (
    MONTHS,
    SOFT_SKILLS,
    TECHNICAL_SKILLS,
    TOOLS,
    extract_email,
    extract_phone,
    normalise,
)

logger = logging.getLogger(__name__)

try:
    nlp = spacy.load("en_core_web_sm")
except OSError as exc:
    raise RuntimeError(
        "spaCy model 'en_core_web_sm' not found. Run: python -m spacy download en_core_web_sm"
    ) from exc

SECTION_PATTERNS: dict[str, re.Pattern] = {
    "summary": re.compile(r"(summary|profile|objective|about\s+me|professional\s+summary)", re.IGNORECASE),
    "experience": re.compile(r"(experience|work\s*experience|professional\s*experience|employment\s*history|career\s*history)", re.IGNORECASE),
    "skills": re.compile(r"(skills|competencies|technologies|technical\s*skills|core\s*skills|expertise|proficiencies)", re.IGNORECASE),
    "projects": re.compile(r"(projects?|portfolio|key\s*projects?|personal\s*projects?)", re.IGNORECASE),
    "education": re.compile(r"(education|academic\s*background|qualifications?|degree|university|college|school|training)", re.IGNORECASE),
    "certifications": re.compile(r"(certifications?|licenses?|courses?|awards?)", re.IGNORECASE),
}

HEADER_NOISE_PATTERN = re.compile(r"\b(email|phone|mobile|linkedin|github|address|contact)\b", re.IGNORECASE)
JOB_TITLE_PATTERN = re.compile(
    r"\b(engineer|developer|manager|analyst|designer|architect|consultant|director|lead|intern|officer|specialist|coordinator|administrator|scientist|researcher|executive)\b",
    re.IGNORECASE,
)
DEGREE_PATTERN = re.compile(
    r"(b\.?\s*sc|m\.?\s*sc|ph\.?\s*d|bachelor|master|doctor|doctorate|associate|diploma|certificate|b\.?\s*eng|m\.?\s*eng|b\.?\s*a\.?|m\.?\s*a\.?|mba|llb|llm|high\s*school|secondary|bootcamp)",
    re.IGNORECASE,
)
CERT_PATTERN = re.compile(
    r"(aws|azure|gcp|scrum|pmp|ccna|cissp|itil|oracle|microsoft|google|meta|ibm|certificate|certified|certification)",
    re.IGNORECASE,
)
DATE_RANGE_PATTERN = re.compile(
    r"(\b(?:" + "|".join(MONTHS) + r")[\s,]+\d{4}\b|\b\d{4}\b)"
    r"[\s\-/,\u2013\u2014to]+"
    r"(\b(?:" + "|".join(MONTHS) + r")[\s,]+\d{4}\b|\b\d{4}\b|present|current|now)",
    re.IGNORECASE,
)

IMPLICIT_SKILL_RULES: dict[str, list[str]] = {
    "api": ["API Integration", "REST APIs"],
    "apis": ["API Integration", "REST APIs"],
    "dashboard": ["Data Visualization", "Dashboard Development"],
    "dashboards": ["Data Visualization", "Dashboard Development"],
    "pipeline": ["Data Engineering", "Pipeline Development"],
    "pipelines": ["Data Engineering", "Pipeline Development"],
    "etl": ["ETL", "Data Engineering"],
    "warehouse": ["Data Warehousing"],
    "warehousing": ["Data Warehousing"],
    "scraping": ["Web Scraping"],
    "automation": ["Automation"],
    "automated": ["Automation"],
    "deployment": ["Deployment"],
    "deployed": ["Deployment"],
    "docker": ["Docker", "Containerization"],
    "kubernetes": ["Kubernetes", "Container Orchestration"],
    "aws": ["AWS", "Cloud Computing"],
    "azure": ["Azure", "Cloud Computing"],
    "gcp": ["GCP", "Cloud Computing"],
    "microservices": ["Microservices"],
    "testing": ["Software Testing"],
    "visualization": ["Data Visualization"],
    "analytics": ["Analytics"],
    "llm": ["LLM", "Generative AI"],
    "rag": ["RAG", "Retrieval-Augmented Generation"],
    "nlp": ["NLP", "Natural Language Processing"],
}


def analyze_cv(text: str, parser_diagnostics: dict | None = None) -> dict:
    logger.debug("analyze_cv received text (first 300 chars):\n%s", text[:300])

    safe_text = text[:100_000]
    doc = nlp(safe_text)
    sections = _split_into_sections(text)

    name = _extract_name(doc, text)
    email = extract_email(text)
    phone = extract_phone(text)
    contact_information = _build_contact_information(text, email, phone)

    explicit_tech, explicit_soft = _extract_skills(text)
    tools = _extract_tools(text)
    implicit_skills = _infer_implicit_skills(text, sections)

    education = _extract_education(sections.get("education", ""), doc, text)
    certifications = _extract_certifications(sections.get("certifications", ""), text)
    projects = _extract_projects(sections.get("projects", ""), text)
    experience, exp_years = _extract_experience(sections.get("experience", ""), doc, text)
    summary = _extract_professional_summary(sections, text)

    all_technical = sorted(set(explicit_tech) | set(implicit_skills))
    all_soft = sorted(set(explicit_soft))
    issues = list((parser_diagnostics or {}).get("original_issues", []))
    fixes = list((parser_diagnostics or {}).get("fixes_applied", []))

    ats_ready_cv = _build_ats_ready_cv(
        name=name,
        contact_information=contact_information,
        summary=summary,
        technical_skills=all_technical,
        soft_skills=all_soft,
        tools=tools,
        experience=experience,
        education=education,
        certifications=certifications,
        projects=projects,
    )

    result = {
        "name": name,
        "contact_information": contact_information,
        "email": email,
        "phone": phone,
        "professional_summary": summary,
        "skills": {
            "technical": all_technical,
            "soft": all_soft,
            "implicit": implicit_skills,
            "explicit_technical": sorted(explicit_tech),
        },
        "tools": sorted(tools),
        "education": education,
        "certifications": certifications,
        "projects": projects,
        "experience": experience,
        "experience_years": exp_years,
        "detected_sections": sorted(sections.keys()),
        "ats_ready_cv": ats_ready_cv,
        "original_issues": issues,
        "fixes_applied": fixes,
        "layout_diagnostics": parser_diagnostics or {},
    }

    logger.info(
        "Extraction: name=%s | tech=%d | implicit=%d | certs=%d | projects=%d | exp=%d",
        name,
        len(all_technical),
        len(implicit_skills),
        len(certifications),
        len(projects),
        len(experience),
    )
    return result


def _split_into_sections(text: str) -> dict[str, str]:
    lines = [line.rstrip() for line in text.split("\n")]
    sections: dict[str, list[str]] = {}
    current: str | None = None

    for raw_line in lines:
        stripped = raw_line.strip().rstrip(":|-")
        matched = None

        if stripped and len(stripped) <= 80 and not HEADER_NOISE_PATTERN.search(stripped):
            for name, pattern in SECTION_PATTERNS.items():
                if pattern.fullmatch(stripped) or pattern.search(stripped):
                    matched = name
                    break

        if matched:
            current = matched
            sections.setdefault(current, [])
            continue

        if current and stripped:
            sections[current].append(stripped)

    return {name: "\n".join(content).strip() for name, content in sections.items() if content}


def _extract_name(doc: spacy.tokens.Doc, raw_text: str) -> str | None:
    email = extract_email(raw_text) or ""
    phone = extract_phone(raw_text) or ""
    top_lines = [line.strip() for line in raw_text.split("\n")[:20] if line.strip()]

    def is_junk(candidate: str) -> bool:
        return (
            not candidate
            or "@" in candidate
            or candidate == email
            or candidate == phone
            or candidate.lower().startswith(("http", "www"))
            or bool(re.search(r"\d{3,}", candidate))
            or bool(re.search(r"[<>{}()\[\]/\\|]", candidate))
            or HEADER_NOISE_PATTERN.search(candidate) is not None
            or len(candidate) > 60
        )

    for ent in doc.ents:
        if ent.label_ == "PERSON" and ent.start < 200:
            candidate = ent.text.strip()
            if not is_junk(candidate) and len(candidate.split()) >= 2:
                return candidate

    for line in top_lines:
        words = line.split()
        if 1 <= len(words) <= 5 and line.isupper() and all(w.isalpha() for w in words):
            if not is_junk(line):
                return line.title()

    for line in top_lines:
        words = line.split()
        if 1 <= len(words) <= 5 and all(re.match(r"^[A-Za-z][A-Za-z\-'.]+$", w) for w in words):
            if not is_junk(line) and all(word[0].isupper() for word in words):
                return line

    for line in top_lines[:8]:
        if 3 <= len(line) <= 50 and not is_junk(line):
            if re.search(r"[A-Za-z]{2,}", line) and not re.search(r"\b(cv|resume|curriculum|vitae|profile)\b", line, re.IGNORECASE):
                return line

    return None


def _build_contact_information(text: str, email: str | None, phone: str | None) -> dict:
    linkedin = _extract_link(text, "linkedin")
    github = _extract_link(text, "github")
    return {
        "email": email,
        "phone": phone,
        "linkedin": linkedin,
        "github": github,
    }


def _extract_link(text: str, kind: str) -> str | None:
    pattern = rf"(https?://[^\s]*{kind}[^\s]*)"
    match = re.search(pattern, text, re.IGNORECASE)
    return match.group(1) if match else None


def _extract_skills(text: str) -> tuple[list[str], list[str]]:
    lower = normalise(text)
    tokenised = re.sub(r"[^a-z0-9\.\+#/\s]", " ", lower)

    found_tech: set[str] = set()
    found_soft: set[str] = set()

    for skill in TECHNICAL_SKILLS:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, lower) or skill in tokenised:
            found_tech.add(_prettify(skill))

    for skill in SOFT_SKILLS:
        pattern = r"\b" + re.escape(skill) + r"\b"
        if re.search(pattern, lower) or skill in tokenised:
            found_soft.add(_prettify(skill))

    return list(found_tech), list(found_soft)


def _extract_tools(text: str) -> list[str]:
    lower = normalise(text)
    tokenised = re.sub(r"[^a-z0-9\.\+#/\s]", " ", lower)
    found: set[str] = set()

    for tool in TOOLS:
        pattern = r"\b" + re.escape(tool) + r"\b"
        if re.search(pattern, lower) or tool in tokenised:
            found.add(_prettify(tool))

    return list(found)


def _infer_implicit_skills(text: str, sections: dict[str, str]) -> list[str]:
    source = normalise("\n".join(sections.values()) or text)
    inferred: set[str] = set()

    for phrase, mapped_skills in IMPLICIT_SKILL_RULES.items():
        if re.search(r"\b" + re.escape(phrase) + r"\b", source):
            inferred.update(mapped_skills)

    return sorted(inferred)


def _prettify(value: str) -> str:
    keep_upper = {"sql", "html", "css", "api", "aws", "gcp", "php", "nlp", "llm", "rag", "ci/cd"}
    if value.lower() in keep_upper:
        return value.upper()
    return value.title()


def _extract_professional_summary(sections: dict[str, str], full_text: str) -> str:
    if sections.get("summary"):
        return _normalise_sentence_spacing(sections["summary"])

    candidate_lines: list[str] = []
    for line in full_text.split("\n")[:18]:
        stripped = line.strip()
        if not stripped:
            continue
        if extract_email(stripped) or extract_phone(stripped) or HEADER_NOISE_PATTERN.search(stripped):
            continue
        if len(stripped.split()) >= 8 and not JOB_TITLE_PATTERN.search(stripped):
            candidate_lines.append(stripped)
        if len(candidate_lines) >= 2:
            break

    return _normalise_sentence_spacing(" ".join(candidate_lines[:2]))


def _extract_education(section_text: str, doc: spacy.tokens.Doc, full_text: str) -> list[str]:
    source = section_text.strip() if section_text.strip() else full_text
    orgs = {ent.text.strip() for ent in doc.ents if ent.label_ == "ORG"}

    candidates: list[str] = []
    for line in source.split("\n"):
        stripped = line.strip()
        if len(stripped) < 4:
            continue
        has_degree = DEGREE_PATTERN.search(stripped) is not None
        has_school_signal = bool(re.search(r"\b(university|college|school|academy|faculty|institute|bootcamp)\b", stripped, re.IGNORECASE))
        has_org_match = any(org and org in stripped for org in orgs)
        if has_degree or has_school_signal or (has_org_match and re.search(r"\b\d{4}\b", stripped)):
            candidates.append(stripped)

    return _deduplicate(candidates)[:10]


def _extract_certifications(section_text: str, full_text: str) -> list[str]:
    source = section_text.strip() if section_text.strip() else full_text
    items = [line.strip() for line in source.split("\n") if line.strip()]
    candidates = [line for line in items if CERT_PATTERN.search(line)]
    return _deduplicate(candidates)[:10]


def _extract_projects(section_text: str, full_text: str) -> list[str]:
    source = section_text.strip() if section_text.strip() else full_text
    items = [line.strip() for line in source.split("\n") if line.strip()]
    candidates: list[str] = []

    for line in items:
        if re.search(r"\b(project|built|developed|designed|implemented|deployed|portfolio|github)\b", line, re.IGNORECASE):
            candidates.append(line)

    return _deduplicate(candidates)[:10]


def _extract_experience(section_text: str, doc: spacy.tokens.Doc, full_text: str) -> tuple[list[str], str]:
    source = section_text.strip() if section_text.strip() else full_text
    lines = [line.strip() for line in source.split("\n") if line.strip()]

    entries: list[str] = []
    months_spans: list[tuple[int, int]] = []

    for idx, line in enumerate(lines):
        match = DATE_RANGE_PATTERN.search(line)
        if not match:
            continue

        parts = [line]
        if idx > 0 and not DATE_RANGE_PATTERN.search(lines[idx - 1]):
            if JOB_TITLE_PATTERN.search(lines[idx - 1]) or len(lines[idx - 1].split()) <= 8:
                parts.insert(0, lines[idx - 1])
        if idx + 1 < len(lines) and not DATE_RANGE_PATTERN.search(lines[idx + 1]):
            if len(lines[idx + 1].split()) <= 16:
                parts.append(_enhance_experience_line(lines[idx + 1]))

        entries.append(" | ".join(_deduplicate(parts)))
        months_spans.append(_parse_date_range(match.group(1), match.group(2)))

    if not entries:
        seen_sentences: set[str] = set()
        for ent in doc.ents:
            if ent.label_ == "ORG" and ent.start < 600:
                sentence = ent.sent.text.strip()
                if sentence and sentence not in seen_sentences and JOB_TITLE_PATTERN.search(sentence):
                    entries.append(_enhance_experience_line(sentence))
                    seen_sentences.add(sentence)

    if not entries:
        for line in lines:
            if JOB_TITLE_PATTERN.search(line):
                entries.append(_enhance_experience_line(line))

    total_months = _merge_month_spans(months_spans)
    return _deduplicate(entries)[:15], _months_to_years(total_months)


def _enhance_experience_line(line: str) -> str:
    stripped = line.strip()
    if not stripped:
        return stripped
    if re.match(r"^(responsible for|worked on|tasked with|in charge of)\b", stripped, re.IGNORECASE):
        stripped = re.sub(r"^(responsible for|worked on|tasked with|in charge of)\b", "Delivered", stripped, flags=re.IGNORECASE)
    if not re.match(r"^(Built|Delivered|Developed|Designed|Implemented|Led|Managed|Created|Improved|Automated|Supported)\b", stripped):
        if len(stripped.split()) >= 5 and not DATE_RANGE_PATTERN.search(stripped):
            stripped = "Delivered " + stripped[0].lower() + stripped[1:]
    return _normalise_sentence_spacing(stripped)


def _build_ats_ready_cv(
    name: str | None,
    contact_information: dict,
    summary: str,
    technical_skills: list[str],
    soft_skills: list[str],
    tools: list[str],
    experience: list[str],
    education: list[str],
    certifications: list[str],
    projects: list[str],
) -> str:
    sections: list[str] = []

    if name:
        sections.append(name)

    contact_parts = [
        contact_information.get("email"),
        contact_information.get("phone"),
        contact_information.get("linkedin"),
        contact_information.get("github"),
    ]
    contact_line = " | ".join(part for part in contact_parts if part)
    if contact_line:
        sections.append(contact_line)

    if summary:
        sections.append("PROFESSIONAL SUMMARY\n" + summary)
    if technical_skills or soft_skills or tools:
        skills_block = []
        if technical_skills:
            skills_block.append("Technical Skills: " + ", ".join(technical_skills))
        if soft_skills:
            skills_block.append("Soft Skills: " + ", ".join(soft_skills))
        if tools:
            skills_block.append("Tools: " + ", ".join(sorted(tools)))
        sections.append("SKILLS\n" + "\n".join(skills_block))
    if experience:
        sections.append("EXPERIENCE\n" + "\n".join(f"- {item}" for item in experience))
    if education:
        sections.append("EDUCATION\n" + "\n".join(f"- {item}" for item in education))
    if certifications:
        sections.append("CERTIFICATIONS\n" + "\n".join(f"- {item}" for item in certifications))
    if projects:
        sections.append("PROJECTS\n" + "\n".join(f"- {item}" for item in projects))

    return "\n\n".join(section.strip() for section in sections if section.strip())


def _parse_date_range(start_str: str, end_str: str) -> tuple[int, int]:
    start_dt = _safe_parse_date(start_str)
    end_dt = datetime.now() if re.match(r"present|current|now", end_str.strip(), re.IGNORECASE) else _safe_parse_date(end_str)
    if not start_dt or not end_dt:
        return (0, 0)

    start_month = start_dt.year * 12 + start_dt.month
    end_month = end_dt.year * 12 + end_dt.month
    if end_month < start_month:
        return (0, 0)
    return (start_month, end_month)


def _safe_parse_date(value: str) -> datetime | None:
    try:
        return date_parser.parse(value, default=datetime(2000, 1, 1))
    except (ValueError, OverflowError, TypeError):
        return None


def _merge_month_spans(spans: list[tuple[int, int]]) -> int:
    valid = sorted((start, end) for start, end in spans if start and end and end >= start)
    if not valid:
        return 0

    merged: list[list[int]] = [[valid[0][0], valid[0][1]]]
    for start, end in valid[1:]:
        last = merged[-1]
        if start <= last[1]:
            last[1] = max(last[1], end)
        else:
            merged.append([start, end])

    return sum(max(end - start, 0) for start, end in merged)


def _months_to_years(months: int) -> str:
    if months <= 0:
        return "Unknown"
    years, remainder = divmod(months, 12)
    parts: list[str] = []
    if years:
        parts.append(f"{years} year{'s' if years != 1 else ''}")
    if remainder:
        parts.append(f"{remainder} month{'s' if remainder != 1 else ''}")
    return " ".join(parts)


def _normalise_sentence_spacing(value: str) -> str:
    value = re.sub(r"\s{2,}", " ", value.strip())
    value = re.sub(r"\s+([,.;:])", r"\1", value)
    return value


def _deduplicate(items: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for item in items:
        if item not in seen:
            seen.add(item)
            ordered.append(item)
    return ordered
