from __future__ import annotations

import re
from collections import Counter
from dataclasses import asdict, dataclass, field

from utils import TECHNICAL_SKILLS, normalise

_ACTION_VERBS: set[str] = {
    "achieved",
    "architected",
    "automated",
    "built",
    "collaborated",
    "coordinated",
    "created",
    "delivered",
    "deployed",
    "designed",
    "developed",
    "diagnosed",
    "drove",
    "engineered",
    "established",
    "evaluated",
    "executed",
    "facilitated",
    "generated",
    "implemented",
    "improved",
    "increased",
    "integrated",
    "launched",
    "led",
    "managed",
    "mentored",
    "migrated",
    "monitored",
    "negotiated",
    "orchestrated",
    "owned",
    "planned",
    "presented",
    "prioritised",
    "prioritized",
    "produced",
    "reduced",
    "refactored",
    "released",
    "researched",
    "resolved",
    "reviewed",
    "scaled",
    "secured",
    "shipped",
    "spearheaded",
    "streamlined",
    "tested",
    "transformed",
    "upgraded",
}

_SECTION_PATTERNS: dict[str, list[re.Pattern]] = {
    "contact": [
        re.compile(r"\b(email|phone|mobile|contact)\b", re.IGNORECASE),
        re.compile(r"https?://(www\.)?linkedin\.com", re.IGNORECASE),
        re.compile(r"https?://(www\.)?github\.com", re.IGNORECASE),
    ],
    "summary": [
        re.compile(r"^\s*(summary|objective|profile|about me|overview)\s*$", re.IGNORECASE | re.MULTILINE)
    ],
    "experience": [
        re.compile(r"^\s*(experience|work experience|professional experience|employment history)\s*$", re.IGNORECASE | re.MULTILINE)
    ],
    "skills": [
        re.compile(r"^\s*(skills|technical skills|competencies|technologies|expertise)\s*$", re.IGNORECASE | re.MULTILINE)
    ],
    "education": [
        re.compile(r"^\s*(education|academic background|qualifications|training)\s*$", re.IGNORECASE | re.MULTILINE)
    ],
    "projects": [
        re.compile(r"^\s*(projects|portfolio|key projects|personal projects)\s*$", re.IGNORECASE | re.MULTILINE)
    ],
    "certifications": [
        re.compile(r"^\s*(certifications?|licenses?|awards?)\s*$", re.IGNORECASE | re.MULTILINE)
    ],
}

_ATS_POWER_KEYWORDS: set[str] = {
    "agile",
    "analytical",
    "api",
    "architecture",
    "backlog",
    "ci/cd",
    "code review",
    "collaboration",
    "cross-functional",
    "delivered",
    "deployment",
    "efficiency",
    "growth",
    "impact",
    "initiative",
    "integration",
    "kpi",
    "leadership",
    "mentoring",
    "metrics",
    "microservices",
    "ownership",
    "peer review",
    "performance",
    "pipeline",
    "problem-solving",
    "production",
    "release",
    "results",
    "revenue",
    "roadmap",
    "scalable",
    "scrum",
    "sprint",
    "stakeholder",
    "strategy",
    "unit test",
}

_QUANTIFICATION_PATTERNS: list[re.Pattern] = [
    re.compile(r"\b\d+\s*%"),
    re.compile(r"\$\s*\d+|\d+\s*\$"),
    re.compile(r"\b\d+[kKmMbB]\b"),
    re.compile(r"\b(increased|reduced|improved|grew|saved|generated)\b.*\b\d+", re.IGNORECASE),
    re.compile(r"\b\d+\s*(users|customers|clients|engineers|teams|services|requests|transactions)\b", re.IGNORECASE),
    re.compile(r"\b(x\d+|\d+x)\b"),
]

_FORMATTING_RED_FLAGS: list[re.Pattern] = [
    re.compile(r"[■●►◆★✓✗✔]"),
    re.compile(r"\|{2,}"),
    re.compile(r"_{3,}"),
    re.compile(r"\.{4,}"),
    re.compile(r"<[^>]+>"),
]

_STOP_WORDS: set[str] = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "been",
    "being",
    "both",
    "but",
    "by",
    "can",
    "could",
    "did",
    "do",
    "does",
    "either",
    "for",
    "from",
    "had",
    "has",
    "have",
    "how",
    "if",
    "in",
    "is",
    "it",
    "its",
    "may",
    "more",
    "most",
    "no",
    "nor",
    "not",
    "of",
    "on",
    "or",
    "our",
    "same",
    "shall",
    "should",
    "so",
    "such",
    "than",
    "that",
    "the",
    "their",
    "them",
    "then",
    "there",
    "these",
    "they",
    "this",
    "those",
    "to",
    "was",
    "we",
    "were",
    "what",
    "when",
    "where",
    "which",
    "who",
    "will",
    "with",
    "would",
    "you",
    "your",
}


