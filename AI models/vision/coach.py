"""
HireMind - Adaptive Coaching Engine
Converts internal analysis signals into human-friendly coaching messages.
The user NEVER sees raw scores, labels, or analysis — only coaching messages.
"""

import random
import time
import numpy as np
from collections import deque
from typing import Optional, Literal


Mode = Literal["interview", "presentation", "practice"]

# ── Interview questions (adaptive — harder questions as confidence grows) ─────
INTERVIEW_QUESTIONS = {
    "warm_up": [
        "Tell me a little about yourself.",
        "What brings you here today?",
        "Walk me through your background briefly.",
    ],
    "standard": [
        "What is your greatest professional strength?",
        "Describe a challenging situation and how you resolved it.",
        "Why are you interested in this role?",
        "Tell me about a time you demonstrated leadership.",
        "How do you prioritize when you have multiple deadlines?",
        "Describe your ideal work environment.",
        "What motivates you in your career?",
    ],
    "advanced": [
        "Tell me about a time you failed and what you learned from it.",
        "Describe a situation where you had to influence without authority.",
        "How do you handle significant disagreements with your manager?",
        "Walk me through a complex problem you solved end-to-end.",
        "Tell me about a time you drove a change no one asked for.",
    ],
}

# ── Coaching message templates ─────────────────────────────────────────────────
FEEDBACK = {
    # Eye contact
    "eye_contact_away": [
        "Maintain eye contact with the camera — it builds trust with your interviewer.",
        "Try to look directly at the camera. It signals confidence and engagement.",
        "Your gaze drifted. Re-center — eye contact keeps your audience focused on you.",
    ],
    # Stress
    "stress_high": [
        "Take a slow breath. You're doing better than you think — relax your shoulders.",
        "I notice some tension. Pause for a second, breathe, and reset.",
        "High stress can cloud your message. Slow down — you have time.",
        "Remember: it's a conversation, not an interrogation. Ease up on yourself.",
    ],
    "stress_medium": [
        "You're a little tense — channel it into focused energy.",
        "Slight nerves showing. Ground yourself before your next answer.",
    ],
    # Emotion
    "nervous": [
        "Relax your expression — you know this material well.",
        "Take a breath and remember your preparation. You've got this.",
    ],
    "confused": [
        "It's okay to pause and think before answering — a thoughtful pause reads as confidence.",
        "Take your time. A considered response is always better than a rushed one.",
    ],
    "no_expression": [
        "Let a little more energy into your expression — warmth helps you connect.",
        "Your face is quite neutral. A subtle smile signals enthusiasm and interest.",
    ],
    "happy": [
        "Great energy! That positive presence is very engaging — keep it up.",
        "Your enthusiasm is coming through clearly. That warmth works in your favour.",
    ],
    # Posture
    "slouching": [
        "Sit up straight — good posture signals confidence and authority.",
        "Posture check: shoulders back, spine tall.",
        "Roll your shoulders back and sit tall — it changes how you feel too.",
    ],
    "leaning": [
        "Try to sit centered and symmetrically — it helps you look composed.",
        "You're leaning a little. Center yourself for a stronger presence.",
    ],
    # Speech
    "speech_fast": [
        "Slow down a little — let your ideas breathe. Pace improves comprehension.",
        "You're speaking quickly. Slowing down signals confidence, not anxiety.",
    ],
    "speech_slow": [
        "Pick up your pace slightly — a steady rhythm keeps energy in the conversation.",
        "A bit slow — a touch more tempo will keep the interviewer engaged.",
    ],
    "filler_words": [
        "Watch the filler words — replace 'um' and 'uh' with a confident pause.",
        "A few fillers snuck in. Silence is more powerful than 'um' or 'like'.",
        "Practice pausing instead of filling. A pause reads as thoughtfulness.",
    ],
    # Answer quality
    "answer_too_short": [
        "Expand on that — give a specific example to add depth to your answer.",
        "Good start. Back it up with a concrete situation or result.",
    ],
    # FIX 4: Added "low_depth" — previously emitted by text_intelligence.py but
    # silently dropped because FEEDBACK had no entry for it.
    # The flag signals the answer lacks specifics; the tip mirrors that intent.
    "low_depth": [
        "Add more detail — include a specific example, number, or outcome to strengthen your answer.",
        "Dig a little deeper. What was the concrete result or impact of what you did?",
    ],
    "low_structure": [
        "Try structuring your answer: situation → what you did → the outcome.",
        "A clearer structure will help your interviewer follow your thinking.",
    ],
    "low_confidence_language": [
        "Sound more decisive — replace 'I think maybe' with 'I believe' or 'I know'.",
        "Own your answers with confident language. You know more than you think.",
    ],
    "off_topic": [
        "Make sure you're answering the question that was asked — stay focused.",
        "Bring your answer back to what was asked before adding context.",
    ],
    # FIX 4: Added "answer_too_long" — previously emitted by text_intelligence.py
    # but silently dropped. The flag means the answer is rambling; the tip is the
    # natural coaching response.
    "answer_too_long": [
        "You're being very thorough — try wrapping up with a clear, concise conclusion.",
        "Great detail, but aim to land the key point a bit sooner. Brevity impresses too.",
    ],
    # Positive
    "good_clarity": [
        "Clear, well-paced delivery. That's the tone you want to maintain.",
        "Your delivery is sharp. Keep that rhythm.",
    ],
    "positive_overall": [
        "You're doing really well overall — stay consistent.",
        "Strong performance. Keep this energy through the session.",
        "Excellent work. You're projecting confidence and clarity.",
    ],
}


