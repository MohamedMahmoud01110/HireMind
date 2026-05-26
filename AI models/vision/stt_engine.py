"""
HireMind v3.1 — stt_engine.py
Multi-engine STT: Vosk (primary, stateful) → Whisper (fallback)

ROOT CAUSE FIX:
  Previous versions created a NEW KaldiRecognizer for every audio chunk.
  Vosk needs ONE persistent recognizer per session — it builds an acoustic
  model across the entire audio stream.  A fresh recognizer on every chunk
  has no context and returns only short common words like "the".

Interface contract (unchanged — matches main.py exactly):
  STTEngine()
  .start(session_id, transcript_dir)  → dict
  .transcribe(audio_bytes, engine)    → str
  STTEngine.engine_status()           → dict  (static)
"""

from __future__ import annotations

import io
import json
import logging
import os
import struct
import tempfile
import threading
import time
import wave
from pathlib import Path
from typing import Optional

log = logging.getLogger("hiremind.stt_engine")

# ─────────────────────────────────────────────────────────────────────────────
# Optional engine imports
# ─────────────────────────────────────────────────────────────────────────────

try:
    import vosk as _vosk_mod
    _vosk_mod.SetLogLevel(-1)
    _VOSK_AVAILABLE = True
except ImportError:
    _VOSK_AVAILABLE = False

try:
    import whisper as _whisper_mod
    _WHISPER_AVAILABLE = True
except ImportError:
    _WHISPER_AVAILABLE = False

try:
    import azure.cognitiveservices.speech as _azure_sdk
    _AZURE_AVAILABLE = True
except ImportError:
    _AZURE_AVAILABLE = False

# ─────────────────────────────────────────────────────────────────────────────
# Audio constants
# ─────────────────────────────────────────────────────────────────────────────
_RATE  = 16_000
_CH    = 1
_WIDTH = 2          # 16-bit signed PCM
_SILENCE_RMS = 150  # lowered — previous 300 was filtering real speech


# ─────────────────────────────────────────────────────────────────────────────
# Audio utilities
# ─────────────────────────────────────────────────────────────────────────────

def _rms(pcm: bytes) -> int:
    n = len(pcm) // 2
    if n == 0:
        return 0
    samples = struct.unpack_from(f"<{n}h", pcm)
    return int((sum(s * s for s in samples) / n) ** 0.5)


def _is_silent(pcm: bytes) -> bool:
    return _rms(pcm) < _SILENCE_RMS


