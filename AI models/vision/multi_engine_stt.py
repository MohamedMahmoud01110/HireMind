"""
╔══════════════════════════════════════════════════════════════════════════════╗
║          HireMind — Multi-Engine STT Fusion System                          ║
║                                                                              ║
║  Engines  : Whisper (local) · Vosk (local) · Azure (cloud)                  ║
║  Strategy : Parallel dispatch -> Levenshtein similarity + weighted fusion     ║
║  Output   : Terminal display + per-utterance JSON log                        ║
║                                                                              ║
║  Audio    : sounddevice, 16 kHz / mono / 16-bit PCM                          ║
║  Threading: ThreadPoolExecutor — all three engines run simultaneously        ║
╚══════════════════════════════════════════════════════════════════════════════╝

SETUP

pip install sounddevice numpy openai-whisper vosk azure-cognitiveservices-speech

Environment variables (Azure only):
    AZURE_SPEECH_KEY     = "<your key>"
    AZURE_SPEECH_REGION  = "eastus"          # or your region

Vosk model path (set env var or edit DEFAULT_VOSK_PATH below):
    VOSK_MODEL_PATH = "/path/to/vosk-model-en-us-0.22"
    Download: https://alphacephei.com/vosk/models/vosk-model-en-us-0.22.zip

Run:
    python multi_engine_stt.py
    # Press Enter to start / stop each utterance.
    # Press Ctrl-C to exit and save final JSON log.
"""

from __future__ import annotations

import io
import json
import logging
import os
import queue
import struct
import tempfile
import threading
import time
import wave
from concurrent.futures import ThreadPoolExecutor, as_completed, Future
from dataclasses import dataclass, asdict, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

#  Optional import: sounddevice 
try:
    import sounddevice as sd
    _SD_AVAILABLE = True
except ImportError:
    _SD_AVAILABLE = False
    print("[WARNING] sounddevice not installed. Install: pip install sounddevice")

# 
# Constants
# 

SAMPLE_RATE     = 16_000      # Hz  — all engines expect 16 kHz
CHANNELS        = 1           # mono
SAMPLE_WIDTH    = 2           # bytes — 16-bit signed PCM
CHUNK_FRAMES    = 1_600       # 100 ms per callback chunk
SILENCE_RMS     = 300         # energy gate (skip dead-air frames)
DEFAULT_VOSK_PATH = os.environ.get(
    "VOSK_MODEL_PATH",
    r"C:\Users\power\OneDrive\Desktop\vosk-model-en-us-0.22",
)

#  Engine confidence weights (Whisper > Azure > Vosk) 
# Rationale:
#   Whisper  — transformer-based, strong WER on clean mic audio
#   Azure    — cloud model, very strong but adds ~300 ms RTT
#   Vosk     — fast offline Kaldi model, slightly lower WER than Whisper
ENGINE_WEIGHTS: Dict[str, float] = {
    "whisper": 0.50,
    "azure":   0.30,
    "vosk":    0.20,
}

# 
# Logging
# 

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("fusion_stt")


# 
# Data structures
# 

@dataclass
class EngineResult:
    """Result from a single STT engine."""
    engine:     str
    transcript: str
    latency_ms: float
    error:      Optional[str] = None

    @property
    def ok(self) -> bool:
        return bool(self.transcript) and self.error is None


@dataclass
class FusionResult:
    """Final fused transcription for one utterance."""
    utterance_id:   int
    timestamp:      str
    final:          str                          # ← THE winner
    method:         str                          # majority_vote | similarity | weighted | single
    engine_results: List[EngineResult]
    similarity_matrix: Dict[str, Dict[str, float]] = field(default_factory=dict)
    scores:         Dict[str, float]             = field(default_factory=dict)
    duration_ms:    float                        = 0.0


# 
# Audio helpers
# 

