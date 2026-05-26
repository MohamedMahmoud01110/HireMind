"""
HireMind — main.py  (v3.1 — Bug-Fix Release)
=============================================

BUGS FIXED IN THIS VERSION
----------------------------

Bug #1 — Next Button causes WebSocket disconnect
  ROOT CAUSE: Two asyncio tasks (_coaching_tick and the main message handler) could
  both call `websocket.send_text()` concurrently. Even though asyncio is single-threaded,
  both coroutines yield at `await` points, letting the other interleave writes inside the
  same WebSocket send sequence. This corrupts the WS frame and closes the connection.
  FIX: Added asyncio.Lock(_ws_send_lock) per-connection; all sends go through _safe_send().

Bug #2 — Unhandled exceptions crash the WebSocket handler
  ROOT CAUSE: The outer try/except only caught WebSocketDisconnect. Any other exception
  (KeyError on a malformed message, ValueError on bad base64, etc.) propagated out of the
  while-loop, causing FastAPI to drop the connection.
  FIX: Added per-message try/except inside the while-loop body so errors are logged and
  the connection continues rather than crashing.

Bug #3 — End & Report hangs forever / never delivers the report
  ROOT CAUSE (A): generate_coaching() held self._lock for the entire duration of:
    - text_intel.analyze()  (CPU — up to ~500 ms on a long transcript)
    - coach.generate()      (CPU)
    - coach.score()         (CPU)
  While the lock was held, next_question() and end_session() both blocked in thread-pool
  threads. The _coaching_tick fired every 3 s, spawning a new blocked thread each time.
  The default ThreadPoolExecutor (min(32, cpu+4) threads) was exhausted, causing ALL
  run_in_executor() calls to queue up. end_session() could never start.
  FIX: Moved text_intel.analyze() OUTSIDE the lock (it reads only its arguments — no
  shared state). Only the coach.generate/score calls and history.append stay inside.

  ROOT CAUSE (B): end_session() held self._lock while writing the Excel report (100+ ms).
  This prevented any in-progress generate_coaching() from finishing, causing it to also
  pile up more blocked threads while waiting for end_session to release the lock.
  FIX: end_session() now: (1) sets _session_ended=True to stop new coaching analyses,
  (2) acquires the lock BRIEFLY only to snapshot history, (3) releases the lock, (4) runs
  generate_report() and reporter.generate() entirely outside the lock.

  ROOT CAUSE (C): _coaching_tick kept firing every 3 s and spawning run_in_executor()
  calls even after end_session was called. These "zombie" threads exhausted the pool
  and could race-write to session state after the report was already generated.
  FIX: _session_ended flag checked at the very start of generate_coaching() and inside
  _coaching_tick(); once True both return immediately.

Bug #4 — No error response when next_question() fails
  ROOT CAUSE: If session.next_question() raised an exception the error was logged but
  nothing was sent back to the client. The frontend hung waiting for a "question" message.
  FIX: Added try/except that re-sends the current question as a fallback so the UI
  is never left in an empty state.

Bug #5 — Final frame/emotion analysis not included in report
  ROOT CAUSE: end_session() called generate_report(self.history) but the last few video
  and audio results might not have been flushed to history yet (the coaching tick runs
  every 3 s, so up to 3 s of data was lost on quick End clicks).
  FIX: end_session() writes a final synthetic history entry from last_video_result and
  last_audio_result before snapshotting, ensuring the final face/emotion state is included.

Integration lineage: v2.1 → v2.2 → v3.0 → v3.1 (this file)
All previous behaviour (MediaPipe, DeepFace, STTEngine, coaching messages, report format)
is unchanged.  Only the concurrency and lifecycle model is fixed.
"""

import asyncio
import json
import time
import base64
import os
import logging
from concurrent.futures import ThreadPoolExecutor
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.websockets import WebSocketState
import uvicorn

# ── Structured logging ────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("hiremind.main")

# FIX: Configure TensorFlow-sensitive libraries before importing MediaPipe or
# DeepFace. MediaPipe may import TensorFlow internals during module import, so
# this must live above the HireMind core imports.
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")       # CPU-only runtime; avoids CUDA probing.
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")        # Reduce noisy TF INFO/WARNING logs.
os.environ.setdefault("TF_FORCE_GPU_ALLOW_GROWTH", "true")
os.environ.setdefault("TF_NUM_INTRAOP_THREADS", "1")      # Limit CPU thread fan-out under WS load.
os.environ.setdefault("TF_NUM_INTEROP_THREADS", "1")


def _env_int(name: str, default: int) -> int:
    try:
        return max(1, int(os.environ.get(name, str(default))))
    except ValueError:
        return default


# FIX: Use small, dedicated executors so TensorFlow/DeepFace, STT, report, and
# coaching work cannot exhaust asyncio's shared default thread pool. These env
# vars are optional tuning knobs; defaults keep memory pressure low.
_SESSION_EXECUTOR = ThreadPoolExecutor(
    max_workers=_env_int("HIREMIND_SESSION_WORKERS", 2),
    thread_name_prefix="hiremind-session",
)
_VIDEO_EXECUTOR = ThreadPoolExecutor(
    max_workers=_env_int("HIREMIND_VIDEO_WORKERS", 1),
    thread_name_prefix="hiremind-video",
)
_AUDIO_EXECUTOR = ThreadPoolExecutor(
    max_workers=_env_int("HIREMIND_AUDIO_WORKERS", 2),
    thread_name_prefix="hiremind-audio",
)
_COACH_EXECUTOR = ThreadPoolExecutor(
    max_workers=_env_int("HIREMIND_COACH_WORKERS", 2),
    thread_name_prefix="hiremind-coach",
)