class BehaviorTracker:
    """Tracks behavior patterns over time for adaptive coaching decisions."""

    def __init__(self, window: int = 20):
        self.eye_away_events = deque(maxlen=window)
        self.stress_scores   = deque(maxlen=window)
        self.wpm_readings    = deque(maxlen=window)
        self.filler_counts   = deque(maxlen=window)
        self.posture_flags   = deque(maxlen=window)
        self.emotion_labels  = deque(maxlen=window)
        self.answer_scores   = deque(maxlen=20)

    def update(self, video: dict, audio: dict, text_result: Optional[dict] = None):
        eye = video.get("eye", {})
        self.eye_away_events.append(1 if eye.get("looking_away") else 0)

        stress = video.get("stress", {})
        self.stress_scores.append(stress.get("score", 0))

        # FIX: emotion may be an enriched dict {"mediapipe": {...}, "deepface": {...}}
        # from deepface_analyzer.enrich_emotion() — extract the plain label safely.
        raw_emotion = video.get("emotion", {})
        if isinstance(raw_emotion, dict) and "mediapipe" in raw_emotion:
            emotion_label = (raw_emotion.get("mediapipe") or {}).get("label", "neutral")
        else:
            emotion_label = raw_emotion.get("label", "neutral") if isinstance(raw_emotion, dict) else "neutral"
        self.emotion_labels.append(emotion_label)

        posture = video.get("posture", {})
        self.posture_flags.append(1 if posture.get("slouching") else 0)

        analysis = audio.get("analysis", {})
        self.wpm_readings.append(analysis.get("words_per_minute", 120))
        self.filler_counts.append(analysis.get("filler_count", 0))

        if text_result:
            self.answer_scores.append(text_result.get("overall_score", 5.0))

    @property
    def avg_stress(self) -> float:
        return float(np.mean(self.stress_scores)) if self.stress_scores else 0.0

    @property
    def eye_contact_rate(self) -> float:
        if not self.eye_away_events:
            return 1.0
        return 1.0 - float(np.mean(self.eye_away_events))

    @property
    def avg_wpm(self) -> float:
        return float(np.mean(self.wpm_readings)) if self.wpm_readings else 120.0

    @property
    def avg_answer_score(self) -> float:
        return float(np.mean(self.answer_scores)) if self.answer_scores else 5.0

    @property
    def chronic_issues(self) -> list:
        issues = []
        if len(self.stress_scores) > 5 and np.mean(self.stress_scores) > 0.60:
            issues.append("chronic_stress")
        if len(self.eye_away_events) > 5 and np.mean(self.eye_away_events) > 0.40:
            issues.append("chronic_eye_contact")
        if len(self.posture_flags) > 5 and np.mean(self.posture_flags) > 0.50:
            issues.append("chronic_posture")
        if len(self.filler_counts) > 5 and np.mean(self.filler_counts) > 3:
            issues.append("chronic_fillers")
        return issues