@dataclass
class ATSResult:
    ats_score: int = 0
    ats_probability: str = ""
    section_score: int = 0
    keyword_score: int = 0
    action_verb_score: int = 0
    quantification_score: int = 0
    contact_score: int = 0
    readability_score: int = 0
    missing_keywords: list[str] = field(default_factory=list)
    found_sections: list[str] = field(default_factory=list)
    missing_sections: list[str] = field(default_factory=list)
    action_verbs_found: list[str] = field(default_factory=list)
    improvement_tips: list[str] = field(default_factory=list)
    jd_keyword_overlap: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


def compute_ats_score(cv_data: dict, raw_text: str, job_description: str | None = None) -> ATSResult:
    has_jd = bool(job_description and job_description.strip())

    section_score, found_sections, missing_sections = _score_sections(raw_text, cv_data, has_jd)
    keyword_score, missing_keywords, jd_overlap = _score_keywords(raw_text, cv_data, job_description, has_jd)
    action_score, verbs_found = _score_action_verbs(raw_text)
    quantification_score = _score_quantification(raw_text)
    contact_score = _score_contact(cv_data)
    readability_score = _score_readability(raw_text)

    total = min(
        section_score
        + keyword_score
        + action_score
        + quantification_score
        + contact_score
        + readability_score,
        100,
    )

    return ATSResult(
        ats_score=total,
        ats_probability=_probability_label(total),
        section_score=section_score,
        keyword_score=keyword_score,
        action_verb_score=action_score,
        quantification_score=quantification_score,
        contact_score=contact_score,
        readability_score=readability_score,
        missing_keywords=missing_keywords[:20],
        found_sections=found_sections,
        missing_sections=missing_sections,
        action_verbs_found=sorted(verbs_found)[:15],
        improvement_tips=_build_improvement_tips(
            cv_data=cv_data,
            raw_text=raw_text,
            missing_sections=missing_sections,
            missing_keywords=missing_keywords,
            verbs_found=verbs_found,
            quant_score=quantification_score,
            contact_score=contact_score,
            readability_score=readability_score,
            has_jd=has_jd,
            jd_overlap=jd_overlap,
        ),
        jd_keyword_overlap=jd_overlap,
    )


def _score_sections(text: str, cv_data: dict, has_jd: bool) -> tuple[int, list[str], list[str]]:
    max_pts = 20 if has_jd else 25
    found: list[str] = []
    missing: list[str] = []
    critical_sections = ["contact", "experience", "skills", "education"]

    for section, patterns in _SECTION_PATTERNS.items():
        pattern_found = any(pattern.search(text) for pattern in patterns)

        if not pattern_found and section == "contact":
            pattern_found = bool(cv_data.get("email") or cv_data.get("phone"))
        if not pattern_found and section in {"experience", "education", "skills"}:
            if section == "experience":
                pattern_found = bool(cv_data.get("experience"))
            elif section == "education":
                pattern_found = bool(cv_data.get("education"))
            elif section == "skills":
                skills = cv_data.get("skills") or {}
                pattern_found = bool(skills.get("technical") or skills.get("soft"))

        if pattern_found:
            found.append(section)
        elif section in critical_sections:
            missing.append(section)

    critical_found = sum(1 for section in critical_sections if section in found)
    optional_found = max(len(found) - critical_found, 0)

    score = int((critical_found / 4) * (max_pts * 0.8))
    score += min(optional_found * 2, int(max_pts * 0.2))
    return min(score, max_pts), found, missing


def _score_keywords(
    raw_text: str, cv_data: dict, job_description: str | None, has_jd: bool
) -> tuple[int, list[str], dict]:
    jd_overlap: dict = {}
    lower = normalise(raw_text)

    if has_jd:
        cv_tokens = _tokenise(raw_text)
        jd_tokens = _tokenise(job_description or "")
        jd_unique = {token for token in jd_tokens if token not in _STOP_WORDS}
        cv_unique = set(cv_tokens)

        matched = jd_unique & cv_unique
        missing = jd_unique - cv_unique
        overlap_pct = len(matched) / max(len(jd_unique), 1)
        score = min(int(overlap_pct * 35), 35)

        jd_freq = Counter(jd_tokens)
        high_signal_missing = sorted(missing, key=lambda token: jd_freq.get(token, 0), reverse=True)
        jd_overlap = {
            "total_jd_keywords": len(jd_unique),
            "matched_keywords": len(matched),
            "overlap_percentage": round(overlap_pct * 100, 1),
            "top_matched": sorted(matched)[:15],
        }
        return score, high_signal_missing[:25], jd_overlap

    tech_skills = (cv_data.get("skills") or {}).get("technical", [])
    power_hits = [kw for kw in _ATS_POWER_KEYWORDS if kw in lower]
    power_score = min(int(len(power_hits) / len(_ATS_POWER_KEYWORDS) * 15), 15)
    tech_score = min(len(tech_skills), 10)
    total = power_score + tech_score

    missing_keywords = [kw for kw in sorted(_ATS_POWER_KEYWORDS) if kw not in lower]
    return total, missing_keywords[:20], {}


