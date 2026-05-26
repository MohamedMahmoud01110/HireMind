# llm_summarizer.py
# Recruiter-style CV summarization using an LLM backend.
#
# Provider priority (auto-detected from environment variables):
#   1. Anthropic  — set LLM_PROVIDER=anthropic  + ANTHROPIC_API_KEY
#   2. OpenAI     — set LLM_PROVIDER=openai     + OPENAI_API_KEY
#   3. Groq       — set LLM_PROVIDER=groq        + GROQ_API_KEY       (free tier)
#   4. Ollama     — set LLM_PROVIDER=ollama      (no key, local server)
#   5. Rule-based — automatic fallback when no provider is configured
#
# All LLM calls funnel through a single generate_summary(prompt) function,
# making it trivial to swap providers.
#
# Environment variables:
#   LLM_PROVIDER   = anthropic | openai | groq | ollama | auto (default: auto)
#   LLM_API_KEY    = your API key (not needed for ollama)
#   LLM_MODEL      = model name override  (e.g. "gpt-4o-mini", "llama3", etc.)
#   LLM_BASE_URL   = custom base URL      (for self-hosted / proxied OpenAI)
#   OLLAMA_URL     = ollama server URL    (default: http://localhost:11434)

from __future__ import annotations

import os
import re
import json
import logging
import textwrap
from enum import Enum

import httpx

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Provider enum & auto-detection
# ---------------------------------------------------------------------------

class LLMProvider(str, Enum):
    ANTHROPIC  = "anthropic"
    OPENAI     = "openai"
    GROQ       = "groq"
    OLLAMA     = "ollama"
    RULE_BASED = "rule_based"


def _detect_provider() -> LLMProvider:
    """
    Determine which LLM backend to use based on environment variables.
    Called once at module load; result cached in _PROVIDER.
    """
    explicit = os.getenv("LLM_PROVIDER", "auto").lower()

    if explicit != "auto":
        try:
            return LLMProvider(explicit)
        except ValueError:
            logger.warning("Unknown LLM_PROVIDER='%s'. Falling back to auto-detect.", explicit)

    # Auto-detect by checking for API keys
    if os.getenv("ANTHROPIC_API_KEY"):
        return LLMProvider.ANTHROPIC
    if os.getenv("OPENAI_API_KEY"):
        return LLMProvider.OPENAI
    if os.getenv("GROQ_API_KEY"):
        return LLMProvider.GROQ

    # Check if Ollama is running locally (non-blocking)
    try:
        resp = httpx.get(os.getenv("OLLAMA_URL", "http://localhost:11434"), timeout=1.5)
        if resp.status_code == 200:
            return LLMProvider.OLLAMA
    except Exception:
        pass

    logger.info("No LLM provider detected — using rule-based summarizer.")
    return LLMProvider.RULE_BASED


_PROVIDER: LLMProvider = _detect_provider()

# Default model names per provider
_DEFAULT_MODELS: dict[LLMProvider, str] = {
    LLMProvider.ANTHROPIC:  "claude-haiku-4-5-20251001",
    LLMProvider.OPENAI:     "gpt-4o-mini",
    LLMProvider.GROQ:       "llama-3.1-8b-instant",
    LLMProvider.OLLAMA:     "llama3",
}

_MODEL = os.getenv("LLM_MODEL") or _DEFAULT_MODELS.get(_PROVIDER, "")


# ---------------------------------------------------------------------------
# Core generate_summary() — single entry point for all LLM calls
# ---------------------------------------------------------------------------

def generate_summary(prompt: str, max_tokens: int = 600) -> str:
    """
    Send *prompt* to the configured LLM backend and return the response text.
    Falls back to rule-based generation if the LLM call fails.

    Args:
        prompt:     The full prompt string.
        max_tokens: Maximum tokens to generate (approximate for some backends).

    Returns:
        Generated text string.
    """
    try:
        if _PROVIDER == LLMProvider.ANTHROPIC:
            return _call_anthropic(prompt, max_tokens)
        if _PROVIDER == LLMProvider.OPENAI:
            return _call_openai_compatible(prompt, max_tokens,
                                           base_url=os.getenv("LLM_BASE_URL",
                                                               "https://api.openai.com/v1"),
                                           api_key=os.getenv("OPENAI_API_KEY", ""))
        if _PROVIDER == LLMProvider.GROQ:
            return _call_openai_compatible(prompt, max_tokens,
                                           base_url="https://api.groq.com/openai/v1",
                                           api_key=os.getenv("GROQ_API_KEY", ""))
        if _PROVIDER == LLMProvider.OLLAMA:
            return _call_ollama(prompt, max_tokens)
    except Exception as exc:
        logger.warning("LLM call failed (%s): %s — using rule-based fallback.", _PROVIDER, exc)

    # Rule-based is always the final safety net
    return ""   # signals caller to use rule-based path