# ── HireMind core modules (UNCHANGED) ─────────────────────────────────────────
from analyzer          import VisionAnalyzer
from coach             import AdaptiveCoach
from detector          import EmotionDetector
from generator         import ReportGenerator
from text_intelligence import TextIntelligence
from deepface_analyzer import enrich_emotion, mediapipe_emotion
from stt_engine        import STTEngine


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI app
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(title="HireMind", version="3.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
_UI_DIR = _PROJECT_ROOT
if os.path.isfile(os.path.join(_UI_DIR, "index.html")):
    app.mount("/ui", StaticFiles(directory=_UI_DIR, html=True), name="ui")
else:
    log.warning("index.html not found — /ui route inactive")


# ─────────────────────────────────────────────────────────────────────────────
# Speech analysis helpers (unchanged)
# ─────────────────────────────────────────────────────────────────────────────

_FILLER_WORDS = {
    "um", "uh", "er", "ah", "like", "you know", "basically",
    "literally", "sort of", "kind of", "right", "okay",
}


def _analyze_transcript(transcript: str) -> dict:
    if not transcript or not transcript.strip():
        return _empty_speech_analysis()
    words        = transcript.strip().split()
    n            = len(words)
    lower        = transcript.lower()
    filler_count = sum(lower.count(fw) for fw in _FILLER_WORDS)
    filler_den   = filler_count / max(n, 1)
    clarity      = max(0.0, min(10.0, 10.0 - filler_count * 0.5 - (2.0 if n < 20 else 0.0)))
    return {
        "words_per_minute": 130,
        "filler_count":     filler_count,
        "clarity_score":    round(clarity, 1),
        "pitch_variance":   round(min(1.0, filler_den * 3.0), 3),
        "speed_ratio":      1.0,
    }


def _empty_speech_analysis() -> dict:
    return {
        "words_per_minute": 0,
        "filler_count":     0,
        "clarity_score":    5.0,
        "pitch_variance":   0.0,
        "speed_ratio":      1.0,
    }


# ─────────────────────────────────────────────────────────────────────────────
# JSONL logging helpers (unchanged)
# ─────────────────────────────────────────────────────────────────────────────

def _append_frame_jsonl(session_id: str, question: str, video: dict, audio: dict) -> None:
    try:
        os.makedirs("transcripts", exist_ok=True)
        path = os.path.join("transcripts", f"{session_id}_frames.jsonl")

        face    = video.get("face",    {})
        posture = video.get("posture", {})
        eye     = video.get("eye",     {})
        emotion = video.get("emotion", {})

        df     = emotion.get("deepface") or {}
        mp_emo = emotion.get("mediapipe") or emotion
        emotion_label = (
            df.get("dominant_emotion")
            or mp_emo.get("label")
            or "N/A"
        )

        age    = df.get("age",    "N/A")
        gender = df.get("gender", "N/A")
        if isinstance(gender, dict):
            gender = max(gender, key=gender.get)

        pose       = face.get("head_pose", {})
        head_pitch = round(pose.get("pitch", 0.0), 2)
        head_yaw   = round(pose.get("yaw",   0.0), 2)

        looking_away = eye.get("looking_away", False)
        slouching    = posture.get("slouching", False)
        transcript   = audio.get("speech_transcript", "")
        mouth_ratio_val = video.get("_mouth_ratio", 0.0)
        ear_val         = video.get("_eye_aspect_ratio", 0.0)

        if transcript:
            attention = "speaking"
        elif ear_val > 0 and ear_val < 0.18:
            attention = "blink/eyes low"
        elif looking_away:
            attention = "distracted"
        elif slouching:
            attention = "slouching"
        else:
            attention = "focused"

        entry = {
            "question":         question,
            "timestamp":        time.strftime("%Y-%m-%d %H:%M:%S"),
            "age":              age,
            "gender":           gender,
            "emotion":          emotion_label,
            "face_count":       1 if face.get("detected") else 0,
            "speech":           transcript,
            "attention_status": attention,
            "head_pitch":       head_pitch,
            "head_yaw":         head_yaw,
            "eye_aspect_ratio": round(ear_val, 3),
            "mouth_ratio":      round(mouth_ratio_val, 3),
        }

        with open(path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")

    except OSError as exc:
        log.warning("[FrameLog] JSONL write failed for session %s: %s", session_id, exc)


def _append_transcript_jsonl(session_id: str, transcript: str, engine: str) -> None:
    try:
        os.makedirs("transcripts", exist_ok=True)
        path  = os.path.join("transcripts", f"{session_id}.jsonl")
        entry = {
            "ts":      round(time.time(), 3),
            "session": session_id,
            "engine":  engine,
            "text":    transcript,
        }
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except OSError as exc:
        log.warning("[Transcript] JSONL write failed for session %s: %s", session_id, exc)


def _append_qa_jsonl(
    session_id:     str,
    question_index: int,
    question_id:    str,
    question_text:  str,
    user_answer:    str,
    timestamp:      str,
    analysis:       dict | None = None,
    deepface:       dict | None = None,
    mediapipe:      dict | None = None,
    vision:         dict | None = None,
) -> None:
    """
    Append one Q&A record to the per-session Q&A analysis file.

    Called exactly once per Next-click (and once for the final question on
    End).  Each record is a self-contained JSON object on its own line so
    the file is append-safe and can be streamed / tail-followed in real time.

    Fields
    ------
    question_index  — 0-based counter, single source of truth, matches frontend
    question_id     — human-readable "Q<index+1>" label
    question_text   — the actual question string shown to the user
    user_answer     — full transcript accumulated while this question was active
    timestamp       — ISO-8601 wall-clock time of the Next click
    """
    try:
        os.makedirs("transcripts", exist_ok=True)
        path  = os.path.join("transcripts", f"{session_id}_qa.jsonl")
        entry = {
            "question_index": question_index,
            "question_id":    question_id,
            "question_text":  question_text,
            "user_answer":    user_answer,
            "timestamp":      timestamp,
            "analysis":       analysis or {},
            "deepface":       deepface or _empty_deepface_snapshot(),
            "mediapipe":      mediapipe or _empty_mediapipe_snapshot(),
            "vision":         vision or _empty_vision_snapshot(),
        }
        with open(path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
        _upsert_qa_json(
            session_id=session_id,
            question_index=question_index,
            question_id=question_id,
            question_text=question_text,
            user_answer=user_answer,
            timestamp=timestamp,
            analysis=analysis or {},
            deepface=deepface or _empty_deepface_snapshot(),
            mediapipe=mediapipe or _empty_mediapipe_snapshot(),
            vision=vision or _empty_vision_snapshot(),
        )
        log.info(
            "[QA-Log %s] Appended %s (index=%d) answer_words=%d",
            session_id, question_id, question_index, len(user_answer.split()),
        )
    except OSError as exc:
        log.warning("[QA-Log] Write failed for session %s: %s", session_id, exc)


def _upsert_qa_json(
    session_id:     str,
    question_index: int,
    question_id:    str,
    question_text:  str,
    user_answer:    str,
    timestamp:      str,
    analysis:       dict,
    deepface:       dict,
    mediapipe:      dict,
    vision:         dict,
) -> None:
    """
    Maintain a human-readable Q&A JSON file keyed as q1, q2, ...

    This is rewritten on each question change so the latest file always contains
    the complete question list plus each answer's analysis beside it.
    """
    os.makedirs("transcripts", exist_ok=True)
    path = os.path.join("transcripts", f"{session_id}_qa.json")
    key  = f"q{question_index + 1}"

    data = {
        "session_id": session_id,
        "updated_at": timestamp,
        "questions": {},
    }
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as fh:
                loaded = json.load(fh)
            if isinstance(loaded, dict):
                data.update(loaded)
                data.setdefault("questions", {})
        except (OSError, json.JSONDecodeError):
            log.warning("[QA-JSON] Rebuilding unreadable file for session %s", session_id)

    data["session_id"] = session_id
    data["updated_at"] = timestamp
    data["questions"][key] = {
        "question_index": question_index,
        "question_id":    question_id,
        "question_text":  question_text,
        "user_answer":    user_answer,
        "analysis":       analysis,
        "deepface":       deepface,
        "mediapipe":      mediapipe,
        "vision":         vision,
        "timestamp":      timestamp,
    }

    ordered_questions = {}
    for q_key in sorted(data["questions"], key=lambda k: int(k[1:]) if k[1:].isdigit() else 10**9):
        ordered_questions[q_key] = data["questions"][q_key]
    data["questions"] = ordered_questions

    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
    os.replace(tmp_path, path)


def _empty_deepface_snapshot() -> dict:
    return {
        "expected_age": "N/A",
        "gender":       "N/A",
        "emotion":      "N/A",
        "scores":       {},
    }


def _empty_mediapipe_snapshot() -> dict:
    return {
        "emotion": "N/A",
        "scores":  {},
    }


def _empty_vision_snapshot() -> dict:
    return {
        "age":              "N/A",
        "gender":           "N/A",
        "emotion":          "N/A",
        "face_count":       0,
        "attention_status": "N/A",
        "head_pitch":       "N/A",
        "head_yaw":         "N/A",
        "eye_aspect_ratio": "N/A",
        "mouth_ratio":      "N/A",
    }


def _deepface_snapshot(video: dict | None) -> dict:
    if not video:
        return _empty_deepface_snapshot()

    emotion = video.get("emotion", {}) if isinstance(video, dict) else {}
    df = emotion.get("deepface") if isinstance(emotion, dict) else None
    if not isinstance(df, dict):
        return _empty_deepface_snapshot()

    gender = df.get("gender", "N/A")
    if isinstance(gender, dict) and gender:
        gender = max(gender, key=gender.get)

    return {
        "expected_age": df.get("age", "N/A"),
        "gender":       gender or "N/A",
        "emotion":      df.get("dominant_emotion", "N/A"),
        "scores":       df.get("scores", {}) or {},
    }


def _mediapipe_snapshot(video: dict | None) -> dict:
    if not video:
        return _empty_mediapipe_snapshot()
    emotion = video.get("emotion", {}) if isinstance(video, dict) else {}
    mp = emotion.get("mediapipe") if isinstance(emotion, dict) else None
    if not isinstance(mp, dict):
        mp = emotion if isinstance(emotion, dict) else {}
    return {
        "emotion": mp.get("label", "N/A"),
        "scores":  mp.get("scores", {}) or {},
    }


def _vision_snapshot(video: dict | None, audio: dict | None = None) -> dict:
    if not video:
        return _empty_vision_snapshot()

    face    = video.get("face", {}) if isinstance(video, dict) else {}
    posture = video.get("posture", {}) if isinstance(video, dict) else {}
    eye     = video.get("eye", {}) if isinstance(video, dict) else {}
    emotion = video.get("emotion", {}) if isinstance(video, dict) else {}
    df      = emotion.get("deepface") if isinstance(emotion, dict) else None
    mp      = emotion.get("mediapipe") if isinstance(emotion, dict) else {}
    audio   = audio or {}

    if isinstance(df, dict):
        age = df.get("age", "N/A")
        gender = df.get("gender", "N/A")
        if isinstance(gender, dict) and gender:
            gender = max(gender, key=gender.get)
        emotion_label = df.get("dominant_emotion") or mp.get("label", "N/A")
    else:
        age = "N/A"
        gender = "N/A"
        emotion_label = mp.get("label", "N/A") if isinstance(mp, dict) else "N/A"

    pose = face.get("head_pose", {}) if isinstance(face, dict) else {}
    ear_val = video.get("_eye_aspect_ratio", 0.0)
    mouth_ratio_val = video.get("_mouth_ratio", 0.0)
    looking_away = eye.get("looking_away", False) if isinstance(eye, dict) else False
    slouching = posture.get("slouching", False) if isinstance(posture, dict) else False
    transcript = audio.get("speech_transcript", "") if isinstance(audio, dict) else ""

    if transcript:
        attention = "speaking"
    elif isinstance(ear_val, (int, float)) and 0 < ear_val < 0.18:
        attention = "blink/eyes low"
    elif looking_away:
        attention = "distracted"
    elif slouching:
        attention = "slouching"
    else:
        attention = "focused"

    return {
        "age":              age,
        "gender":           gender or "N/A",
        "emotion":          emotion_label,
        "face_count":       1 if face.get("detected") else 0,
        "attention_status": attention,
        "head_pitch":       round(pose.get("pitch", 0.0), 2),
        "head_yaw":         round(pose.get("yaw", 0.0), 2),
        "eye_aspect_ratio": round(ear_val, 3) if isinstance(ear_val, (int, float)) else "N/A",
        "mouth_ratio":      round(mouth_ratio_val, 3) if isinstance(mouth_ratio_val, (int, float)) else "N/A",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Session
# ─────────────────────────────────────────────────────────────────────────────

import threading

class HireMindSession:
    """
    Per-user interview session.

    Lifecycle contract (v3.1)
    --------------------------
    1. __init__()         — engines instantiated; STT not started; _session_ended=False
    2. start_stt()        — called on "start_session"; STT models loaded once
    3. process_frame()    — video only; never touches self.stt
    4. process_audio()    — audio only; guards against pre-start chunks
    5. next_question()    — called only on explicit "next"/"next_question" event
    6. generate_coaching()— 3-second tick; checks _session_ended FIRST
    7. end_session()      — sets _session_ended, snapshots history, generates report
                            OUTSIDE the lock to prevent thread-pool exhaustion
    """

    def __init__(self, session_id: str, mode: str = "interview"):
        self.session_id = session_id
        self.mode       = mode

        self.vision     = VisionAnalyzer()
        self.emotion    = EmotionDetector()
        self.coach      = AdaptiveCoach(mode=mode)
        self.text_intel = TextIntelligence()
        self.reporter   = ReportGenerator(output_dir="./reports")

        self.stt          = STTEngine()
        self._stt_started = False

        self.session_start  = time.time()
        self.frame_count    = 0
        self.history: list  = []

        # FIX #3C: This flag stops generate_coaching() and _coaching_tick() from
        # running after end_session() has been called, preventing thread-pool
        # exhaustion and zombie coaching threads racing with the final report.
        self._session_ended = False

        # Lock protects: _current_answer, _current_question, history, coach state.
        # IMPORTANT: Never hold this lock while doing CPU-intensive work (text analysis,
        # Excel generation).  Acquire it only for short, fast operations.
        self._lock = threading.Lock()

        self._current_answer:   list  = []
        self._current_question: str   = ""

        # ── Question-index tracking (Bug Fix: index sync) ─────────────────────
        # _question_index is the single source of truth for "which question are
        # we on".  It starts at 0 (first question sent on connect is index 0) and
        # is incremented atomically inside next_question() BEFORE the new question
        # string is written to _current_question, ensuring the index is always
        # consistent with the question the user is seeing.
        # It is written to every Q&A analysis file entry so frontend, terminal,
        # and the analysis file all share the same value.
        self._question_index: int = 0

        # Snapshot of the answer that was accumulated for the *previous* question.
        # Written atomically inside next_question() so it is always available for
        # the analysis append that immediately follows.
        self._completed_answer: str = ""

    # ── STT lifecycle ─────────────────────────────────────────────────────────

    def start_stt(self) -> dict:
        if self._stt_started:
            return getattr(self.stt, "engine_status", {}) or {"already_started": True}
        status = self.stt.start(
            session_id=self.session_id,
            transcript_dir="transcripts",
        )
        self._stt_started = True
        log.info("[Session %s] STT engines started — status: %s", self.session_id, status)
        return status

    # ── Video processing (unchanged from v3.0) ────────────────────────────────

    def process_frame(self, frame_data: bytes) -> dict:
        try:
            img        = self.vision.decode_frame(frame_data)
            face       = self.vision.analyze_face(img)
            posture    = self.vision.analyze_posture(img)
            eye        = self.vision.analyze_eye_contact(img)
            mp_emotion = self.emotion.detect(face)
            stress     = self.emotion.estimate_stress(face, mp_emotion)
            self.frame_count += 1
            emotion    = enrich_emotion(mp_emotion, img)

            tension      = face.get("facial_tension", 0.0)
            ear_estimate = round(max(0.07, min(0.40, 0.25 - tension * 0.15)), 3)
            mouth_est    = 0.0
            if mp_emotion.get("label") in ("happy", "engaged"):
                mouth_est = round(tension * 0.3, 3)

            return {
                "face":              face,
                "posture":           posture,
                "eye":               eye,
                "emotion":           emotion,
                "stress":            stress,
                "_eye_aspect_ratio": ear_estimate,
                "_mouth_ratio":      mouth_est,
            }
        except Exception as exc:
            log.error("[Session %s] process_frame error: %s", self.session_id, exc)
            return {"error": str(exc)}

    # ── Audio processing (unchanged from v3.0) ────────────────────────────────

    def process_audio(self, audio_data: bytes, engine: str = "auto") -> dict:
        if not self._stt_started:
            log.debug(
                "[Session %s] Audio chunk received before start_stt() — discarded",
                self.session_id,
            )
            return {
                "speech_transcript": "",
                "has_audio":         True,
                "analysis":          _empty_speech_analysis(),
            }

        try:
            transcript = self.stt.transcribe(audio_data, engine=engine)
            analysis   = _analyze_transcript(transcript)

            rms = int((sum(s*s for s in __import__('struct').unpack_from(
                f'<{len(audio_data)//2}h', audio_data
            )) / max(len(audio_data)//2, 1)) ** 0.5) if len(audio_data) >= 2 else 0

            if transcript:
                log.info(
                    "[Transcript %s] [%s] rms=%-5d bytes=%-6d → %s",
                    self.session_id, engine, rms, len(audio_data), transcript,
                )
                _append_transcript_jsonl(self.session_id, transcript, engine)
                # Protect _current_answer write with lock
                with self._lock:
                    self._current_answer.append(transcript)
            else:
                log.debug(
                    "[Audio %s] chunk bytes=%-6d rms=%-5d → (no transcript)",
                    self.session_id, len(audio_data), rms,
                )

            self.emotion.update_speech_signal(
                analysis.get("pitch_variance", 0.0),
                analysis.get("speed_ratio",    1.0),
            )

            return {
                "speech_transcript": transcript,
                "has_audio":         True,
                "analysis":          analysis,
            }

        except Exception as exc:
            log.error("[Session %s] process_audio error: %s", self.session_id, exc)
            return {
                "error":             str(exc),
                "speech_transcript": "",
                "has_audio":         False,
                "analysis":          _empty_speech_analysis(),
            }

    # ── Manual question navigation ────────────────────────────────────────────

    def next_question(self) -> dict:
        """
        Advance to the next question atomically.

        BUG FIX — Index Sync:
        ─────────────────────
        The original implementation had three problems that caused the index to
        become stale or out-of-sync:

        1. _question_index did not exist — only coach._question_idx existed, and
           that counter lived inside the coach, was never surfaced to the session,
           and was never written to the analysis file or terminal log.

        2. The answer snapshot for the *outgoing* question was never captured at
           handoff time.  The coaching tick ran asynchronously on a 3-s timer, so
           the last few seconds of speech for the current question could be
           appended to _current_answer AFTER next_question() had already cleared
           it, causing that text to appear under the NEW question in the analysis.

        3. The analysis file (_append_qa_jsonl) was not called from here — it was
           called only from the coaching tick, meaning one Q&A record was written
           per coaching tick rather than per question, and index values were
           absent from the records entirely.

        FIX contract (all steps inside one lock acquisition):
          a. Snapshot _current_answer NOW  → saved as _completed_answer
          b. Increment _question_index     → index is authoritative from this point
          c. Clear _current_answer         → clean slate for new question
          d. Call _pick_question()         → get new question string
          e. Write _current_question       → consistent with new index
          f. Log old_idx → new_idx         → terminal shows both sides of the jump

        Returns a dict so the caller gets index + question in one atomic result
        (avoids a second lock acquisition in the WS handler).
        """
        with self._lock:
            if self._session_ended:
                return {
                    "question":       self._current_question or "Session has ended.",
                    "question_index": self._question_index,
                    "prev_index":     self._question_index,
                    "answer_snapshot": "",
                }

            # Step a: snapshot the completed answer before clearing
            answer_snapshot        = " ".join(self._current_answer).strip()
            self._completed_answer = answer_snapshot

            # Steps b + c: increment index and clear answer atomically
            prev_index             = self._question_index
            self._question_index  += 1
            self._current_answer   = []

            # Steps d + e: pick and store new question
            try:
                q = self.coach._pick_question()
            except Exception as exc:
                log.error("[Session %s] _pick_question error: %s", self.session_id, exc)
                q = self._current_question or "Tell me about yourself."
            prev_question          = self._current_question
            self._current_question = q

            new_index = self._question_index

        # Step f: terminal log (outside lock — just I/O, no shared state)
        log.info(
            "[Session %s] [NEXT] index %d → %d | prev_q=%.60s | new_q=%.60s",
            self.session_id, prev_index, new_index,
            prev_question or "(none)", q,
        )

        return {
            "question":          q,
            "question_index":    new_index,
            "prev_index":        prev_index,
            "answer_snapshot":   answer_snapshot,
            "prev_question_text": prev_question or "",
        }

    # ── Coaching tick ─────────────────────────────────────────────────────────

    def generate_coaching(self, video: dict, audio: dict) -> dict:
        """
        Produce coaching tips on the 3-second tick.

        FIX #3A: Lock is now held in TWO short phases instead of one long phase:
          Phase 1 (lock)    — read _current_answer and _current_question snapshots
          Phase 2 (no lock) — CPU-intensive text analysis (can take 100-500 ms)
          Phase 3 (lock)    — coach.generate/score + history.append

        This reduces lock hold-time from ~500 ms to < 5 ms per phase, allowing
        next_question() and end_session() to acquire the lock without long waits.
        """
        _empty = {
            "feedback": {"tips": [], "adaptive_note": None,
                         "priority": "info", "chronic_issues": []},
            "scores": {},
        }

        # Guard: session ended — stop immediately, return empty
        if self._session_ended:
            return _empty

        # Guard: no face data yet
        if not video or not video.get("face"):
            return _empty

        if not audio:
            audio = {}

        # ── Phase 1: Read shared mutable state (FAST — only reads strings/list) ─
        with self._lock:
            if self._session_ended:      # re-check inside lock
                return _empty
            full_answer = " ".join(self._current_answer)
            current_q   = self._current_question

        # ── Phase 2: CPU-intensive analysis WITHOUT the lock ────────────────────
        # text_intel.analyze() is a pure function that only reads its arguments.
        # It does not access any shared session state.
        text_result = (
            self.text_intel.analyze(full_answer, current_q)
            if full_answer
            else None
        )

        video_for_coach = dict(video)
        raw_emotion = video.get("emotion", {})
        if isinstance(raw_emotion, dict) and "mediapipe" in raw_emotion:
            video_for_coach["emotion"] = raw_emotion.get("mediapipe") or {}

        # ── Phase 3: Coach state update + history append (FAST — in-memory) ─────
        with self._lock:
            if self._session_ended:      # re-check: end_session may have run while
                return _empty            # we were in Phase 2

            try:
                feedback = self.coach.generate(video_for_coach, audio, self.history, text_result)
                scores   = self.coach.score(video_for_coach, audio, text_result)
            except Exception as exc:
                log.error("[generate_coaching] coach error: %s", exc)
                feedback = {"tips": [], "adaptive_note": None,
                            "priority": "info", "chronic_issues": []}
                scores   = {}

            # Strip next_question from the payload sent to the client.
            # The coach still generates it internally for adaptive difficulty tracking.
            feedback_for_client = {k: v for k, v in feedback.items() if k != "next_question"}

            import datetime as _dt
            audio_entry = {
                "speech_transcript": audio.get("speech_transcript", ""),
                "has_audio":         audio.get("has_audio", False),
                **{k: v for k, v in audio.items()
                   if k not in ("speech_transcript", "has_audio")},
            }
            self.history.append({
                "timestamp": time.time() - self.session_start,
                "_ts":       _dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "video":     video,
                "audio":     audio_entry,
                "feedback":  feedback,
                "scores":    scores,
            })

        return {"feedback": feedback_for_client, "scores": scores}

    # ── End session ───────────────────────────────────────────────────────────

    def end_session(self, last_video: dict = None, last_audio: dict = None) -> dict:
        """
        FIX #3B: Generate the final report WITHOUT holding the lock for the
        expensive file-generation step.

        Steps:
          1. Set _session_ended=True  → stops all future generate_coaching() calls
          2. Flush final frame        → write last video/audio result to history so
                                        the final face/emotion state is in the report
          3. Acquire lock BRIEFLY     → snapshot history list (fast — just a list copy)
          4. Release lock
          5. Generate report + files  → outside the lock (may take 200 ms – 2 s)

        FIX #5: last_video and last_audio are now accepted so the final captured
        frame is included in the report rather than being discarded.
        """
        # Step 1: Signal all threads to stop coaching work immediately
        self._session_ended = True

        # Step 2: Flush the last video/audio result into history if available.
        # This ensures the final emotion/face state appears in the report even if
        # the coaching tick hasn't fired yet for the last frame.
        if last_video and last_video.get("face"):
            try:
                import datetime as _dt
                audio_entry = last_audio or {}
                video_for_coach = dict(last_video)
                raw_emotion = last_video.get("emotion", {})
                if isinstance(raw_emotion, dict) and "mediapipe" in raw_emotion:
                    video_for_coach["emotion"] = raw_emotion.get("mediapipe") or {}

                scores = self.coach.score(video_for_coach, audio_entry, None)

                with self._lock:
                    self.history.append({
                        "timestamp": time.time() - self.session_start,
                        "_ts":       _dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "video":     last_video,
                        "audio":     audio_entry,
                        "feedback":  {"tips": [], "adaptive_note": None,
                                      "priority": "info", "chronic_issues": [],
                                      "next_question": None},
                        "scores":    scores,
                        "_final_frame": True,
                    })
            except Exception as exc:
                log.warning("[end_session] Could not flush final frame: %s", exc)

        # Step 3: Snapshot history while holding the lock (fast — just a list copy).
        # We do NOT generate the report inside the lock — that would block other
        # threads for seconds and cause thread-pool exhaustion.
        with self._lock:
            history_snapshot = list(self.history)

        # Step 4: Generate report and files OUTSIDE the lock
        try:
            session_report = self.coach.generate_report(history_snapshot)
        except Exception as exc:
            log.error("[end_session] generate_report failed: %s", exc)
            session_report = {
                "error": str(exc),
                "average_scores": {},
                "trend": "stable",
                "strengths": [],
                "areas_for_improvement": [],
                "chronic_issues": [],
                "questions_asked": [],
                "total_frames": len(history_snapshot),
                "session_duration_min": 0,
            }

        try:
            paths = self.reporter.generate(session_report, history_snapshot, self.session_id)
        except Exception as exc:
            log.error("[end_session] reporter.generate failed: %s", exc)
            paths = {}
        qa_json_path = os.path.join("transcripts", f"{self.session_id}_qa.json")
        qa_jsonl_path = os.path.join("transcripts", f"{self.session_id}_qa.jsonl")
        if os.path.exists(qa_json_path):
            paths["qa_json_path"] = qa_json_path
        if os.path.exists(qa_jsonl_path):
            paths["qa_jsonl_path"] = qa_jsonl_path

        log.info(
            "[Session %s] end_session complete — %d history entries, files=%s",
            self.session_id, len(history_snapshot), paths,
        )
        return {"session_report": session_report, "files": paths}


# ─────────────────────────────────────────────────────────────────────────────
# Active sessions registry
# ─────────────────────────────────────────────────────────────────────────────

sessions: dict = {}


# ─────────────────────────────────────────────────────────────────────────────
# WebSocket endpoint
# ─────────────────────────────────────────────────────────────────────────────

async def _safe_send_early(ws: WebSocket, data: dict) -> None:
    """One-shot send before the per-connection lock is created.
    Used only during model-loading to keep the client alive."""
    try:
        await ws.send_text(json.dumps(data))
    except Exception:
        pass


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await websocket.accept()

    # Guard: reject duplicate connections for the same session_id
    if session_id in sessions:
        log.warning("Duplicate connection rejected for session %s", session_id)
        await websocket.close(code=4000, reason="Session already active")
        return

    # ── Model loading — run in executor, detect client disconnect ────────────
    #
    # ROOT CAUSE OF "WebSocket is not connected. Need to call accept first":
    # -----------------------------------------------------------------------
    # HireMindSession.__init__() triggers TensorFlow + DeepFace model loading
    # which takes 15–60 s.  During that time the asyncio event loop is free, so
    # FastAPI CAN detect that the browser closed its connection and marks the
    # WebSocket as DISCONNECTED — but the executor thread keeps running to
    # completion regardless.
    #
    # When run_in_executor() finally returns, the code blindly continues:
    #   sessions[session_id] = session   ← stored on a dead connection
    #   _safe_send(first question)       ← silently swallowed by _safe_send_early
    #   background tasks created         ← writing to a dead WS object
    #   websocket.receive_text()         ← raises RuntimeError (not WebSocketDisconnect)
    #   → caught by bare except → logs "WebSocket is not connected. Need to call accept"
    #
    # FIX:
    # 1. A parallel coroutine concurrently calls websocket.receive_text() with a
    #    short timeout in a loop.  If the client disconnects during loading it
    #    catches WebSocketDisconnect and sets a shared asyncio.Event.
    # 2. After run_in_executor() returns we check that event.  If it fired we
    #    discard the session and return immediately — no tasks, no sends, no error.
    # 3. We also check websocket.client_state so that even silent disconnects
    #    (where no WS close frame was sent) are caught.
    #
    import random, string as _string

    _ts        = __import__("datetime").datetime.now().strftime("%Y%m%d_%H%M%S")
    _rand      = "".join(random.choices(_string.ascii_lowercase + _string.digits, k=6))
    _report_id = f"{_ts}_{_rand}"

    loop = asyncio.get_event_loop()

    def _make_session():
        s = HireMindSession(session_id)
        s.session_id = _report_id
        return s

    # Shared disconnect signal: set by _watch_disconnect if client leaves early
    _client_disconnected = asyncio.Event()
    _loading_done        = asyncio.Event()

    async def _loading_keepalive():
        """Send a ping every 10 s while the session is being built."""
        while not _loading_done.is_set():
            await asyncio.sleep(10)
            if not _loading_done.is_set():
                await _safe_send_early(websocket, {"type": "ping"})

    async def _watch_disconnect():
        """
        Detect client disconnect during model loading.

        Strategy: poll websocket.client_state directly in a tight loop.
        We do NOT call receive_text() here because that would steal the first
        real message from the main loop.  client_state is set to DISCONNECTED
        by Starlette as soon as a WS close frame arrives or the TCP connection
        is reset — no receive() call needed to observe it.
        """
        while not _loading_done.is_set():
            await asyncio.sleep(0.5)
            if websocket.client_state == WebSocketState.DISCONNECTED:
                _client_disconnected.set()
                log.warning(
                    "[Session %s] Client disconnected during model loading — aborting",
                    session_id,
                )
                return

    await _safe_send_early(websocket, {"type": "ping"})
    _lk_task   = asyncio.create_task(_loading_keepalive())
    _wd_task   = asyncio.create_task(_watch_disconnect())

    session = await loop.run_in_executor(_SESSION_EXECUTOR, _make_session)

    _loading_done.set()
    _lk_task.cancel()
    _wd_task.cancel()

    # ── GUARD: abort if client left while we were loading ─────────────────────
    if _client_disconnected.is_set() or websocket.client_state == WebSocketState.DISCONNECTED:
        log.warning(
            "[Session %s] Aborting — client gone before session was ready (report_id=%s)",
            session_id, _report_id,
        )
        sessions.pop(session_id, None)
        return   # Clean exit — no tasks created, no sends attempted, no error logged

    sessions[session_id] = session
    log.info("Session %s connected  (report_id=%s)", session_id, session.session_id)

    last_video_result  = {}
    last_audio_result  = {}
    last_coaching_time = 0.0
    last_video_process = 0.0
    last_audio_process = 0.0

    # ── FIX #1: Per-connection asyncio.Lock for WebSocket sends ──────────────
    # This prevents the coaching tick coroutine and the main handler from
    # writing to the WebSocket concurrently (which corrupts the WS frame and
    # triggers a client-side disconnect).
    _ws_send_lock = asyncio.Lock()

    async def _safe_send(data: dict) -> bool:
        """Thread-safe WebSocket send. Returns False if the send fails."""
        if websocket.client_state == WebSocketState.DISCONNECTED:
            return False
        async with _ws_send_lock:
            try:
                if websocket.client_state == WebSocketState.DISCONNECTED:
                    return False
                await websocket.send_text(json.dumps(data))
                return True
            except Exception as exc:
                log.debug("[Send %s] Failed (connection may be closed): %s", session_id, exc)
                return False

    # ── Background task: keepalive ping every 20 s ───────────────────────────
    async def _keepalive():
        while True:
            await asyncio.sleep(20)
            if session._session_ended:
                break
            ok = await _safe_send({"type": "ping"})
            if not ok:
                break

    # ── Background task: coaching tick every 3 s ─────────────────────────────
    async def _coaching_tick():
        nonlocal last_coaching_time
        while True:
            await asyncio.sleep(3.0)

            # FIX #3C: Stop the coaching tick as soon as end_session is called.
            # Without this check the tick keeps spawning run_in_executor() calls
            # that block on self._lock while end_session holds it, exhausting the
            # thread pool and preventing the report from ever being generated.
            if session._session_ended:
                break

            now = time.time()
            if now - last_coaching_time >= 3.0 and last_video_result:
                coaching = None   # always reset before the executor call
                try:
                    audio_snapshot = last_audio_result if last_audio_result else {}

                    coaching = await loop.run_in_executor(
                        _COACH_EXECUTOR, session.generate_coaching,
                        last_video_result, audio_snapshot,
                    )

                    # Guard: run_in_executor returns None if the callable itself
                    # returns None (shouldn't happen but defensive check).
                    if coaching is None:
                        log.warning("[CoachingTick %s] generate_coaching returned None — skipping tick", session_id)
                        continue

                    # Guard: session may have ended during the executor call
                    if session._session_ended:
                        break

                    last_coaching_time = now

                    _append_frame_jsonl(
                        session_id,
                        session._current_question,
                        last_video_result,
                        audio_snapshot,
                    )

                    fb = coaching.get("feedback") or {}
                    user_payload: dict = {}
                    if fb.get("tips"):
                        user_payload["comments"] = fb["tips"]
                    if fb.get("adaptive_note"):
                        user_payload["adaptive_note"] = fb["adaptive_note"]

                    if user_payload:
                        await _safe_send({"type": "coaching_update", "data": user_payload})

                except asyncio.CancelledError:
                    break
                except Exception as exc:
                    log.error("[CoachingTick %s] %s", session_id, exc)

    keepalive_task = asyncio.create_task(_keepalive())
    coaching_task  = asyncio.create_task(_coaching_tick())
    video_task     = None
    audio_task     = None

    async def _process_video_frame_async(frame_bytes: bytes) -> None:
        # FIX: Run expensive frame + DeepFace work in a bounded background task
        # so the WebSocket receive loop is never held by TensorFlow/MediaPipe.
        nonlocal last_video_result
        try:
            video_result = await loop.run_in_executor(
                _VIDEO_EXECUTOR, session.process_frame, frame_bytes
            )
            if "error" not in video_result:
                last_video_result = video_result

            mp_emo = mediapipe_emotion(video_result.get("emotion", {}))
            await _safe_send({
                "type": "visual_update",
                "data": {
                    "emotion_detected": bool(mp_emo.get("label")),
                    "stress_level":     video_result.get("stress", {}).get("level", "LOW"),
                    "eye_away":         video_result.get("eye",     {}).get("looking_away", False),
                    "slouching":        video_result.get("posture", {}).get("slouching",    False),
                },
            })
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            log.error("[VideoFrame %s] %s", session_id, exc)

    async def _process_audio_chunk_async(audio_bytes: bytes, engine: str) -> None:
        # FIX: STT can block on Vosk/Whisper. Keep only one in-flight audio
        # chunk per session so the socket reader stays responsive under load.
        nonlocal last_audio_result
        try:
            audio_result = await loop.run_in_executor(
                _AUDIO_EXECUTOR, session.process_audio, audio_bytes, engine
            )
            last_audio_result = audio_result

            if audio_result.get("speech_transcript"):
                await _safe_send({
                    "type": "transcript_update",
                    "data": {"text": audio_result["speech_transcript"]},
                })
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            log.error("[AudioChunk %s] %s", session_id, exc)

    # ─────────────────────────────────────────────────────────────────────────
    # Main message loop
    # ─────────────────────────────────────────────────────────────────────────

    try:
        while True:
            # Guard: check WebSocket state before every receive attempt.
            # If the client closed without a proper WS close frame (browser crash,
            # network drop, tab killed) Starlette marks client_state = DISCONNECTED
            # but does NOT raise WebSocketDisconnect on the next receive_text() call
            # — it raises RuntimeError instead.  Checking here lets us exit the loop
            # with a clean INFO log rather than a scary ERROR.
            if websocket.client_state == WebSocketState.DISCONNECTED:
                log.info("Session %s WS state=DISCONNECTED — exiting loop cleanly", session_id)
                break

            # Receive next message (60 s timeout → keepalive ping)
            try:
                # FIX: No application-level receive timeout; keepalive handles liveness.
                raw = await websocket.receive_text()
            except asyncio.TimeoutError:
                ok = await _safe_send({"type": "ping"})
                if not ok:
                    break
                continue
            except RuntimeError as exc:
                msg = str(exc).lower()
                if "not connected" in msg or "accept" in msg or "disconnect" in msg:
                    log.info("Session %s receive loop ended: %s", session_id, exc)
                    break
                raise

            # ── FIX #2: Per-message exception handling ────────────────────────
            # Wrap each message handler in its own try/except.  This prevents a
            # single bad message (e.g. KeyError on missing "frame" key, bad base64,
            # etc.) from propagating out of the while-loop and crashing the entire
            # WebSocket handler — which previously closed the connection on the client.
            try:
                data     = json.loads(raw)
                msg_type = data.get("type", "")
            except (json.JSONDecodeError, TypeError) as exc:
                log.warning("[Parse %s] Bad JSON: %s", session_id, exc)
                continue

            # Ignore client ping/pong
            if msg_type in ("ping", "pong"):
                continue

            # Mode switch
            if "mode" in data:
                try:
                    session.mode = data["mode"]
                    session.coach.set_mode(data["mode"])
                except Exception as exc:
                    log.warning("[Mode %s] %s", session_id, exc)

            # ── START SESSION ─────────────────────────────────────────────────
            if msg_type == "start_session":
                try:
                    engine_status = await loop.run_in_executor(_AUDIO_EXECUTOR, session.start_stt)
                    with session._lock:
                        first_q = session._current_question
                        if not first_q:
                            first_q = session.coach._pick_question()
                            session._current_question = first_q
                            session.history.append({
                                "timestamp": 0.0,
                                "video":     {},
                                "audio":     {},
                                "feedback":  {
                                    "next_question": first_q, "tips": [], "priority": "info",
                                    "adaptive_note": None, "chronic_issues": [],
                                },
                                "scores": {},
                            })
                    await _safe_send({
                        "type": "session_started",
                        "data": {
                            "message":       "Session started. STT engines ready.",
                            "engine_status": engine_status,
                        },
                    })
                    await _safe_send({
                        "type": "question",
                        "data": {
                            "question":       first_q,
                            "question_index": session._question_index,
                        },
                    })
                except Exception as exc:
                    log.error("[StartSession %s] STT init failed: %s", session_id, exc)
                    with session._lock:
                        fallback_q = session._current_question or "Tell me about yourself."
                        if not session._current_question:
                            session._current_question = fallback_q
                    await _safe_send({
                        "type": "session_started",
                        "data": {
                            "message":       "Session started (STT unavailable).",
                            "engine_status": {"vosk": False, "whisper": False, "azure": False},
                        },
                    })
                    await _safe_send({
                        "type": "question",
                        "data": {
                            "question":       fallback_q,
                            "question_index": session._question_index,
                        },
                    })

            # ── NEXT QUESTION ─────────────────────────────────────────────────
            elif msg_type in ("next", "next_question"):
                # BUG FIX — Index Sync
                # ─────────────────────
                # next_question() now returns a dict so we get index + question
                # in one atomic result.  We MUST:
                #   1. Run next_question() in the executor (it acquires a lock).
                #   2. Append the Q&A record BEFORE sending the new question so
                #      the file is always written even if the send fails.
                #   3. Send {"type":"question","data":{"question":q,
                #      "question_index":n}} so the frontend counter is driven by
                #      the server — not by the client's own local increment.
                import datetime as _dt_nq
                try:
                    nq_result = await loop.run_in_executor(_COACH_EXECUTOR, session.next_question)

                    new_q      = nq_result["question"]
                    new_idx    = nq_result["question_index"]
                    prev_idx   = nq_result["prev_index"]
                    completed  = nq_result["answer_snapshot"]
                    if data.get("answer") and not completed:
                        completed = str(data.get("answer", "")).strip()
                    prev_q_txt = nq_result.get("prev_question_text", "")
                    ts_now     = _dt_nq.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
                    qa_analysis = session.text_intel.analyze(completed, prev_q_txt)
                    qa_deepface = _deepface_snapshot(last_video_result)
                    qa_mediapipe = _mediapipe_snapshot(last_video_result)
                    qa_vision = _vision_snapshot(last_video_result, last_audio_result)

                    # Step 1: Write Q&A record for the question we just LEFT.
                    # prev_idx is 0-based, so human label is Q{prev_idx+1}.
                    # Written BEFORE the send so a crash cannot leave a gap.
                    _append_qa_jsonl(
                        session_id     = session_id,
                        question_index = prev_idx,
                        question_id    = f"Q{prev_idx + 1}",
                        question_text  = prev_q_txt,
                        user_answer    = completed,
                        timestamp      = ts_now,
                        analysis       = qa_analysis,
                        deepface       = qa_deepface,
                        mediapipe      = qa_mediapipe,
                        vision         = qa_vision,
                    )

                    if data.get("client_driven"):
                        await _safe_send({
                            "type": "question_saved",
                            "data": {
                                "question_index": prev_idx,
                                "next_question_index": new_idx,
                            },
                        })
                        continue

                    # Step 2: Send new question WITH the authoritative index so
                    # frontend counter is always server-driven.
                    await _safe_send({
                        "type": "question",
                        "data": {
                            "question":       new_q,
                            "question_index": new_idx,
                        },
                    })

                    # Step 3: Terminal confirmation
                    log.info(
                        "[NextQuestion %s] ✓ index %d → %d | sent: %.60s",
                        session_id, prev_idx, new_idx, new_q,
                    )

                except Exception as exc:
                    log.error("[NextQuestion %s] %s", session_id, exc)
                    # FIX #4 preserved: always send something so the UI is never frozen.
                    with session._lock:
                        fallback_q   = session._current_question or "Tell me about yourself."
                        fallback_idx = session._question_index
                    await _safe_send({
                        "type": "question",
                        "data": {
                            "question":       fallback_q,
                            "question_index": fallback_idx,
                        },
                    })

            # ── VIDEO FRAME ───────────────────────────────────────────────────
            elif msg_type == "video_frame":
                try:
                    now = time.time()
                    if now - last_video_process < 0.8:
                        continue
                    # FIX: Drop overlapping frame work instead of queueing it.
                    # DeepFace/TensorFlow can be slower than the camera stream;
                    # bounding this prevents RAM growth and receive-loop stalls.
                    if video_task is not None and not video_task.done():
                        continue
                    last_video_process = now
                    frame_bytes  = base64.b64decode(data["frame"])
                    video_task = asyncio.create_task(_process_video_frame_async(frame_bytes))
                except Exception as exc:
                    log.error("[VideoFrame %s] %s", session_id, exc)
                    # Don't break — the session continues, video is just skipped

            # ── AUDIO CHUNK ───────────────────────────────────────────────────
            elif msg_type == "audio_chunk":
                try:
                    now = time.time()
                    if now - last_audio_process < 2.0:
                        continue
                    # FIX: Do not let slow STT block receive_text() or build an
                    # unbounded queue. The newest accepted chunk preserves output
                    # shape while protecting the live WebSocket.
                    if audio_task is not None and not audio_task.done():
                        continue
                    last_audio_process = now
                    audio_bytes  = base64.b64decode(data["audio"])
                    engine       = data.get("engine", "auto")
                    audio_task = asyncio.create_task(_process_audio_chunk_async(audio_bytes, engine))
                except Exception as exc:
                    log.error("[AudioChunk %s] %s", session_id, exc)

            # ── END SESSION ───────────────────────────────────────────────────
            elif msg_type == "end_session":
                try:
                    # Cancel background tasks BEFORE running end_session so no new
                    # coaching ticks can spawn and race with report generation.
                    keepalive_task.cancel()
                    coaching_task.cancel()
                    # FIX: Stop in-flight frame/audio jobs before final snapshots
                    # so report generation is not racing stale background work.
                    if video_task is not None:
                        video_task.cancel()
                    if audio_task is not None:
                        audio_task.cancel()

                    # BUG FIX — flush final Q&A record before generating report.
                    # The last question never gets a "Next" click, so its Q&A
                    # record would be missing from the analysis file.  Snapshot
                    # the current answer and write it now, exactly once, using
                    # the same _append_qa_jsonl helper used by the Next handler.
                    import datetime as _dt_end
                    try:
                        with session._lock:
                            final_answer = " ".join(session._current_answer).strip()
                            final_idx    = session._question_index
                            final_q_txt  = session._current_question
                        final_analysis = session.text_intel.analyze(final_answer, final_q_txt)
                        final_deepface = _deepface_snapshot(last_video_result)
                        final_mediapipe = _mediapipe_snapshot(last_video_result)
                        final_vision = _vision_snapshot(last_video_result, last_audio_result)
                        _append_qa_jsonl(
                            session_id     = session_id,
                            question_index = final_idx,
                            question_id    = f"Q{final_idx + 1}",
                            question_text  = final_q_txt,
                            user_answer    = final_answer,
                            timestamp      = _dt_end.datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
                            analysis       = final_analysis,
                            deepface       = final_deepface,
                            mediapipe      = final_mediapipe,
                            vision         = final_vision,
                        )
                        log.info(
                            "[EndSession %s] Final Q&A flushed — index=%d words=%d",
                            session_id, final_idx, len(final_answer.split()),
                        )
                    except Exception as _fe:
                        log.warning("[EndSession %s] Could not flush final Q&A: %s", session_id, _fe)

                    # FIX #5: Pass last_video_result and last_audio_result into
                    # end_session() so the final face/emotion state is included in
                    # the report even if the coaching tick hasn't flushed it yet.
                    result = await loop.run_in_executor(
                        _COACH_EXECUTOR, session.end_session,
                        last_video_result, last_audio_result,
                    )

                    rich = _build_rich_summary(result["session_report"], result["files"])
                    log.info("[Session %s] %s", session_id, _human_summary(result["session_report"]))

                    await _safe_send({"type": "session_complete", "data": rich})
                    await asyncio.sleep(0.8)   # give client time to render report before close

                except asyncio.CancelledError:
                    pass
                except Exception as exc:
                    log.error("[EndSession %s] %s", session_id, exc)
                    await _safe_send({
                        "type": "session_complete",
                        "data": {
                            "verdict":        "Session ended — report generation failed.",
                            "trend":          "stable",
                            "duration_min":   0,
                            "total_frames":   0,
                            "questions_asked": 0,
                            "scores":         [],
                            "strengths":      [],
                            "improvements":   [],
                            "chronic_issues": [],
                            "files":          {},
                        },
                    })
                    await asyncio.sleep(0.5)

                # Graceful close — tells the client the server is done.
                # Swallow errors: the connection may already be gone if the
                # client disconnected while the report was being generated.
                try:
                    await websocket.close(code=1000, reason="Session complete")
                except Exception as _ce:
                    log.debug("[Close %s] already closed (ok): %s", session_id, _ce)
                break  # Exit the main loop

    except WebSocketDisconnect:
        log.info("Session %s disconnected by client", session_id)
    except RuntimeError as exc:
        # Starlette raises RuntimeError("WebSocket is not connected...") when
        # receive_text() or send_text() is called on a WebSocket that the client
        # already closed without sending a proper WS close frame (e.g. browser
        # tab closed, network drop, page reload).  This is NOT a server bug —
        # treat it the same as WebSocketDisconnect.
        msg = str(exc).lower()
        if "not connected" in msg or "accept" in msg or "disconnect" in msg:
            log.info(
                "Session %s client connection lost (RuntimeError: %s)", session_id, exc
            )
        else:
            log.error("Session %s unexpected RuntimeError: %s", session_id, exc)
    except Exception as exc:
        log.error("Session %s unexpected handler error: %s", session_id, exc)
    finally:
        # Ensure background tasks are cancelled on any exit path
        for task in (keepalive_task, coaching_task, video_task, audio_task):
            try:
                task.cancel()
            except Exception:
                pass
        sessions.pop(session_id, None)
        log.info("Session %s cleaned up", session_id)


# ─────────────────────────────────────────────────────────────────────────────
# Utility
# ─────────────────────────────────────────────────────────────────────────────

def _build_rich_summary(report: dict, files: dict) -> dict:
    avg      = report.get("average_scores",        {})
    trend    = report.get("trend",                 "stable")
    strengths= report.get("strengths",             [])
    improve  = report.get("areas_for_improvement", [])
    chronic  = report.get("chronic_issues",        [])
    duration = report.get("session_duration_min",  0)
    frames   = report.get("total_frames",          0)
    q_asked  = report.get("questions_asked",       0)
    # questions_asked may be a list (question strings) — normalize to count
    if isinstance(q_asked, list):
        q_asked = len(q_asked)

    def fmt(k):
        return k.replace("_", " ").title()

    def grade(v):
        if not isinstance(v, (int, float)):
            return "N/A"
        if v >= 8.5: return "A"
        if v >= 7.0: return "B"
        if v >= 5.5: return "C"
        if v >= 4.0: return "D"
        return "F"

    scores_display = [
        {
            "label": fmt(k),
            "key":   k,
            "value": avg.get(k, 0),
            "grade": grade(avg.get(k, 0)),
        }
        for k in ["overall", "confidence", "clarity", "posture", "eye_contact", "answer_quality"]
    ]

    overall_val = avg.get("overall", 0)
    if overall_val >= 7.5:
        verdict = "Strong session — you performed well overall."
    elif overall_val >= 5.5:
        verdict = "Decent session — a few areas to polish."
    else:
        verdict = "Room to grow — focus on the improvement areas below."

    return {
        "verdict":         verdict,
        "trend":           trend,
        "duration_min":    duration,
        "total_frames":    frames,
        "questions_asked": q_asked,
        "scores":          scores_display,
        "strengths":       [fmt(s) for s in strengths],
        "improvements":    [fmt(s) for s in improve],
        "chronic_issues":  [fmt(s) for s in chronic],
        "files":           files,
    }


def _human_summary(report: dict) -> str:
    trend     = report.get("trend", "stable")
    strengths = report.get("strengths", [])
    improve   = report.get("areas_for_improvement", [])
    parts     = [f"Session complete — your performance was {trend}."]
    if strengths:
        parts.append(f"Strong areas: {', '.join(s.replace('_',' ') for s in strengths)}.")
    if improve:
        parts.append(f"Focus on: {', '.join(s.replace('_',' ') for s in improve)}.")
    return " ".join(parts)


# ─────────────────────────────────────────────────────────────────────────────
# HTTP endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    engine_status: dict = {}
    try:
        engine_status = STTEngine.engine_status()
    except Exception:
        pass
    return {
        "status":          "ok",
        "version":         "HireMind 3.1",
        "active_sessions": len(sessions),
        "engine_status":   engine_status,
    }


@app.get("/")
def root():
    return {
        "message": "HireMind AI Interview System v3.1 — ws://host/ws/{session_id}"
    }
## add cors middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    os.makedirs("reports",     exist_ok=True)
    os.makedirs("transcripts", exist_ok=True)
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=3000,
        reload=False,
        log_level="info",
    )