def _score_action_verbs(raw_text: str) -> tuple[int, list[str]]:
    tokens = set(re.findall(r"\b[a-z]+\b", raw_text.lower()))
    found = list(tokens & _ACTION_VERBS)
    return min(len(found) * 2, 20), found


def _score_quantification(raw_text: str) -> int:
    hits = {index for index, pattern in enumerate(_QUANTIFICATION_PATTERNS) if pattern.search(raw_text)}
    return min(len(hits) * 3, 15)


def _score_contact(cv_data: dict) -> int:
    score = 0
    if cv_data.get("name"):
        score += 3
    if cv_data.get("email"):
        score += 4
    if cv_data.get("phone"):
        score += 3
    return score


def _score_readability(raw_text: str) -> int:
    score = 5
    for pattern in _FORMATTING_RED_FLAGS:
        if pattern.search(raw_text):
            score -= 1

    word_count = len(raw_text.split())
    if word_count < 200:
        score -= 2
    elif word_count > 1200:
        score -= 1

    return max(score, 0)


def _build_improvement_tips(
    cv_data: dict,
    raw_text: str,
    missing_sections: list[str],
    missing_keywords: list[str],
    verbs_found: list[str],
    quant_score: int,
    contact_score: int,
    readability_score: int,
    has_jd: bool,
    jd_overlap: dict,
) -> list[str]:
    tips: list[str] = []

    if "experience" in missing_sections:
        tips.append("Add a clearly labelled 'Work Experience' section so ATS parsers can locate job history.")
    if "skills" in missing_sections:
        tips.append("Add a dedicated 'Skills' or 'Technical Skills' section instead of scattering keywords across the CV.")
    if "education" in missing_sections:
        tips.append("Include an 'Education' section, even if it only lists certifications, courses, or bootcamps.")

    if has_jd and jd_overlap:
        overlap_pct = jd_overlap.get("overlap_percentage", 0)
        if overlap_pct < 50:
            tips.append(
                f"Keyword overlap with the job description is only {overlap_pct}%. Mirror the JD's exact terminology and add terms like: {', '.join(missing_keywords[:6])}."
            )
        elif overlap_pct < 70:
            tips.append(
                f"Keyword overlap is {overlap_pct}%. Push it above 70% by weaving in terms such as: {', '.join(missing_keywords[:4])}."
            )

    if len(verbs_found) < 5:
        tips.append("Use more achievement-focused action verbs like 'Delivered', 'Reduced', 'Scaled', or 'Architected'.")

    if quant_score < 6:
        tips.append("Add quantified results to experience bullets, such as percentages, team sizes, latency reductions, or revenue impact.")

    if not cv_data.get("email"):
        tips.append("Add an email address in plain text so ATS systems can parse your contact details correctly.")
    if not cv_data.get("phone"):
        tips.append("Add a phone number in plain text format.")

    if readability_score < 4:
        tips.append("Reduce ATS-hostile formatting such as decorative bullets, tables, icons, and text-box style layouts.")

    tech_count = len((cv_data.get("skills") or {}).get("technical", []))
    if tech_count < 6:
        tips.append(f"Only {tech_count} technical skills were detected. Expand the skills section to 8-12 relevant keywords.")

    if not tips:
        tips.append("The CV looks ATS-friendly overall. Focus on tailoring keywords to each specific role.")

    return tips


def _tokenise(text: str) -> list[str]:
    tokens = re.findall(r"\b[a-z][a-z0-9+#.\-/]{1,}\b", text.lower())
    significant = [token for token in tokens if token not in _STOP_WORDS and len(token) > 2]

    known_skills = [skill for skill in TECHNICAL_SKILLS if skill in normalise(text)]
    return significant + known_skills


def _probability_label(score: int) -> str:
    if score >= 85:
        return f"Your CV will pass ATS at {score}% - Excellent"
    if score >= 70:
        return f"Your CV will pass ATS at {score}% - Good"
    if score >= 55:
        return f"Your CV will pass ATS at {score}% - Moderate"
    if score >= 40:
        return f"Your CV will pass ATS at {score}% - At Risk"
    return f"Your CV will pass ATS at {score}% - Likely Rejected"