def _pcm_to_wav(pcm: bytes) -> bytes:
    """Wrap raw PCM bytes in a minimal WAV container."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(SAMPLE_WIDTH)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm)
    return buf.getvalue()


def _rms(pcm: bytes) -> float:
    """Root-mean-square energy of a PCM buffer."""
    if len(pcm) < 2:
        return 0.0
    n = len(pcm) // 2
    samples = struct.unpack_from(f"<{n}h", pcm)
    return (sum(s * s for s in samples) / n) ** 0.5


def _is_silent(pcm: bytes) -> bool:
    return _rms(pcm) < SILENCE_RMS


# 
# Levenshtein / similarity utilities
# 

def levenshtein(a: str, b: str) -> int:
    """
    Standard dynamic-programming Levenshtein edit distance.
    Pure Python — no third-party dependency needed.
    Complexity: O(len(a) * len(b)).
    """
    a, b = a.lower().split(), b.lower().split()   # word-level (faster, better for speech)
    m, n = len(a), len(b)
    dp = list(range(n + 1))
    for i in range(1, m + 1):
        prev = dp[:]
        dp[0] = i
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]:
                dp[j] = prev[j - 1]
            else:
                dp[j] = 1 + min(prev[j], dp[j - 1], prev[j - 1])
    return dp[n]


def similarity(a: str, b: str) -> float:
    """
    Normalised similarity score in [0, 1].
    1.0 = identical, 0.0 = completely different.

    Formula:  1 - edit_distance / max(len(a_words), len(b_words), 1)
    """
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    wa, wb = a.lower().split(), b.lower().split()
    dist   = levenshtein(a, b)
    return round(1.0 - dist / max(len(wa), len(wb), 1), 4)


def pairwise_similarity(results: List[EngineResult]) -> Dict[str, Dict[str, float]]:
    """
    Compute all pairwise similarity scores between engine transcripts.
    Returns a dict of dicts:  matrix["whisper"]["vosk"] = 0.87
    """
    matrix: Dict[str, Dict[str, float]] = {}
    ok = [r for r in results if r.ok]
    for i, ri in enumerate(ok):
        matrix[ri.engine] = {}
        for j, rj in enumerate(ok):
            if i == j:
                matrix[ri.engine][rj.engine] = 1.0
            else:
                matrix[ri.engine][rj.engine] = similarity(ri.transcript, rj.transcript)
    return matrix


# 
# Fusion logic
# 

AGREE_THRESHOLD = 0.75   # similarity ≥ this -> considered "agreeing"


def fuse(results: List[EngineResult]) -> Tuple[str, str, Dict, Dict]:
    """
    Fuse engine results into ONE final transcript.

    Decision hierarchy
    
    1. MAJORITY VOTE  — if ≥ 2 engines produce transcripts with mutual
                        similarity ≥ AGREE_THRESHOLD, pick the one with the
                        highest sum of agreement-weighted confidence.

    2. WEIGHTED SCORE — if no majority, compute a per-candidate score:
                            score(e) = weight(e)
                                     + 0.3 * avg_similarity_to_others
                        and pick the highest.

    3. SINGLE ENGINE  — if only one engine returned a result, use it.

    4. EMPTY          — all engines failed; return "".

    Returns (final_text, method, similarity_matrix, score_dict)
    """
    ok = [r for r in results if r.ok]

    if not ok:
        log.warning("== [Fusion] EMPTY — all engines failed or silent")
        return "", "empty", {}, {}

    if len(ok) == 1:
        log.info("== [Fusion] SINGLE   winner=%-8s  -> \"%s\"",
                 ok[0].engine, ok[0].transcript)
        return ok[0].transcript, "single", {}, {ok[0].engine: 1.0}

    matrix = pairwise_similarity(ok)

    #  Step 1: Majority vote 
    agreement_groups: List[List[EngineResult]] = []
    used = set()
    for ri in ok:
        if ri.engine in used:
            continue
        group = [ri]
        for rj in ok:
            if rj.engine == ri.engine or rj.engine in used:
                continue
            if matrix.get(ri.engine, {}).get(rj.engine, 0) >= AGREE_THRESHOLD:
                group.append(rj)
        if len(group) >= 2:
            agreement_groups.append(group)
            for r in group:
                used.add(r.engine)

    if agreement_groups:
        # Pick the largest agreement group; break ties by total group weight
        best_group = max(
            agreement_groups,
            key=lambda g: (len(g), sum(ENGINE_WEIGHTS.get(r.engine, 0) for r in g)),
        )
        # Within the group choose the candidate with highest weighted confidence
        winner = max(
            best_group,
            key=lambda r: ENGINE_WEIGHTS.get(r.engine, 0),
        )
        scores = {r.engine: ENGINE_WEIGHTS.get(r.engine, 0) for r in ok}
        log.info("== [Fusion] MAJORITY  winner=%-8s  -> \"%s\"",
                 winner.engine, winner.transcript)
        return winner.transcript, "majority_vote", matrix, scores

    #  Step 2: Weighted similarity score 
    scores: Dict[str, float] = {}
    for ri in ok:
        other_sims = [
            matrix.get(ri.engine, {}).get(rj.engine, 0)
            for rj in ok if rj.engine != ri.engine
        ]
        avg_sim = sum(other_sims) / len(other_sims) if other_sims else 0.0
        scores[ri.engine] = round(
            ENGINE_WEIGHTS.get(ri.engine, 0.2) + 0.3 * avg_sim, 4
        )

    best_engine = max(scores, key=scores.__getitem__)
    winner_result = next(r for r in ok if r.engine == best_engine)
    log.info("== [Fusion] WEIGHTED  winner=%-8s  -> \"%s\"",
             best_engine, winner_result.transcript)
    return winner_result.transcript, "weighted", matrix, scores


# 
# Engine runner functions (each called in its own thread)
# 

#  Lazy engine singletons 

_registry_lock = threading.Lock()

_vosk_mod:   object = None
_vosk_model: object = None
_vosk_ready: bool   = False

_whisper_mod: object = None
_whisper_mdl: object = None
_whisper_ready: bool = False

_azure_sdk:    object = None
_azure_key:    str    = ""
_azure_region: str    = ""
_azure_ready:  bool   = False


def _load_vosk() -> bool:
    global _vosk_mod, _vosk_model, _vosk_ready
    with _registry_lock:
        if _vosk_mod is not None:
            return _vosk_ready
        try:
            import vosk as _v
            _v.SetLogLevel(-1)
            if not os.path.isdir(DEFAULT_VOSK_PATH):
                raise FileNotFoundError(f"Vosk model not found: {DEFAULT_VOSK_PATH}")
            _vosk_mod   = _v
            _vosk_model = _v.Model(DEFAULT_VOSK_PATH)
            _vosk_ready = True
            log.info("[Engine] OK Vosk loaded from %s", DEFAULT_VOSK_PATH)
        except Exception as exc:
            _vosk_mod   = False
            _vosk_ready = False
            log.warning("[Engine] XX Vosk unavailable: %s", exc)
        return _vosk_ready


def _load_whisper() -> bool:
    global _whisper_mod, _whisper_mdl, _whisper_ready
    with _registry_lock:
        if _whisper_mod is not None:
            return _whisper_ready
        try:
            import whisper as _wh
            size = os.environ.get("WHISPER_MODEL_SIZE", "base")
            _whisper_mdl   = _wh.load_model(size)
            _whisper_mod   = _wh
            _whisper_ready = True
            log.info("[Engine] OK Whisper '%s' loaded", size)
        except Exception as exc:
            _whisper_mod   = False
            _whisper_ready = False
            log.warning("[Engine] XX Whisper unavailable: %s", exc)
        return _whisper_ready


def _load_azure() -> bool:
    global _azure_sdk, _azure_key, _azure_region, _azure_ready
    with _registry_lock:
        if _azure_sdk is not None:
            return _azure_ready
        try:
            import azure.cognitiveservices.speech as _sdk
            key    = os.environ.get("AZURE_SPEECH_KEY", "")
            region = os.environ.get("AZURE_SPEECH_REGION", "")
            if not key or not region:
                raise EnvironmentError("AZURE_SPEECH_KEY / AZURE_SPEECH_REGION not set")
            _azure_sdk    = _sdk
            _azure_key    = key
            _azure_region = region
            _azure_ready  = True
            log.info("[Engine] OK Azure SDK ready (region=%s)", region)
        except Exception as exc:
            _azure_sdk   = False
            _azure_ready = False
            log.warning("[Engine] XX Azure unavailable: %s", exc)
        return _azure_ready


def _run_vosk_engine(pcm: bytes) -> EngineResult:
    t0 = time.perf_counter()
    if not _load_vosk():
        return EngineResult("vosk", "", 0.0, "Vosk not available")
    try:
        import json as _json
        rec = _vosk_mod.KaldiRecognizer(_vosk_model, SAMPLE_RATE)
        rec.SetWords(False)
        wav = _pcm_to_wav(pcm)
        chunk_size = 4_096
        for i in range(0, len(wav), chunk_size):
            rec.AcceptWaveform(wav[i: i + chunk_size])
        text = _json.loads(rec.FinalResult()).get("text", "").strip()
        return EngineResult("vosk", text, (time.perf_counter() - t0) * 1000)
    except Exception as exc:
        return EngineResult("vosk", "", (time.perf_counter() - t0) * 1000, str(exc))


def _run_whisper_engine(pcm: bytes) -> EngineResult:
    t0 = time.perf_counter()
    if not _load_whisper():
        return EngineResult("whisper", "", 0.0, "Whisper not available")
    try:
        wav = _pcm_to_wav(pcm)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(wav)
            path = tmp.name
        try:
            result = _whisper_mdl.transcribe(path, language="en", fp16=False)
            text   = result.get("text", "").strip()
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass
        return EngineResult("whisper", text, (time.perf_counter() - t0) * 1000)
    except Exception as exc:
        return EngineResult("whisper", "", (time.perf_counter() - t0) * 1000, str(exc))


def _run_azure_engine(pcm: bytes) -> EngineResult:
    t0 = time.perf_counter()
    if not _load_azure():
        return EngineResult("azure", "", 0.0, "Azure not available")
    try:
        sdk    = _azure_sdk
        wav    = _pcm_to_wav(pcm)
        stream = sdk.audio.PushAudioInputStream()
        stream.write(wav)
        stream.close()
        speech_cfg = sdk.SpeechConfig(subscription=_azure_key, region=_azure_region)
        speech_cfg.speech_recognition_language = "en-US"
        audio_cfg  = sdk.audio.AudioConfig(stream=stream)
        rec        = sdk.SpeechRecognizer(speech_config=speech_cfg,
                                          audio_config=audio_cfg)
        res = rec.recognize_once()
        text = res.text.strip() if res.reason == sdk.ResultReason.RecognizedSpeech else ""
        return EngineResult("azure", text, (time.perf_counter() - t0) * 1000)
    except Exception as exc:
        return EngineResult("azure", "", (time.perf_counter() - t0) * 1000, str(exc))


# 
# Parallel dispatcher
# 

_ENGINE_RUNNERS = {
    "whisper": _run_whisper_engine,
    "azure":   _run_azure_engine,
    "vosk":    _run_vosk_engine,
}

_pool = ThreadPoolExecutor(max_workers=3, thread_name_prefix="stt_engine")


def _ensure_int16_pcm(pcm: bytes) -> bytes:
    """
    Auto-detect float32 audio and convert to int16 PCM.

    Problem: some frontends send raw float32 samples (4 bytes each, values
    in [-1, 1]) instead of int16 PCM (2 bytes each, values in [-32768, 32767]).
    When float32 bytes are interpreted as int16, the RMS is anomalously high
    (> 10 000) because the IEEE-754 exponent bytes have large magnitudes.

    Detection heuristic
    -------------------
    If  rms(pcm as int16) > 10 000
    AND np.frombuffer(pcm, float32) has all values in [-2.0, 2.0]
    -> treat as float32, convert to int16.

    This is a server-side safety net. The real fix is to send int16 from
    the frontend (multiply float32 samples by 32767 before sending).
    """
    if len(pcm) < 4:
        return pcm

    # Quick RMS check on int16 interpretation
    n16 = len(pcm) // 2
    s16 = struct.unpack_from(f"<{n16}h", pcm)
    rms16 = (sum(x * x for x in s16) / max(n16, 1)) ** 0.5

    if rms16 <= 10_000:
        return pcm          # already looks like int16 PCM — leave it

    # Check if it looks like float32
    if len(pcm) % 4 != 0:
        return pcm          # can't be float32 if length not divisible by 4

    try:
        f32 = np.frombuffer(pcm, dtype=np.float32)
        if np.all(np.abs(f32) <= 2.0):
            # Confirmed float32 — convert to int16
            i16 = np.clip(f32, -1.0, 1.0)
            i16 = (i16 * 32767).astype(np.int16)
            log.warning(
                "[PCM] float32 detected (rms16=%.0f) — converted to int16  "
                "Fix frontend: send (Float32Array * 32767).astype(int16)",
                rms16,
            )
            return i16.tobytes()
    except Exception:
        pass

    return pcm


def dispatch_parallel(pcm: bytes, timeout: float = 60.0) -> list:
    """
    Send the same PCM buffer to all three engines simultaneously.

    timeout raised to 60 s — Whisper on CPU with memory pressure can take
    20-40 s for a 2-3 second utterance.  The old 15 s caused silent timeouts
    leaving only Vosk's low-confidence result in the fusion pool.
    """
    if _is_silent(pcm):
        log.debug("[Dispatch] Audio is silent — skipping all engines")
        return []

    pcm = _ensure_int16_pcm(pcm)   # ← fix float32 if frontend sent wrong format

    pcm_sec = round(len(pcm) / (SAMPLE_RATE * SAMPLE_WIDTH), 2)
    log.info(
        ">> [Dispatch] START  %d kB  (~%.1f s)  running vosk + whisper + azure",
        len(pcm) // 1024, pcm_sec,
    )

    futures: Dict[Future, str] = {
        _pool.submit(fn, pcm): name
        for name, fn in _ENGINE_RUNNERS.items()
    }

    results: List[EngineResult] = []
    deadline = time.time() + timeout

    for future in as_completed(futures, timeout=max(0.1, deadline - time.time())):
        name = futures[future]
        try:
            r = future.result()
            results.append(r)
            if r.ok:
                log.info("   OK %-8s  %5.0f ms  -> \"%s\"",
                         r.engine, r.latency_ms, r.transcript)
            else:
                log.info("   XX %-8s  %5.0f ms  -> [%s]",
                         r.engine, r.latency_ms, r.error or "empty")
        except Exception as exc:
            log.error("   XX %-8s  future raised: %s", name, exc)
            results.append(EngineResult(name, "", 0.0, str(exc)))

    # Ensure all engines are represented even if they timed out
    returned_names = {r.engine for r in results}
    for name in _ENGINE_RUNNERS:
        if name not in returned_names:
            log.warning("   XX %-8s  TIMED OUT after %.0f s", name, timeout)
            results.append(EngineResult(name, "", timeout * 1000, "timeout"))

    return results


# 
# Real-time audio recorder
# 

class MicRecorder:
    """
    Captures microphone audio using sounddevice's InputStream callback.

    Usage:
        with MicRecorder() as rec:
            rec.start()
            time.sleep(5)
            rec.stop()
            pcm = rec.get_pcm()
    """

    def __init__(self):
        self._q:      queue.Queue = queue.Queue()
        self._frames: List[bytes] = []
        self._stream  = None
        self._recording = False

    def _callback(self, indata, frames, time_info, status):
        if status:
            log.debug("[Mic] status=%s", status)
        if self._recording:
            # Convert float32 [-1,1] -> int16 PCM
            pcm_chunk = (indata[:, 0] * 32767).astype(np.int16).tobytes()
            self._q.put(pcm_chunk)

    def __enter__(self):
        if not _SD_AVAILABLE:
            raise RuntimeError("sounddevice not installed: pip install sounddevice")
        self._stream = sd.InputStream(
            samplerate  = SAMPLE_RATE,
            channels    = CHANNELS,
            dtype       = "float32",
            blocksize   = CHUNK_FRAMES,
            callback    = self._callback,
        )
        self._stream.start()
        return self

    def __exit__(self, *_):
        if self._stream:
            self._stream.stop()
            self._stream.close()

    def start(self):
        self._frames = []
        self._recording = True
        log.info("[Mic] ● Recording started")

    def stop(self):
        self._recording = False
        # Drain the queue
        while not self._q.empty():
            try:
                self._frames.append(self._q.get_nowait())
            except queue.Empty:
                break
        log.info("[Mic] ■ Recording stopped — %d ms captured",
                 len(b"".join(self._frames)) // (SAMPLE_RATE * SAMPLE_WIDTH // 1000))

    def get_pcm(self) -> bytes:
        # Drain any remaining items added during stop
        while not self._q.empty():
            try:
                self._frames.append(self._q.get_nowait())
            except queue.Empty:
                break
        return b"".join(self._frames)


# 
# JSON log
# 

class SessionLog:
    """
    Maintains a list of FusionResult objects and writes them to JSON on demand.

    Output format:
    {
        "session_id": "...",
        "started_at": "...",
        "utterances": [
            {
                "utterance_id": 1,
                "timestamp": "...",
                "final": "Hello world",
                "method": "majority_vote",
                "scores": {...},
                "engine_results": [...],
                "similarity_matrix": {...},
                "duration_ms": 1340.5
            },
            ...
        ]
    }
    """

    def __init__(self, output_dir: str = "."):
        self._utterances: List[FusionResult] = []
        self._started    = datetime.now().isoformat()
        self._session_id = datetime.now().strftime("session_%Y%m%d_%H%M%S")
        self._output_dir = Path(output_dir)
        self._output_dir.mkdir(parents=True, exist_ok=True)

    def add(self, result: FusionResult):
        self._utterances.append(result)

    def save(self) -> Path:
        path = self._output_dir / f"{self._session_id}.json"
        payload = {
            "session_id":   self._session_id,
            "started_at":   self._started,
            "saved_at":     datetime.now().isoformat(),
            "engine_weights": ENGINE_WEIGHTS,
            "utterances": [
                {
                    **asdict(u),
                    "engine_results": [asdict(r) for r in u.engine_results],
                }
                for u in self._utterances
            ],
        }
        with open(path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)
        return path


# 
# Pretty terminal printer
# 

def _bar(value: float, width: int = 20) -> str:
    """Simple ASCII progress bar for scores in [0, 1]."""
    filled = int(round(value * width))
    return "█" * filled + "░" * (width - filled)


def print_result(fr: FusionResult):
    """Formatted terminal output for one FusionResult."""
    sep = "" * 70
    print(f"\n{sep}")
    print(f"  Utterance #{fr.utterance_id}  [{fr.timestamp}]  ({fr.duration_ms:.0f} ms total)")
    print(sep)

    for er in fr.engine_results:
        status  = "OK" if er.ok else "XX"
        latency = f"{er.latency_ms:>6.0f} ms"
        weight  = ENGINE_WEIGHTS.get(er.engine, 0)
        bar     = _bar(weight)
        t       = er.transcript if er.transcript else f"[{er.error or 'no result'}]"
        print(f"  {status} {er.engine:<8}  {latency}  w={weight:.2f} {bar}")
        print(f"           \"{t}\"")

    print()
    print(f"  Fusion method : {fr.method.upper()}")
    if fr.scores:
        score_str = "  ".join(
            f"{e}={s:.3f}" for e, s in sorted(fr.scores.items(), key=lambda x: -x[1])
        )
        print(f"  Engine scores : {score_str}")

    if fr.similarity_matrix:
        engines = list(fr.similarity_matrix.keys())
        print(f"  Similarity    :", end="")
        pairs = [
            (a, b, fr.similarity_matrix[a][b])
            for i, a in enumerate(engines)
            for b in engines[i + 1:]
        ]
        print("  " + "   ".join(f"{a}↔{b}={v:.2f}" for a, b, v in pairs))

    print()
    print(f"  ══ FINAL: \"{fr.final}\"")
    print(sep)


# 
# Main interactive loop
# 

def run():
    """
    Interactive push-to-talk loop.

    Controls:
        Press Enter        -> start recording
        Press Enter again  -> stop & transcribe
        Press Ctrl-C       -> exit and save JSON log
    """
    print("\n" + "═" * 70)
    print("  HireMind — Multi-Engine STT Fusion")
    print("  Engines : Whisper · Vosk · Azure")
    print("  Fusion  : majority vote -> weighted similarity -> single engine")
    print("═" * 70)
    print("\n  Initialising engines (models load on first use)…\n")

    # Pre-warm engines in background so first utterance is faster
    _init_threads = [
        threading.Thread(target=_load_vosk,    daemon=True, name="init_vosk"),
        threading.Thread(target=_load_whisper, daemon=True, name="init_whisper"),
        threading.Thread(target=_load_azure,   daemon=True, name="init_azure"),
    ]
    for t in _init_threads:
        t.start()

    log_dir    = os.environ.get("STT_LOG_DIR", "stt_logs")
    session    = SessionLog(output_dir=log_dir)
    utterance  = 0

    try:
        with MicRecorder() as mic:
            print("  Ready. Controls:")
            print("    Enter       -> start / stop recording")
            print("    Ctrl-C      -> save JSON and exit\n")

            while True:
                input("  [ Press Enter to START recording ] ")
                mic.start()

                input("  [ Press Enter to STOP and transcribe ] ")
                mic.stop()

                pcm = mic.get_pcm()
                if not pcm or _is_silent(pcm):
                    print("  (silence detected — nothing to transcribe)\n")
                    continue

                print(f"\n  Sending {len(pcm) // 1000} kB to 3 engines simultaneously…")
                t0 = time.perf_counter()

                engine_results = dispatch_parallel(pcm)
                final, method, sim_matrix, scores = fuse(engine_results)
                duration_ms = (time.perf_counter() - t0) * 1000

                utterance += 1
                fr = FusionResult(
                    utterance_id      = utterance,
                    timestamp         = datetime.now().strftime("%H:%M:%S"),
                    final             = final,
                    method            = method,
                    engine_results    = engine_results,
                    similarity_matrix = sim_matrix,
                    scores            = scores,
                    duration_ms       = round(duration_ms, 1),
                )
                session.add(fr)
                print_result(fr)

    except KeyboardInterrupt:
        print("\n\n  Exiting…")

    except RuntimeError as exc:
        print(f"\n  [ERROR] {exc}")
        print("  Install sounddevice:  pip install sounddevice\n")
        return

    finally:
        if session._utterances:
            path = session.save()
            print(f"\n  JSON log saved -> {path.resolve()}")
            print(f"  Total utterances : {len(session._utterances)}")
        print()


# 
# Headless / programmatic API  (for integration into HireMind main.py)
# 

class FusionSTT:
    """
    Drop-in, programmatic wrapper for use inside the HireMind pipeline.

    Usage:
        fst = FusionSTT()
        result = fst.transcribe(pcm_bytes)   # returns FusionResult
        print(result.final)                  # one clean transcript
    """

    def __init__(self):
        self._utterance = 0

    def transcribe(self, pcm: bytes) -> FusionResult:
        """
        Dispatch PCM to all engines in parallel and fuse results.
        Thread-safe; can be called from the WebSocket handler directly.
        """
        self._utterance += 1
        t0 = time.perf_counter()
        engine_results = dispatch_parallel(pcm)
        final, method, sim_matrix, scores = fuse(engine_results)
        return FusionResult(
            utterance_id      = self._utterance,
            timestamp         = datetime.now().isoformat(),
            final             = final,
            method            = method,
            engine_results    = engine_results,
            similarity_matrix = sim_matrix,
            scores            = scores,
            duration_ms       = round((time.perf_counter() - t0) * 1000, 1),
        )

    @staticmethod
    def engine_status() -> dict:
        return {
            "whisper": _whisper_ready,
            "vosk":    _vosk_ready,
            "azure":   _azure_ready,
        }


# 
# Entry point
# 

if __name__ == "__main__":
    run()