"""
HireMind - Emotion Engine
Detects emotion states and estimates stress from facial + speech signals.
All outputs are internal pipeline data — never shown raw to the user.
"""

import numpy as np
import time
from dataclasses import dataclass
from collections import deque
from typing import Literal, Optional


EmotionLabel = Literal["happy", "neutral", "stressed", "nervous", "confused", "engaged"]
StressLevel  = Literal["LOW", "MEDIUM", "HIGH"]


class EmotionDetector:
    """
    Multi-signal emotion + stress detector.

    Signal sources:
    ─ facial_tension  (from VisionAnalyzer)
    ─ head instability  (pitch/yaw/roll variance)
    ─ speech signals  (pitch_variance, speed_ratio from SpeechAnalyzer)
    ─ temporal smoothing over a rolling window
    """

    EMOTION_STRESS_WEIGHT = {
        "happy":   0.00,
        "engaged": 0.15,
        "neutral": 0.20,
        "confused":0.50,
        "stressed":0.85,
        "nervous": 0.90,
    }

    def __init__(self, window: int = 15):
        self._window = window
        self._tension_hist:  deque = deque(maxlen=window)
        self._emotion_hist:  deque = deque(maxlen=window)
        self._speech_stress: float = 0.0   # fed externally by speech engine

    # ──────────────────────────────────────────────────
    # External signal feeds
    # ──────────────────────────────────────────────────

    def update_speech_signal(self, pitch_variance: float, speed_ratio: float):
        """Called by the pipeline to feed speech-derived stress signals."""
        self._speech_stress = min(
            1.0,
            pitch_variance * 0.5 + max(0.0, speed_ratio - 1.0) * 0.5,
        )

    # ──────────────────────────────────────────────────
    # Emotion detection
    # ──────────────────────────────────────────────────

    def detect(self, face_data: dict) -> dict:
        """
        Classify emotion from face geometry signals.
        Returns {"label", "confidence", "scores"}.
        """
        if not face_data.get("detected"):
            return {"label": "neutral", "confidence": 0.1, "scores": {}}

        tension = face_data.get("facial_tension", 0.0)
        pose    = face_data.get("head_pose", {})
        yaw     = abs(pose.get("yaw",   0.0))
        pitch   = abs(pose.get("pitch", 0.0))
        roll    = abs(pose.get("roll",  0.0))

        self._tension_hist.append(tension)
        avg_tension = float(np.mean(self._tension_hist))

        head_instability = min(1.0, (yaw / 30 + pitch / 20 + roll / 15) / 3.0)

        # Classification thresholds
        if avg_tension < 0.20 and head_instability < 0.20:
            label = "happy"
            scores = {"happy": 0.70, "neutral": 0.20, "stressed": 0.05, "nervous": 0.05}

        elif avg_tension < 0.35 and head_instability < 0.30:
            label = "neutral"
            scores = {"happy": 0.10, "neutral": 0.70, "stressed": 0.10, "nervous": 0.10}

        elif avg_tension > 0.60 and head_instability > 0.50:
            label = "nervous"
            scores = {"happy": 0.00, "neutral": 0.10, "stressed": 0.30, "nervous": 0.60}

        elif avg_tension > 0.50:
            label = "stressed"
            scores = {"happy": 0.00, "neutral": 0.10, "stressed": 0.70, "nervous": 0.20}

        elif pitch > 20:
            label = "confused"
            scores = {"happy": 0.00, "neutral": 0.20, "confused": 0.60, "nervous": 0.20}

        else:
            label = "engaged"
            scores = {"happy": 0.20, "neutral": 0.20, "engaged": 0.50, "nervous": 0.10}

        confidence = round(scores.get(label, 0.5), 2)
        self._emotion_hist.append(label)

        return {"label": label, "confidence": confidence, "scores": scores}

    # ──────────────────────────────────────────────────
    # Stress estimation
    # ──────────────────────────────────────────────────

    def estimate_stress(self, face_data: dict, emotion_result: dict) -> dict:
        """
        Multi-signal stress score:
          35% facial tension
          35% speech irregularity
          30% emotion weight
        """
        tension       = face_data.get("facial_tension", 0.0)
        emotion_label = emotion_result.get("label", "neutral")
        emotion_score = self.EMOTION_STRESS_WEIGHT.get(emotion_label, 0.3)

        stress_score = min(1.0, max(0.0,
            tension        * 0.35
            + self._speech_stress * 0.35
            + emotion_score      * 0.30
        ))

        factors = []
        if tension > 0.50:
            factors.append("facial tension")
        if self._speech_stress > 0.50:
            factors.append("speech irregularity")
        if emotion_label in ("stressed", "nervous"):
            factors.append("nervous expression")

        if stress_score < 0.35:
            level = "LOW"
        elif stress_score < 0.65:
            level = "MEDIUM"
        else:
            level = "HIGH"

        return {
            "level": level,
            "score": round(stress_score, 2),
            "contributing_factors": factors,
        }

    # ──────────────────────────────────────────────────
    # Trend helpers
    # ──────────────────────────────────────────────────

    @property
    def dominant_emotion(self) -> str:
        """Most frequent emotion in recent history."""
        if not self._emotion_hist:
            return "neutral"
        from collections import Counter
        return Counter(self._emotion_hist).most_common(1)[0][0]

    @property
    def avg_tension(self) -> float:
        return float(np.mean(self._tension_hist)) if self._tension_hist else 0.0