# ---------------------------------------------------------------------------
# Provider-specific HTTP calls
# ---------------------------------------------------------------------------

def _call_anthropic(prompt: str, max_tokens: int) -> str:
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
    }
    body = {
        "model": _MODEL,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    resp = httpx.post(url, headers=headers, json=body, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return data["content"][0]["text"].strip()


def _call_openai_compatible(prompt: str, max_tokens: int, base_url: str, api_key: str) -> str:
    url = f"{base_url.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    body = {
        "model": _MODEL,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.4,
    }
    resp = httpx.post(url, headers=headers, json=body, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"].strip()


def _call_ollama(prompt: str, max_tokens: int) -> str:
    base = os.getenv("OLLAMA_URL", "http://localhost:11434")
    url  = f"{base}/api/generate"
    body = {
        "model": _MODEL,
        "prompt": prompt,
        "stream": False,
        "options": {"num_predict": max_tokens, "temperature": 0.4},
    }
    resp = httpx.post(url, json=body, timeout=60)
    resp.raise_for_status()
    return resp.json().get("response", "").strip()


# ---------------------------------------------------------------------------
# Public API — the one function main.py calls
# ---------------------------------------------------------------------------

def summarize_cv(cv_data: dict, raw_text: str) -> dict:
    """
    Generate three human-readable summaries of a CV.

    Args:
        cv_data:  Structured extraction from analyzer.analyze_cv.
        raw_text: Full plain text of the CV.

    Returns:
        {
            "professional_summary":       str,  # 3-6 line profile paragraph
            "recruiter_summary":          str,  # 2-3 sentence hiring pitch
            "candidate_strength_story":   str,  # narrative arc of the candidate
            "generated_by":               str,  # provider used
        }
    """
    # Build a compact CV digest to feed into the prompt (avoids token waste)
    digest = _build_digest(cv_data, raw_text)

    if _PROVIDER != LLMProvider.RULE_BASED:
        prompt = _build_prompt(digest)
        raw_response = generate_summary(prompt, max_tokens=700)

        if raw_response:
            parsed = _parse_llm_response(raw_response, cv_data, raw_text)
            parsed["generated_by"] = _PROVIDER.value
            return parsed

    # Rule-based fallback — deterministic, always works
    result = _rule_based_summary(cv_data, raw_text)
    result["generated_by"] = "rule_based"
    return result


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

def _build_digest(cv_data: dict, raw_text: str) -> str:
    """Create a token-efficient CV digest for the prompt."""
    name      = cv_data.get("name") or "the candidate"
    email     = cv_data.get("email") or ""
    tech      = ", ".join((cv_data.get("skills") or {}).get("technical", [])[:12])
    soft      = ", ".join((cv_data.get("skills") or {}).get("soft", [])[:6])
    tools     = ", ".join((cv_data.get("tools") or [])[:8])
    edu       = " | ".join((cv_data.get("education") or [])[:3])
    exp_years = cv_data.get("experience_years") or "Unknown"
    exp_items = "\n  - ".join((cv_data.get("experience") or [])[:5])
    snippet   = raw_text[:1200].replace("\n", " ").strip()

    return textwrap.dedent(f"""
        Name:             {name}
        Experience:       {exp_years}
        Technical Skills: {tech or 'not specified'}
        Soft Skills:      {soft or 'not specified'}
        Tools:            {tools or 'not specified'}
        Education:        {edu or 'not specified'}
        Recent Roles:
          - {exp_items or 'not specified'}
        CV Snippet:
          {snippet}
    """).strip()


def _build_prompt(digest: str) -> str:
    return textwrap.dedent(f"""
        You are a senior technical recruiter. Based on the following CV data,
        generate three sections. Respond ONLY with valid JSON — no markdown,
        no preamble, no explanation.

        CV DATA:
        {digest}

        Return exactly this JSON structure:
        {{
          "professional_summary": "3 to 6 line professional bio paragraph",
          "recruiter_summary": "2 to 3 sentence hiring pitch a recruiter would use",
          "candidate_strength_story": "A compelling 4 to 6 sentence narrative about this candidate's career journey and value proposition"
        }}
    """).strip()


# ---------------------------------------------------------------------------
# LLM response parser
# ---------------------------------------------------------------------------

def _parse_llm_response(raw: str, cv_data: dict, raw_text: str) -> dict:
    """
    Attempt to parse JSON from the LLM response.
    Falls back to rule-based if the JSON is malformed.
    """
    # Strip markdown code fences if present
    cleaned = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()

    # Try to extract JSON object
    json_match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if json_match:
        try:
            data = json.loads(json_match.group(0))
            return {
                "professional_summary":     data.get("professional_summary", ""),
                "recruiter_summary":        data.get("recruiter_summary", ""),
                "candidate_strength_story": data.get("candidate_strength_story", ""),
            }
        except json.JSONDecodeError:
            pass

    logger.warning("LLM returned non-JSON — falling back to rule-based.")
    return _rule_based_summary(cv_data, raw_text)


# ---------------------------------------------------------------------------
# Rule-based fallback summarizer
# ---------------------------------------------------------------------------

def _rule_based_summary(cv_data: dict, raw_text: str) -> dict:
    """
    Deterministic template-based summarizer.
    Used when no LLM is available or when the LLM call fails.
    """
    name      = cv_data.get("name") or "The candidate"
    exp_years = cv_data.get("experience_years") or ""
    tech      = (cv_data.get("skills") or {}).get("technical", [])
    soft      = (cv_data.get("skills") or {}).get("soft", [])
    tools     = cv_data.get("tools") or []
    education = cv_data.get("education") or []
    experience = cv_data.get("experience") or []

    # ── Experience level label ────────────────────────────────────────────
    level = _infer_level(exp_years)

    # ── Top skills ────────────────────────────────────────────────────────
    top_tech  = ", ".join(tech[:5]) if tech  else "various technologies"
    top_soft  = ", ".join(soft[:3]) if soft  else "strong interpersonal skills"
    top_tools = ", ".join(tools[:3]) if tools else ""

    # ── Education line ────────────────────────────────────────────────────
    edu_line = education[0] if education else ""

    # ── Latest role ───────────────────────────────────────────────────────
    latest_role = ""
    if experience:
        latest_role = experience[0][:120]

    # ── Build summaries ───────────────────────────────────────────────────
    exp_phrase = f"with {exp_years} of experience" if exp_years and exp_years != "Unknown" else ""

    professional_summary = _build_professional_summary(
        name, level, exp_phrase, top_tech, top_soft, edu_line, top_tools, latest_role
    )
    recruiter_summary = _build_recruiter_summary(
        name, level, exp_phrase, top_tech, soft
    )
    strength_story = _build_strength_story(
        name, level, exp_phrase, top_tech, top_soft, education, experience
    )

    return {
        "professional_summary":     professional_summary,
        "recruiter_summary":        recruiter_summary,
        "candidate_strength_story": strength_story,
    }


def _build_professional_summary(
    name, level, exp_phrase, top_tech, top_soft, edu_line, top_tools, latest_role
) -> str:
    lines = [
        f"{name} is a {level} professional {exp_phrase}.".strip(),
        f"Core technical expertise includes {top_tech}." if top_tech else "",
        f"Demonstrates {top_soft}." if top_soft else "",
        f"Proficient with tools including {top_tools}." if top_tools else "",
        f"Educational background: {edu_line}." if edu_line else "",
        f"Most recent experience: {latest_role}." if latest_role else "",
    ]
    return " ".join(l for l in lines if l).strip()


def _build_recruiter_summary(name, level, exp_phrase, top_tech, soft) -> str:
    leadership = "Leadership" in soft or "leadership" in " ".join(soft).lower()
    collab     = "Collaboration" in soft or "teamwork" in " ".join(soft).lower()

    parts = [
        f"{name} is a {level} candidate {exp_phrase}.".strip(),
        f"Strong command of {top_tech}." if top_tech else "",
        "Shows leadership potential and collaborative working style."
        if leadership and collab else
        "Demonstrates collaborative working style." if collab else
        "Demonstrates initiative and self-driven work ethic.",
        "Recommended for roles requiring technical depth and hands-on delivery.",
    ]
    return " ".join(p for p in parts if p)


def _build_strength_story(
    name, level, exp_phrase, top_tech, top_soft, education, experience
) -> str:
    edu_line = education[0] if education else ""
    exp_line = experience[0][:100] if experience else ""
    exp_count = len(experience)

    story_parts = [
        f"{name}'s career reflects a {level}-level trajectory {exp_phrase}.".strip(),
        f"Starting with a strong educational foundation{' in ' + edu_line if edu_line else ''}, "
        f"they developed expertise in {top_tech}." if top_tech else "",
        f"Across {exp_count} role{'s' if exp_count != 1 else ''}, "
        f"they have consistently applied skills in {top_soft}." if top_soft and exp_count else "",
        f"Notably, their work includes: {exp_line}." if exp_line else "",
        "Their profile suggests a candidate who can contribute meaningfully from day one "
        "while continuing to grow with the organisation.",
    ]
    return " ".join(p for p in story_parts if p)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _infer_level(exp_years: str) -> str:
    """Map an experience-years string to a career-level label."""
    if not exp_years or exp_years.lower() == "unknown":
        return "experienced"

    year_match = re.search(r"(\d+)\s*year", exp_years, re.IGNORECASE)
    if not year_match:
        return "experienced"

    years = int(year_match.group(1))
    if years < 1:  return "entry-level"
    if years < 3:  return "junior"
    if years < 6:  return "mid-level"
    if years < 10: return "senior"
    return "principal / staff-level"
