"""
Speech Engine - Transcription and analysis
Supports Vosk (fast), Whisper (accurate), Azure (premium)
"""

import re
import time
import numpy as np
from dataclasses import dataclass
from typing import Optional, Literal


SpeechEngine = Literal["vosk", "whisper", "azure"]

# Filler words (English + Arabic)
FILLER_WORDS = {
    "um", "uh", "er", "ah", "like", "you know", "basically",
    "literally", "right", "okay so", "so um",
    "يعني", "بصراحة", "يلا", "هيك", "تعرف",
}


@dataclass
class SpeechAnalysis:
    words_per_minute: float = 0.0
    filler_count: int = 0
    filler_words_found: list = None
    clarity_score: float = 10.0  # /10
    pace: str = "normal"  # slow, normal, fast
    sentence_count: int = 0
    avg_sentence_length: float = 0.0
    pitch_variance: float = 0.0
    speech_rate_variance: float = 0.0


class SpeechAnalyzer:
    """Multi-engine speech transcription and quality analysis."""

    def __init__(self):
        self._vosk_model = None
        self._whisper_model = None
        self._transcript_history = []
        self._wpm_history = []
        self._last_chunk_time = None
        self._session_word_count = 0

        # Try lazy-load Vosk
        try:
            from vosk import Model, KaldiRecognizer
            import json
            self._vosk_model = "available"
            self._KaldiRecognizer = KaldiRecognizer
            self._vosk_Model = Model
        except ImportError:
            pass

        # Try lazy-load Whisper
        try:
            import whisper
            self._whisper_model = whisper.load_model("tiny")
        except ImportError:
            pass

    def transcribe(self, audio_data: bytes, engine: str = "vosk") -> str:
        """Transcribe audio bytes to text using selected engine."""
        if engine == "whisper" and self._whisper_model:
            return self._transcribe_whisper(audio_data)
        elif engine == "azure":
            return self._transcribe_azure(audio_data)
        else:
            return self._transcribe_vosk(audio_data)

    def _transcribe_vosk(self, audio_data: bytes) -> str:
        """Fast local transcription using Vosk."""
        if not self._vosk_model:
            # Fallback: return empty (no Vosk installed)
            return ""
        try:
            import json
            from vosk import Model, KaldiRecognizer
            # In production: maintain persistent recognizer per session
            # Here simplified for clarity
            return ""  # Placeholder - requires model download
        except Exception:
            return ""

    def _transcribe_whisper(self, audio_data: bytes) -> str:
        """Accurate local transcription using OpenAI Whisper."""
        if not self._whisper_model:
            return ""
        try:
            import io
            import soundfile as sf
            import numpy as np
            audio_np, sr = sf.read(io.BytesIO(audio_data))
            result = self._whisper_model.transcribe(
                audio_np.astype(np.float32),
                fp16=False,
                language="en",
            )
            return result.get("text", "")
        except Exception:
            return ""

    def _transcribe_azure(self, audio_data: bytes) -> str:
        """Azure Cognitive Services Speech-to-Text (requires API key)."""
        # Requires: pip install azure-cognitiveservices-speech
        # Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION env vars
        try:
            import azure.cognitiveservices.speech as speechsdk
            import os
            key = os.getenv("AZURE_SPEECH_KEY")
            region = os.getenv("AZURE_SPEECH_REGION", "eastus")
            if not key:
                return ""
            cfg = speechsdk.SpeechConfig(subscription=key, region=region)
            audio_stream = speechsdk.audio.PushAudioInputStream()
            audio_stream.write(audio_data)
            audio_stream.close()
            audio_cfg = speechsdk.AudioConfig(stream=audio_stream)
            recognizer = speechsdk.SpeechRecognizer(
                speech_config=cfg, audio_config=audio_cfg
            )
            result = recognizer.recognize_once()
            return result.text if result.reason.name == "RecognizedSpeech" else ""
        except Exception:
            return ""

    def analyze(self, transcript: str) -> dict:
        """Analyze speech quality metrics."""
        if not transcript or not transcript.strip():
            return SpeechAnalysis().__dict__

        words = transcript.strip().split()
        word_count = len(words)
        self._session_word_count += word_count

        # WPM estimation (assume 10s audio chunks → scale to 60s)
        now = time.time()
        chunk_duration = 10.0  # seconds
        if self._last_chunk_time:
            chunk_duration = now - self._last_chunk_time
        self._last_chunk_time = now

        wpm = (word_count / max(chunk_duration, 1)) * 60
        self._wpm_history.append(wpm)
        if len(self._wpm_history) > 10:
            self._wpm_history.pop(0)
        avg_wpm = np.mean(self._wpm_history)

        # Pace classification
        if avg_wpm < 110:
            pace = "slow"
        elif avg_wpm > 160:
            pace = "fast"
        else:
            pace = "normal"

        # Filler detection
        text_lower = transcript.lower()
        fillers_found = []
        filler_count = 0
        for fw in FILLER_WORDS:
            count = len(re.findall(r'\b' + re.escape(fw) + r'\b', text_lower))
            if count > 0:
                fillers_found.append(fw)
                filler_count += count

        # Clarity score (penalize fillers and extreme pace)
        filler_penalty = min(5.0, filler_count * 0.5)
        pace_penalty = 1.5 if pace != "normal" else 0
        clarity_score = max(0, 10.0 - filler_penalty - pace_penalty)

        # Sentences
        sentences = re.split(r'[.!?]+', transcript.strip())
        sentences = [s.strip() for s in sentences if s.strip()]
        sentence_count = len(sentences)
        avg_len = np.mean([len(s.split()) for s in sentences]) if sentences else 0

        # Speech rate variance (proxy for pitch variance)
        rate_var = float(np.std(self._wpm_history)) if len(self._wpm_history) > 1 else 0.0

        self._transcript_history.append(transcript)

        return {
            "words_per_minute": round(avg_wpm, 1),
            "filler_count": filler_count,
            "filler_words_found": fillers_found,
            "clarity_score": round(clarity_score, 1),
            "pace": pace,
            "sentence_count": sentence_count,
            "avg_sentence_length": round(float(avg_len), 1),
            "speech_rate_variance": round(rate_var, 2),
        }
