"""
HireMind - Text Intelligence Engine
Analyzes answer quality, structure, and relevance to the active question.
All scores are internal — coaching messages are human-friendly summaries only.
"""

import re
import math
from typing import Optional


# ── Stop words (excluded from keyword matching) ─────────────────────────────
STOP_WORDS = {
    "i", "me", "my", "we", "our", "you", "your", "he", "she", "they", "it",
    "a", "an", "the", "and", "but", "or", "so", "if", "in", "on", "at",
    "to", "for", "of", "with", "about", "is", "was", "are", "were", "be",
    "been", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "that", "this", "which", "what", "when", "where",
    "how", "who", "then", "than", "there", "their", "they", "from", "by",
    "not", "as", "up", "out", "can", "just", "also", "more", "very",
}

# Answer quality signals
STRONG_STRUCTURE_MARKERS = [
    "first", "second", "third", "finally", "in conclusion", "to summarize",
    "for example", "such as", "specifically", "in my experience",
    "the result was", "this led to", "as a result",
]

WEAK_MARKERS = [
    "i don't know", "i'm not sure", "i guess", "maybe", "i think maybe",
    "i have no idea", "not really",
]

STAR_METHOD_SIGNALS = {
    "situation": ["when i was", "in my previous", "at my last", "during my time"],
    "task":      ["my responsibility", "i was tasked", "i needed to", "my role was"],
    "action":    ["i decided", "i implemented", "i worked on", "i led", "i created"],
    "result":    ["as a result", "the outcome", "we achieved", "this resulted in",
                  "we improved", "it led to", "the result was"],
}


class TextIntelligence:
    """
    Scores answer quality across four dimensions:
    ─ Structure (0–10): Logical flow, use of connectors, STAR method signals
    ─ Relevance (0–10): Keyword overlap with the current question
    ─ Depth     (0–10): Detail level, examples, specificity
    ─ Confidence(0–10): Language certainty vs hedging
    """

    def analyze(self, transcript: str, current_question: Optional[str] = None) -> dict:
        """
        Full answer analysis.  Returns internal scores dict.
        """
        if not transcript or len(transcript.strip()) < 10:
            return self._empty_result()

        text = transcript.strip()

        structure_score = self._score_structure(text)
        depth_score     = self._score_depth(text)
        confidence_score= self._score_confidence(text)
        relevance_score = self._score_relevance(text, current_question)

        overall = round(
            (structure_score * 0.30 + depth_score * 0.25
             + confidence_score * 0.25 + relevance_score * 0.20),
            1
        )

        return {
            "structure_score":   round(structure_score, 1),
            "depth_score":       round(depth_score, 1),
            "confidence_score":  round(confidence_score, 1),
            "relevance_score":   round(relevance_score, 1),
            "overall_score":     overall,
            "word_count":        len(text.split()),
            "star_signals":      self._detect_star(text),
            "weak_language":     self._detect_weak_language(text),
            "coaching_flags":    self._generate_coaching_flags(
                structure_score, depth_score, confidence_score, relevance_score, text
            ),
        }

    # ──────────────────────────────────────────────────
    # Dimension scorers
    # ──────────────────────────────────────────────────

    def _score_structure(self, text: str) -> float:
        """Score 0–10 based on logical connectors and structural markers."""
        lower = text.lower()
        score = 5.0  # baseline

        # Positive: structural markers present
        found = sum(1 for m in STRONG_STRUCTURE_MARKERS if m in lower)
        score += min(3.0, found * 1.0)

        # Positive: STAR method coverage
        star_coverage = len(self._detect_star(text))
        score += star_coverage * 0.5

        # Positive: multiple sentences (not one giant run-on)
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        if 3 <= len(sentences) <= 8:
            score += 1.0

        # Negative: very short or very long
        wc = len(text.split())
        if wc < 20:
            score -= 2.0
        elif wc > 300:
            score -= 1.0

        return max(0.0, min(10.0, score))

    def _score_depth(self, text: str) -> float:
        """Score 0–10 based on detail level and specificity."""
        lower = text.lower()
        score = 5.0

        # Specific numbers / stats → depth
        numbers = re.findall(r'\b\d+(?:\.\d+)?(?:%|x|times|percent)?\b', text)
        score += min(2.0, len(numbers) * 0.5)

        # Named specifics (proper nouns, "my team", "our company")
        specifics = len(re.findall(r'\b(?:my|our|we|team|company|project|client)\b', lower))
        score += min(1.5, specifics * 0.3)

        # Word count (more words = more detail, up to a point)
        wc = len(text.split())
        if wc >= 80:
            score += 1.5
        elif wc >= 40:
            score += 0.5
        elif wc < 20:
            score -= 2.0

        return max(0.0, min(10.0, score))

    def _score_confidence(self, text: str) -> float:
        """Score 0–10; penalise weak, hedging language."""
        lower = text.lower()
        score = 8.0

        # Penalise weak markers
        for wm in WEAK_MARKERS:
            if wm in lower:
                score -= 1.5

        # Penalise excessive hedging words
        hedge_words = ["maybe", "perhaps", "i think", "sort of", "kind of",
                       "i guess", "probably", "might", "possibly"]
        hedges = sum(lower.count(h) for h in hedge_words)
        score -= min(3.0, hedges * 0.5)

        # Positive: assertive openers
        assertive = ["i", "we", "my", "our", "in my", "from my"]
        if any(lower.startswith(a) for a in assertive):
            score += 0.5

        return max(0.0, min(10.0, score))

    def _score_relevance(self, text: str, question: Optional[str]) -> float:
        """Score 0–10 based on keyword overlap with the question."""
        if not question:
            return 7.0  # neutral when no question context

        def keywords(s):
            words = re.findall(r'\b\w+\b', s.lower())
            return {w for w in words if w not in STOP_WORDS and len(w) > 3}

        q_kw = keywords(question)
        a_kw = keywords(text)

        if not q_kw:
            return 7.0

        overlap = len(q_kw & a_kw)
        jaccard = overlap / len(q_kw | a_kw)
        recall  = overlap / len(q_kw)

        score = jaccard * 5.0 + recall * 5.0
        return max(0.0, min(10.0, round(score, 1)))

    # ──────────────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────────────

    def _detect_star(self, text: str) -> list:
        """Return which STAR components are present."""
        lower = text.lower()
        found = []
        for component, signals in STAR_METHOD_SIGNALS.items():
            if any(s in lower for s in signals):
                found.append(component)
        return found

    def _detect_weak_language(self, text: str) -> list:
        """Return weak phrases detected in the answer."""
        lower = text.lower()
        return [m for m in WEAK_MARKERS if m in lower]

    def _generate_coaching_flags(
        self, structure, depth, confidence, relevance, text
    ) -> list:
        """
        Internal flags → mapped to human coaching messages by the coach.
        """
        flags = []
        if structure < 5.0:
            flags.append("low_structure")
        if depth < 5.0:
            flags.append("low_depth")
        if confidence < 6.0:
            flags.append("low_confidence_language")
        if relevance < 5.0:
            flags.append("off_topic")
        if len(text.split()) < 30:
            flags.append("answer_too_short")
        if len(text.split()) > 250:
            flags.append("answer_too_long")
        return flags

    def _empty_result(self) -> dict:
        return {
            "structure_score": 0.0, "depth_score": 0.0,
            "confidence_score": 0.0, "relevance_score": 0.0,
            "overall_score": 0.0, "word_count": 0,
            "star_signals": [], "weak_language": [],
            "coaching_flags": ["answer_too_short"],
        }
