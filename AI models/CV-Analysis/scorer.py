# scorer.py
# Calculates a structured score out of 100 for a parsed CV.
#
# Score breakdown:
#   Experience  → 30 pts  (based on total years detected)
#   Skills      → 30 pts  (breadth of technical + soft skills)
#   Education   → 10 pts  (degree level detected)
#   Projects    → 20 pts  (project/portfolio signals in raw text)
#   Clarity     → 10 pts  (contact completeness, length, structure)

import re
from dataclasses import dataclass, field, asdict

# ---------------------------------------------------------------------------
# Internal constants
# ---------------------------------------------------------------------------

# Words that strongly imply a projects section
_PROJECT_SIGNALS: list[str] = [
    "project", "built", "developed", "created", "implemented", "designed",
    "deployed", "launched", "open source", "github", "portfolio",
    "app", "application", "system", "platform", "api", "tool",
]

# Degree-level scoring map (higher degree → higher score contribution)
_DEGREE_LEVELS: dict[str, int] = {
    "phd": 10,
    "ph.d": 10,
    "doctorate": 10,
    "master": 8,
    "msc": 8,
    "m.sc": 8,
    "mba": 8,
    "meng": 8,
    "m.eng": 8,
    "bachelor": 6,
    "bsc": 6,
    "b.sc": 6,
    "beng": 6,
    "b.eng": 6,
    "b.a": 5,
    "ba": 5,
    "associate": 4,
    "diploma": 3,
    "certificate": 2,
    "high school": 1,
}


# ---------------------------------------------------------------------------
# Result dataclass
# ---------------------------------------------------------------------------

@dataclass
class ScoreBreakdown:
    experience_score: int = 0      # max 30
    skills_score: int = 0          # max 30
    education_score: int = 0       # max 10
    projects_score: int = 0        # max 20
    clarity_score: int = 0         # max 10
    final_score: int = 0           # sum of above (0-100)
    score_details: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def score_cv(cv_data: dict, raw_text: str) -> ScoreBreakdown:
    """
    Score a parsed CV dict (output of analyzer.analyze_cv) plus raw text.

    Args:
        cv_data:  Structured dict from the CV analyzer.
        raw_text: Full plain-text content of the CV.

    Returns:
        ScoreBreakdown with individual scores and a final_score.
    """
    exp_score, exp_detail   = _score_experience(cv_data)
    skill_score, skill_detail = _score_skills(cv_data)
    edu_score, edu_detail   = _score_education(cv_data)
    proj_score, proj_detail = _score_projects(raw_text)
    clarity_score, clarity_detail = _score_clarity(cv_data, raw_text)

    final = exp_score + skill_score + edu_score + proj_score + clarity_score

    return ScoreBreakdown(
        experience_score=exp_score,
        skills_score=skill_score,
        education_score=edu_score,
        projects_score=proj_score,
        clarity_score=clarity_score,
        final_score=min(final, 100),   # cap at 100
        score_details={
            "experience": exp_detail,
            "skills": skill_detail,
            "education": edu_detail,
            "projects": proj_detail,
            "clarity": clarity_detail,
        },
    )


# ---------------------------------------------------------------------------
# Sub-scorers
# ---------------------------------------------------------------------------

def _score_experience(cv_data: dict) -> tuple[int, str]:
    """
    Score experience out of 30.

    Tiers:
        0      years →  0
        <1     year  →  5
        1-2    years → 10
        3-4    years → 18
        5-7    years → 24
        8-10   years → 28
        10+    years → 30
    """
    exp_years_str: str = cv_data.get("experience_years", "Unknown")
    years = _parse_years_from_string(exp_years_str)

    if years == 0:
        score, detail = 0, "No work experience detected."
    elif years < 1:
        score, detail = 5, "Less than 1 year of experience."
    elif years < 3:
        score, detail = 10, f"{years:.1f} years — junior level."
    elif years < 5:
        score, detail = 18, f"{years:.1f} years — mid-level."
    elif years < 8:
        score, detail = 24, f"{years:.1f} years — senior level."
    elif years < 11:
        score, detail = 28, f"{years:.1f} years — lead / principal level."
    else:
        score, detail = 30, f"{years:.1f}+ years — staff / expert level."

    return score, detail


