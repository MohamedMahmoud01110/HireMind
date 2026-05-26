# HireMind v2.2 — Integration Reference

## Files changed / added

```
HireMind/
├── main.py                   ← UPDATED (additive — v2.2 changes marked inline)
├── speech/
│   ├── __init__.py           ← NEW (package marker)
│   └── stt_engine.py         ← NEW (multi-engine STT with lifecycle + logging)
└── transcripts/              ← AUTO-CREATED at runtime
    └── <session_id>.jsonl    ← one JSON object per line per transcript event
```

Nothing else changed. MediaPipe (`analyzer.py`), DeepFace (`deepface_analyzer.py`),
`coach.py`, `detector.py`, `generator.py`, `text_intelligence.py` are untouched.

---

## Session flow (strict)

```
1. WebSocket connects  →  server sends first question immediately
2. Client sends  {"type": "start_session"}
                 →  STT engines initialize (Vosk model loads, Whisper loads, Azure configures)
                 →  Server confirms with  {"type": "session_started"}
3. Client streams  {"type": "audio_chunk", ...}
                 →  transcribe() runs against already-initialized engines
                 →  transcript logged to terminal + JSONL file
                 →  server sends  {"type": "transcript_update"}
4. User clicks Next Question
   Client sends  {"type": "next_question"}
                 →  server advances to next question (ONLY on this event)
                 →  server sends  {"type": "question"}
5. User clicks End
   Client sends  {"type": "end_session"}
                 →  server sends  {"type": "session_complete"}
```

---

## WebSocket event reference

### CLIENT → SERVER

#### start_session
```json
{
  "type": "start_session"
}
```
Triggers eager initialization of all STT engines.
Must be sent before any `audio_chunk` events.

---

#### audio_chunk
```json
{
  "type":   "audio_chunk",
  "audio":  "<base64-encoded raw PCM, 16kHz/mono/16-bit>",
  "engine": "vosk"
}
```
`engine` options: `"vosk"` | `"whisper"` | `"azure"` | `"auto"`
Defaults to `"vosk"` if omitted.
Silently ignored if `start_session` has not been sent.

---

#### next_question
```json
{
  "type": "next_question"
}
```
Advances the interview to the next question.
This is the **only** way questions advance — the coaching tick never auto-advances.

---

#### video_frame
```json
{
  "type":  "video_frame",
  "frame": "<base64-encoded JPEG>"
}
```
Unchanged from v2.1.

---

#### end_session
```json
{
  "type": "end_session"
}
```
Triggers report generation and closes the session.

---

### SERVER → CLIENT

#### session_started
```json
{
  "type": "session_started",
  "data": {
    "message": "Session started. STT engines ready.",
    "engine_status": {
      "vosk":    true,
      "whisper": false,
      "azure":   false
    }
  }
}
```

#### question
```json
{
  "type": "question",
  "data": {
    "question": "Tell me a little about yourself."
  }
}
```

#### transcript_update
```json
{
  "type": "transcript_update",
  "data": {
    "text": "I have five years of experience in backend development"
  }
}
```

#### coaching_update
```json
{
  "type": "coaching_update",
  "data": {
    "comments":      ["Slow down a little — let your ideas breathe."],
    "adaptive_note": null
  }
}
```
Note: `next_question` is never included here. Questions only come via `{"type": "question"}`.

#### visual_update
```json
{
  "type": "visual_update",
  "data": {
    "emotion_detected": true,
    "stress_level":     "LOW",
    "eye_away":         false,
    "slouching":        false
  }
}
```

#### session_complete
```json
{
  "type": "session_complete",
  "data": {
    "message": "Session complete — your performance was stable. Strong areas: clarity.",
    "files": {
      "json_path":  "reports/HireMind_Report_abc123.json",
      "excel_path": "reports/HireMind_Report_abc123.xlsx"
    }
  }
}
```

---

## Transcript JSONL schema

File: `transcripts/<session_id>.jsonl`
One JSON object per line. Supports both partial and final results.