def _pcm_to_wav(pcm: bytes) -> bytes:
    """Wrap raw PCM in a WAV container (for Whisper / Azure)."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(_CH)
        wf.setsampwidth(_WIDTH)
        wf.setframerate(_RATE)
        wf.writeframes(pcm)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# JSONL transcript logger
# ─────────────────────────────────────────────────────────────────────────────

class _TranscriptLogger:
    def __init__(self, session_id: str, transcript_dir: str = "transcripts"):
        self._session = session_id
        path = Path(transcript_dir)
        path.mkdir(parents=True, exist_ok=True)
        self._path = path / f"{session_id}.jsonl"
        self._lock = threading.Lock()

    def write(self, text: str, engine: str, is_final: bool, rms: int = 0) -> None:
        entry = {
            "timestamp":  time.strftime("%Y-%m-%dT%H:%M:%S")
                          + f".{int(time.time() * 1000) % 1000:03d}Z",
            "session_id": self._session,
            "engine":     engine,
            "text":       text,
            "is_final":   is_final,
            "rms":        rms,
        }
        with self._lock:
            with open(self._path, "a", encoding="utf-8") as fh:
                fh.write(json.dumps(entry, ensure_ascii=False) + "\n")


# ─────────────────────────────────────────────────────────────────────────────
# Engine registry — models loaded ONCE and reused across all sessions
# ─────────────────────────────────────────────────────────────────────────────

class _EngineRegistry:
    _lock = threading.Lock()

    # Vosk — model shared; recognizer is per-session (see STTEngine)
    _vosk_model      = None
    _vosk_available  = None

    # Whisper — model shared and thread-safe
    _whisper_model      = None
    _whisper_available  = None

    # Azure
    _azure_key       = None
    _azure_region    = None
    _azure_available = None

    @classmethod
    def init_vosk(cls) -> bool:
        with cls._lock:
            if cls._vosk_available is not None:
                return cls._vosk_available
            if not _VOSK_AVAILABLE:
                log.warning("[Engine] XX Vosk not installed (pip install vosk)")
                cls._vosk_available = False
                return False
            path = os.environ.get(
                "VOSK_MODEL_PATH",
                r"C:\Users\power\OneDrive\Desktop\vosk-model-en-us-0.22",
            )
            if not os.path.isdir(path):
                log.warning("[Engine] XX Vosk model not found: %s", path)
                cls._vosk_available = False
                return False
            try:
                cls._vosk_model    = _vosk_mod.Model(path)
                cls._vosk_available = True
                logging.getLogger("fusion_stt").info(
                    "[Engine] OK Vosk loaded from %s", path
                )
            except Exception as exc:
                log.warning("[Engine] XX Vosk load error: %s", exc)
                cls._vosk_available = False
            return cls._vosk_available

    @classmethod
    def init_whisper(cls) -> bool:
        with cls._lock:
            if cls._whisper_available is not None:
                return cls._whisper_available
            if not _WHISPER_AVAILABLE:
                log.warning("[Engine] XX Whisper not installed")
                cls._whisper_available = False
                return False
            size = os.environ.get("WHISPER_MODEL_SIZE", "base")
            try:
                cls._whisper_model    = _whisper_mod.load_model(size)
                cls._whisper_available = True
                logging.getLogger("fusion_stt").info(
                    "[Engine] OK Whisper '%s' loaded", size
                )
            except Exception as exc:
                log.warning("[Engine] XX Whisper load error: %s", exc)
                cls._whisper_available = False
            return cls._whisper_available

    @classmethod
    def init_azure(cls) -> bool:
        with cls._lock:
            if cls._azure_available is not None:
                return cls._azure_available
            key    = os.environ.get("AZURE_SPEECH_KEY",    "")
            region = os.environ.get("AZURE_SPEECH_REGION", "")
            if not _AZURE_AVAILABLE or not key or not region:
                logging.getLogger("fusion_stt").warning(
                    "[Engine] XX Azure unavailable: "
                    "AZURE_SPEECH_KEY / AZURE_SPEECH_REGION not set"
                )
                cls._azure_available = False
                return False
            try:
                _azure_sdk.SpeechConfig(subscription=key, region=region)
                cls._azure_key       = key
                cls._azure_region    = region
                cls._azure_available = True
                logging.getLogger("fusion_stt").info(
                    "[Engine] OK Azure configured (region=%s)", region
                )
            except Exception as exc:
                log.warning("[Engine] XX Azure error: %s", exc)
                cls._azure_available = False
            return cls._azure_available

    @classmethod
    def make_vosk_recognizer(cls):
        """
        Create a fresh KaldiRecognizer bound to the shared model.
        Each session gets its OWN recognizer so acoustic context is preserved
        across all chunks for that session.
        """
        if not cls._vosk_available or cls._vosk_model is None:
            return None
        rec = _vosk_mod.KaldiRecognizer(cls._vosk_model, _RATE)
        rec.SetWords(False)
        return rec

    @classmethod
    def status(cls) -> dict:
        return {
            "vosk":    bool(cls._vosk_available),
            "whisper": bool(cls._whisper_available),
            "azure":   bool(cls._azure_available),
        }


# ─────────────────────────────────────────────────────────────────────────────
# Whisper + Azure one-shot helpers (stateless — each call is independent)
# ─────────────────────────────────────────────────────────────────────────────

def _transcribe_whisper(pcm: bytes) -> str:
    if not _EngineRegistry._whisper_available or _EngineRegistry._whisper_model is None:
        raise RuntimeError("Whisper not available")

    # Whisper hallucination filter — these are common false positives
    # that Whisper returns on silence or very low-quality audio
    _HALLUCINATIONS = {
        "the", ".", "thank you.", "thank you", "thanks.", "thanks",
        "you", "a", "i", "", "bye.", "bye", "okay.", "okay",
        "yes.", "yes", "no.", "no", "um.", "uh.", "hmm.", "hmm",
        "oh.", "oh", " ", "...", "you.", "okay, bye.",
    }

    # Skip if audio is too quiet
    if _is_silent(pcm):
        log.debug("[Whisper] Skipping silent chunk")
        return ""

    wav = _pcm_to_wav(pcm)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp.write(wav)
        path = tmp.name
    try:
        result = _EngineRegistry._whisper_model.transcribe(
            path,
            language="en",
            fp16=False,
            condition_on_previous_text=False,   # prevent hallucination loops
            no_speech_threshold=0.6,            # discard low-confidence segments
            logprob_threshold=-1.0,             # discard very uncertain words
            compression_ratio_threshold=2.4,    # discard repetitive output
        )
        text = result.get("text", "").strip().lower()

        # Filter known hallucinations
        if text in _HALLUCINATIONS:
            log.debug("[Whisper] Hallucination filtered: %r", text)
            return ""

        # Return original case version
        return result.get("text", "").strip()
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


def _transcribe_azure(pcm: bytes) -> str:
    if not _EngineRegistry._azure_available:
        raise RuntimeError("Azure not available")
    wav = _pcm_to_wav(pcm)
    stream = _azure_sdk.audio.PushAudioInputStream()
    stream.write(wav)
    stream.close()
    speech_cfg = _azure_sdk.SpeechConfig(
        subscription=_EngineRegistry._azure_key,
        region=_EngineRegistry._azure_region,
    )
    speech_cfg.speech_recognition_language = "en-US"
    audio_cfg = _azure_sdk.audio.AudioConfig(stream=stream)
    rec = _azure_sdk.SpeechRecognizer(
        speech_config=speech_cfg, audio_config=audio_cfg
    )
    res = rec.recognize_once()
    if res.reason == _azure_sdk.ResultReason.RecognizedSpeech:
        return res.text.strip()
    return ""


# ─────────────────────────────────────────────────────────────────────────────
# Public STTEngine — ONE instance per HireMind session
# ─────────────────────────────────────────────────────────────────────────────

class STTEngine:
    """
    Stateful multi-engine STT.  One instance per WebSocket session.

    KEY DESIGN:
      self._vosk_rec  — KaldiRecognizer that lives for the ENTIRE session.
                        Every audio chunk is fed to this same recognizer so
                        Vosk can accumulate acoustic context and decode full
                        sentences rather than isolated fragments.

      self._pending_partial — accumulates partial text across chunks so the
                        transcript bar always shows progress even between
                        final utterances.  Cleared when a final result arrives.

    main.py interface:
        stt = STTEngine()
        stt.start(session_id, transcript_dir)   → dict
        stt.transcribe(audio_bytes, engine)     → str
        STTEngine.engine_status()               → dict  (static)
    """

    def __init__(self):
        self._session_id:    str                         = ""
        self._transcript_log: Optional[_TranscriptLogger] = None
        self._started:       bool                        = False
        self._vosk_lock:     threading.Lock              = threading.Lock()

        # ── THE FIX: one persistent recognizer per session ──────────────────
        self._vosk_rec = None   # set in start(), used in every transcribe()

        # Accumulate partial text across chunks so UI shows live progress
        self._pending_partial: str = ""

    # ── Lifecycle ─────────────────────────────────────────────────────────────

    def start(self, session_id: str, transcript_dir: str = "transcripts") -> dict:
        """
        Initialize engines. Called once on 'start_session' WebSocket event.
        Creates the session-level Vosk recognizer here — not per chunk.
        """
        self._session_id     = session_id
        self._transcript_log = _TranscriptLogger(session_id, transcript_dir)

        vosk_ok    = _EngineRegistry.init_vosk()
        whisper_ok = _EngineRegistry.init_whisper()
        azure_ok   = _EngineRegistry.init_azure()

        # Create the persistent Vosk recognizer for this session
        if vosk_ok:
            self._vosk_rec = _EngineRegistry.make_vosk_recognizer()
            if self._vosk_rec is None:
                vosk_ok = False
                log.warning("[STTEngine] Failed to create Vosk recognizer")

        self._started = True

        log.info(
            "[STTEngine] Session %s started — Whisper=%s Vosk=%s Azure=%s",
            session_id, whisper_ok, vosk_ok, azure_ok,
        )
        logging.getLogger("fusion_stt").info(
            "[STT] ── Starting engines for session: %s ──", session_id
        )
        logging.getLogger("fusion_stt").info(
            "[STT] Engine status — Vosk: %s  Whisper: %s  Azure: %s",
            "✓" if vosk_ok else "✗",
            "✓" if whisper_ok else "✗",
            "✓" if azure_ok else "✗",
        )

        return {"vosk": vosk_ok, "whisper": whisper_ok, "azure": azure_ok}

    def stop(self):
        """Release session resources. Called on end_session."""
        self._started         = False
        self._vosk_rec        = None
        self._pending_partial = ""

    # ── Transcription ─────────────────────────────────────────────────────────

    def transcribe(self, audio_bytes: bytes, engine: str = "vosk") -> str:
        """
        Feed one PCM chunk (16 kHz / mono / int16) and return any recognized text.
        """
        if not self._started:
            log.debug("[Session] Audio before start() — skipping")
            return ""

        if not audio_bytes:
            return ""

        rms    = _rms(audio_bytes)
        engine = engine.lower()

        # ── Debug: save first 3 chunks as WAV so you can verify audio quality ──
        # Remove this block after confirming audio is correct
        if not hasattr(self, "_debug_chunks"):
            self._debug_chunks = 0
        if self._debug_chunks < 3:
            self._debug_chunks += 1
            try:
                os.makedirs("audio_debug", exist_ok=True)
                wav_path = f"audio_debug/chunk_{self._debug_chunks:02d}_rms{rms}.wav"
                wav_bytes = _pcm_to_wav(audio_bytes)
                with open(wav_path, "wb") as f:
                    f.write(wav_bytes)
                log.info("[AudioDebug] Saved %s — open this file and listen!", wav_path)
            except Exception as e:
                log.warning("[AudioDebug] Could not save WAV: %s", e)

        # ── Log RMS level for diagnosis ───────────────────────────────────────
        if rms < 100:
            log.warning("[STT] chunk rms=%d — VERY SILENT, check microphone!", rms)
        elif rms < 300:
            log.warning("[STT] chunk rms=%d — quiet audio, speak louder or closer", rms)
        else:
            log.debug("[STT] chunk rms=%d bytes=%d engine=%s", rms, len(audio_bytes), engine)

        result = ""
        try:
            if engine in ("vosk", "auto"):
                result = self._transcribe_vosk_streaming(audio_bytes)
                # Auto fallback: Vosk returned nothing → try Whisper
                if not result and engine == "auto" and _EngineRegistry._whisper_available:
                    log.debug("[STT] auto: vosk empty → trying whisper (rms=%d)", rms)
                    result = _transcribe_whisper(audio_bytes)
            elif engine == "whisper":
                if not _is_silent(audio_bytes):
                    result = _transcribe_whisper(audio_bytes)
            elif engine == "azure":
                if not _is_silent(audio_bytes):
                    result = _transcribe_azure(audio_bytes)

        except Exception as exc:
            log.error("[STTEngine] transcribe(engine=%s) error: %s", engine, exc)
            return ""

        if result:
            log.info("[STT][FINAL  ][%-7s] %s", engine.upper(), result)
            if self._transcript_log:
                self._transcript_log.write(
                    result, engine=engine, is_final=True, rms=rms
                )

        return result

    def _transcribe_vosk_streaming(self, pcm: bytes) -> str:
        """
        Feed PCM to the session-persistent KaldiRecognizer.

        ROOT CAUSE FIX (v2):
          Vosk only triggers AcceptWaveform=True (end-of-utterance) when it
          hears silence AFTER speech.  In a 3-second chunk of continuous
          talking there may be NO silence at all → AcceptWaveform never fires
          → we only ever see a partial like "the".

          Solution: after feeding ALL slices, call FinalResult() to force Vosk
          to flush whatever it has decoded so far, then reset the recognizer
          for the next chunk.  This gives us a full sentence per chunk instead
          of a perpetual partial.

          We still collect any mid-chunk finals (AcceptWaveform hits) first,
          and only call FinalResult if none were produced — so natural
          pause-based segmentation is preserved when it works.
        """
        if self._vosk_rec is None:
            return ""

        finals: list[str] = []
        with self._vosk_lock:
            chunk_size = 4_000
            for i in range(0, len(pcm), chunk_size):
                slice_ = pcm[i: i + chunk_size]
                if self._vosk_rec.AcceptWaveform(slice_):
                    raw   = json.loads(self._vosk_rec.Result())
                    final = raw.get("text", "").strip()
                    if final:
                        finals.append(final)
                        self._pending_partial = ""

            if finals:
                # Natural utterance boundary detected — good, use it
                return " ".join(finals)

            # ── No natural boundary in this chunk → force flush ─────────────
            # FinalResult() flushes whatever Vosk has decoded, then we reset
            # the recognizer so the NEXT chunk starts fresh (no stale context).
            raw   = json.loads(self._vosk_rec.FinalResult())
            final = raw.get("text", "").strip()

            # Reset: create a brand-new recognizer so old context doesn't
            # bleed into the next chunk.  The model is shared and not reloaded.
            new_rec = _EngineRegistry.make_vosk_recognizer()
            if new_rec is not None:
                self._vosk_rec = new_rec
            self._pending_partial = ""

            if final:
                return final

            # Truly nothing — audio was silence or noise
            return ""

    # ── Static probe for /health endpoint ─────────────────────────────────────

    @staticmethod
    def engine_status() -> dict:
        _EngineRegistry.init_vosk()
        _EngineRegistry.init_whisper()
        _EngineRegistry.init_azure()
        return _EngineRegistry.status()