def _score_skills(cv_data: dict) -> tuple[int, str]:
    """
    Score skills out of 30.

    Technical skills → up to 22 pts
    Soft skills      → up to  8 pts
    """
    skills: dict = cv_data.get("skills", {})
    technical: list = skills.get("technical", [])
    soft: list = skills.get("soft", [])

    # Technical: 2 pts each, cap at 22
    tech_score = min(len(technical) * 2, 22)
    # Soft: 1 pt each, cap at 8
    soft_score = min(len(soft), 8)
    total = tech_score + soft_score

    detail = (
        f"{len(technical)} technical skills (+{tech_score} pts), "
        f"{len(soft)} soft skills (+{soft_score} pts)."
    )
    return total, detail


def _score_education(cv_data: dict) -> tuple[int, str]:
    """
    Score education out of 10.
    Finds the highest-level degree mentioned in the education entries.
    """
    education: list[str] = cv_data.get("education", [])
    if not education:
        return 0, "No education entries detected."

    combined = " ".join(education).lower()
    best_score = 0
    best_label = "No recognised degree keyword found."

    for keyword, pts in _DEGREE_LEVELS.items():
        if keyword in combined and pts > best_score:
            best_score = pts
            best_label = f"Highest degree detected: '{keyword}' → {pts}/10 pts."

    return best_score, best_label


def _score_projects(raw_text: str) -> tuple[int, str]:
    """
    Score projects/portfolio out of 20.

    Counts distinct project-signal words; each unique signal = 2 pts, cap at 20.
    This rewards candidates who describe concrete work artefacts.
    """
    lower_text = raw_text.lower()
    hits: list[str] = [s for s in _PROJECT_SIGNALS if s in lower_text]
    score = min(len(hits) * 2, 20)

    if not hits:
        detail = "No project or portfolio signals found."
    else:
        detail = f"Project signals found: {', '.join(hits[:6])}{'…' if len(hits) > 6 else ''}. Score: {score}/20."

    return score, detail


def _score_clarity(cv_data: dict, raw_text: str) -> tuple[int, str]:
    """
    Score CV clarity / completeness out of 10.

    Criteria:
        Has name    → +2
        Has email   → +2
        Has phone   → +2
        CV length ≥ 300 words → +2
        Structured sections detected → +2
    """
    score = 0
    reasons: list[str] = []

    if cv_data.get("name"):
        score += 2
        reasons.append("Name present (+2)")
    if cv_data.get("email"):
        score += 2
        reasons.append("Email present (+2)")
    if cv_data.get("phone"):
        score += 2
        reasons.append("Phone present (+2)")

    word_count = len(raw_text.split())
    if word_count >= 300:
        score += 2
        reasons.append(f"CV length {word_count} words (+2)")
    else:
        reasons.append(f"CV too short ({word_count} words, need ≥300)")

    found_sections = cv_data.get("detected_sections", [])
    if len(found_sections) >= 2:
        score += 2
        reasons.append(f"Sections detected: {found_sections} (+2)")
    else:
        reasons.append("Few or no section headers detected.")

    return score, " | ".join(reasons)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _parse_years_from_string(years_str: str) -> float:
    """
    Parse a human-readable years string like '3 years 4 months' into a float.
    Returns 0.0 if parsing fails.
    """
    if not years_str or years_str.lower() == "unknown":
        return 0.0

    years = 0.0
    months = 0.0

    year_match = re.search(r"(\d+)\s*year", years_str, re.IGNORECASE)
    month_match = re.search(r"(\d+)\s*month", years_str, re.IGNORECASE)

    if year_match:
        years = float(year_match.group(1))
    if month_match:
        months = float(month_match.group(1))

    return years + months / 12