```json
{"timestamp": "2025-05-01T14:23:11.456Z", "session_id": "abc123", "engine": "vosk",    "text": "I have five",                                        "is_final": false}
{"timestamp": "2025-05-01T14:23:13.102Z", "session_id": "abc123", "engine": "vosk",    "text": "I have five years of experience in backend development", "is_final": true}
{"timestamp": "2025-05-01T14:24:01.889Z", "session_id": "abc123", "engine": "whisper", "text": "We shipped the feature under a tight deadline",          "is_final": true}
```

Fields:
| Field        | Type    | Description                                    |
|-------------|---------|------------------------------------------------|
| `timestamp`  | string  | ISO 8601 UTC with milliseconds                 |
| `session_id` | string  | Matches the WebSocket session ID               |
| `engine`     | string  | `vosk` \| `whisper` \| `azure` \| `auto`       |
| `text`       | string  | Recognized speech text                         |
| `is_final`   | boolean | `false` = streaming partial, `true` = complete |

---

## Terminal output examples

### Engine initialization (on start_session)
```
[STT] ── Starting engines for session: abc123 ──
[STT] Engine status — Vosk: ✓  Whisper: ✗  Azure: ✗
```

### Live transcripts
```
[STT][FINAL  ][VOSK   ] I have five years of experience in backend development
[STT][PARTIAL][VOSK   ] we shipped the
[STT][FINAL  ][VOSK   ] we shipped the feature under a tight deadline
[STT][FINAL  ][WHISPER] as a result the team reduced deployment time by forty percent
```

### Guard log (audio before start_session)
```
14:22:01 [hiremind.stt] DEBUG: [Session] Audio chunk received before start_stt() — skipping
```

### Auto routing log
```
14:23:45 [hiremind.stt] DEBUG: [STT] auto → vosk
14:24:12 [hiremind.stt] WARNING: [STT] auto: vosk skipped (Vosk recognizer error: ...)
14:24:12 [hiremind.stt] DEBUG: [STT] auto → whisper
```

---

## Environment variables

| Variable              | Required | Default                                        | Description               |
|-----------------------|----------|------------------------------------------------|---------------------------|
| `VOSK_MODEL_PATH`     | Yes*     | `C:\Users\power\...\vosk-model-en-us-0.22`    | Path to unpacked Vosk model dir |
| `WHISPER_MODEL_SIZE`  | No       | `base`                                         | `tiny`/`base`/`small`/`medium`/`large` |
| `AZURE_SPEECH_KEY`    | No       | —                                              | Azure subscription key    |
| `AZURE_SPEECH_REGION` | No       | —                                              | Azure region, e.g. `eastus` |

*Required only if using Vosk engine.

---

## Installation

```bash
# Primary (Vosk)
pip install vosk

# Optional fallback (Whisper)
pip install openai-whisper

# Optional cloud fallback (Azure)
pip install azure-cognitiveservices-speech

# Download and unzip Vosk model
# https://alphacephei.com/vosk/models/vosk-model-en-us-0.22.zip
# Set VOSK_MODEL_PATH env var to the unzipped directory
```

MediaPipe, DeepFace, and TensorFlow pip commands are unchanged.

---

## Architecture notes

### Why engines initialize on start_session, not on import or first audio chunk

Lazy import at module load avoids TensorFlow/DeepFace conflicts at startup.
Initialization on first audio chunk would add 2–8 seconds of latency to the
very first recognized word. Eager init on Start Session amortizes that cost
while the user is reading the first question, giving zero perceptible delay
during actual transcription.

### Why next_question is suppressed from coaching_update

`AdaptiveCoach.generate()` computes `next_question` internally for its own
scoring and history purposes — that logic is left completely intact.
The `generate_coaching()` method in `HireMindSession` strips that key before
returning to the WebSocket handler. The coach's `_pick_question()` is called
on demand from the `next_question` event handler instead. This means:
- The coach's performance-adaptive question selection still works correctly
- No auto-advance can occur regardless of score thresholds or tick timing
- No changes were made to `coach.py`