class AdaptiveCoach:
    """
    Converts raw analysis signals → human-readable coaching messages.
    Applies cooldowns, prioritisation, and adaptive difficulty.
    """

    def __init__(self, mode: Mode = "interview"):
        self.mode    = mode
        self.tracker = BehaviorTracker()
        self._last_feedback: dict[str, float] = {}
        self._cooldown = 45   # seconds between same tip
        self._session_start = time.time()
        self._question_idx  = 0
        self._questions_asked: list[str] = []
        self._improvement_acknowledged: set = set()

    def set_mode(self, mode: str):
        self.mode = mode

    # ──────────────────────────────────────────────────
    # Internal pick helper
    # ──────────────────────────────────────────────────

    def _pick(self, key: str, force: bool = False) -> Optional[str]:
        now  = time.time()
        last = self._last_feedback.get(key, 0)
        if not force and now - last < self._cooldown:
            return None
        templates = FEEDBACK.get(key, [])
        if not templates:
            return None
        self._last_feedback[key] = now
        return random.choice(templates)

    # ──────────────────────────────────────────────────
    # Coaching message generation
    # ──────────────────────────────────────────────────

    def generate(
        self,
        video:       dict,
        audio:       dict,
        history:     list,
        text_result: Optional[dict] = None,
    ) -> dict:
        """
        Generates up to 2 coaching tips + optional adaptive note.
        All output is human-readable — no raw scores.
        """
        self.tracker.update(video, audio, text_result)

        tips     = []
        priority = "info"

        stress  = video.get("stress", {})
        eye     = video.get("eye", {})
        posture = video.get("posture", {})
        emotion = video.get("emotion", {})
        speech  = audio.get("analysis", {})

        # ── HIGH PRIORITY: Stress ────────────────────────────────
        if stress.get("level") == "HIGH":
            tip = self._pick("stress_high")
            if tip:
                tips.append(tip)
                priority = "urgent"
        elif stress.get("level") == "MEDIUM":
            tip = self._pick("stress_medium")
            if tip:
                tips.append(tip)

        # ── Eye Contact ──────────────────────────────────────────
        if eye.get("away_duration", 0) > 3:
            tip = self._pick("eye_contact_away")
            if tip:
                tips.append(tip)

        # ── Emotion ──────────────────────────────────────────────
        label = emotion.get("label", "neutral")
        if label == "nervous":
            tip = self._pick("nervous")
            if tip: tips.append(tip)
        elif label == "confused":
            tip = self._pick("confused")
            if tip: tips.append(tip)
        elif label in ("neutral",) and self.tracker.avg_stress < 0.3:
            tip = self._pick("no_expression")
            if tip: tips.append(tip)
        elif label == "happy":
            tip = self._pick("happy")
            if tip: tips.append(tip)

        # ── Posture ──────────────────────────────────────────────
        if posture.get("slouching"):
            tip = self._pick("slouching")
            if tip: tips.append(tip)
        if posture.get("leaning", "none") != "none":
            tip = self._pick("leaning")
            if tip: tips.append(tip)

        # ── Speech pace ──────────────────────────────────────────
        wpm = speech.get("words_per_minute", 0)
        if wpm > 165:
            tip = self._pick("speech_fast")
            if tip: tips.append(tip)
        elif 0 < wpm < 100:
            tip = self._pick("speech_slow")
            if tip: tips.append(tip)

        if speech.get("filler_count", 0) > 2:
            tip = self._pick("filler_words")
            if tip: tips.append(tip)

        # ── Text intelligence coaching ────────────────────────────
        # FIX 4 (part B): Every flag from text_intelligence is now handled
        # because FEEDBACK contains entries for all possible flag values.
        # _pick() returns None for unknown keys (safe), but adding the entries
        # ensures users actually receive the coaching they need.
        if text_result:
            for flag in text_result.get("coaching_flags", []):
                tip = self._pick(flag)
                if tip: tips.append(tip)

        # ── Positive reinforcement ────────────────────────────────
        if not tips and len(history) > 3:
            if self.tracker.avg_stress < 0.3 and self.tracker.eye_contact_rate > 0.8:
                tip = self._pick("positive_overall")
                if tip:
                    tips.append(tip)
                    priority = "success"
            elif speech.get("clarity_score", 0) >= 8:
                tip = self._pick("good_clarity")
                if tip:
                    tips.append(tip)
                    priority = "success"

        # ── Adaptive note (chronic patterns) ─────────────────────
        adaptive_note = None
        chronic = self.tracker.chronic_issues
        if "chronic_stress" in chronic:
            adaptive_note = "Stress appears to be a recurring pattern — consider a few slow, deep breaths before each answer."
        elif "chronic_eye_contact" in chronic:
            adaptive_note = "Eye contact has been a consistent challenge — try placing a small sticker near your camera as a visual anchor."
        elif "chronic_fillers" in chronic:
            adaptive_note = "Filler words keep appearing — recording yourself and listening back is one of the fastest ways to reduce them."
        elif "chronic_posture" in chronic:
            adaptive_note = "Your posture tends to drop over time — try sitting on the front edge of your seat to stay upright naturally."

        # ── Next question ─────────────────────────────────────────
        next_question = None
        if self.mode == "interview" and len(history) % 5 == 0 and len(history) > 0:
            next_question = self._pick_question()

        return {
            "tips":          tips[:2],
            "priority":      priority,
            "adaptive_note": adaptive_note,
            "next_question": next_question,
            "chronic_issues": chronic,
        }

    def _pick_question(self) -> str:
        """Select the next interview question based on performance level."""
        avg_score = self.tracker.avg_answer_score

        if self._question_idx == 0:
            pool = INTERVIEW_QUESTIONS["warm_up"]
        elif avg_score >= 7.5:
            pool = INTERVIEW_QUESTIONS["advanced"]
        elif avg_score >= 5.0:
            pool = INTERVIEW_QUESTIONS["standard"]
        else:
            pool = INTERVIEW_QUESTIONS["standard"]

        unused = [q for q in pool if q not in self._questions_asked]
        if not unused:
            self._questions_asked = []
            unused = pool

        q = random.choice(unused)
        self._questions_asked.append(q)
        self._question_idx += 1
        return q

    # ──────────────────────────────────────────────────
    # Scoring (internal — never sent raw to user)
    # ──────────────────────────────────────────────────

    def score(self, video: dict, audio: dict, text_result: Optional[dict] = None) -> dict:
        stress  = video.get("stress", {})
        eye     = video.get("eye", {})
        posture = video.get("posture", {})
        emotion = video.get("emotion", {})
        speech  = audio.get("analysis", {})

        stress_val    = 1.0 - stress.get("score", 0.5)
        emotion_bonus = {"happy": 1.0, "engaged": 0.9, "neutral": 0.7,
                         "confused": 0.5, "stressed": 0.3, "nervous": 0.2}
        emotion_val   = emotion_bonus.get(emotion.get("label", "neutral"), 0.5)
        confidence    = (stress_val * 0.5 + emotion_val * 0.3 + eye.get("contact_ratio", 0.5) * 0.2) * 10

        clarity = speech.get("clarity_score", 5.0)

        posture_score = 10.0
        if posture.get("slouching"):
            posture_score -= 3.0
        if posture.get("leaning", "none") != "none":
            posture_score -= 1.5
        posture_score = max(0.0, posture_score)

        eye_score  = eye.get("contact_ratio", 0.5) * 10
        text_score = text_result.get("overall_score", 5.0) if text_result else 5.0

        overall = round(
            (confidence + clarity + posture_score + eye_score + text_score) / 5, 1
        )

        return {
            "confidence":     round(min(10.0, confidence), 1),
            "clarity":        round(clarity, 1),
            "posture":        round(posture_score, 1),
            "eye_contact":    round(min(10.0, eye_score), 1),
            "answer_quality": round(text_score, 1),
            "overall":        overall,
        }

    # ──────────────────────────────────────────────────
    # Session report
    # ──────────────────────────────────────────────────

    def generate_report(self, history: list) -> dict:
        if not history:
            return {"error": "No session data."}

        all_scores = [h["scores"] for h in history if h.get("scores")]
        if not all_scores:
            return {"error": "No scores recorded."}

        keys = ["confidence", "clarity", "posture", "eye_contact", "answer_quality", "overall"]
        avg = {
            k: round(np.mean([s[k] for s in all_scores if k in s]), 1)
            for k in keys
        }

        n     = max(1, len(all_scores) // 3)
        early = all_scores[:n]
        late  = all_scores[-n:]
        delta = np.mean([s["overall"] for s in late]) - np.mean([s["overall"] for s in early])
        trend = "improving" if delta > 0.5 else ("declining" if delta < -0.5 else "stable")

        duration = 0.0
        if len(history) > 1:
            duration = round((history[-1]["timestamp"] - history[0]["timestamp"]) / 60, 1)

        strengths, improvements = [], []
        for k, v in avg.items():
            if k == "overall":
                continue
            if v >= 7.5:
                strengths.append(k)
            elif v < 5.5:
                improvements.append(k)

        return {
            "session_duration_min":  duration,
            "average_scores":        avg,
            "trend":                 trend,
            "strengths":             strengths,
            "areas_for_improvement": improvements,
            "chronic_issues":        self.tracker.chronic_issues,
            "questions_asked":       self._questions_asked,
            "total_frames":          len(history),
        }