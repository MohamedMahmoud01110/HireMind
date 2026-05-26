# 🎯 HireMind — AI Interview Analysis System

A real-time, modular AI interview coach. It silently evaluates vision, speech,
and answer quality — showing the user **only** friendly coaching tips and questions.

---

## Project Structure

```
HireMind/
├── main.py                        ← FastAPI + WebSocket server  ← START HERE
├── requirements.txt
│
├── vision_engine/
│   ├── __init__.py
│   └── analyzer.py                ← Face, posture, eye contact (MediaPipe)
│
├── speech_engine/
│   ├── __init__.py
│   └── analyzer.py                ← Vosk / Whisper / Azure STT + WPM + fillers
│
├── ai_core/
│   ├── __init__.py
│   ├── detector.py                ← Emotion + stress estimation
│   ├── coach.py                   ← Adaptive coaching engine
│   └── text_intelligence.py       ← Answer quality + structure scoring
│
├── report_generator/
│   ├── __init__.py
│   └── generator.py               ← JSON + Excel (.xlsx) report output
│
└── ui_dashboard/
    └── index.html                 ← User-facing interface (comments + questions only)
```

---

## Quick Start

### 1. Install dependencies

```bash
cd HireMind
pip install -r requirements.txt
```

### 2. Install the Vosk model (speech recognition)

```bash
pip install vosk
# Download the model:
# https://alphacephei.com/vosk/models/vosk-model-en-us-0.22.zip
# Unzip and set VOSK_MODEL_PATH env var OR place at:
# C:\Users\power\OneDrive\Desktop\vosk-model-en-us-0.22
```

### 3. Run the server

```bash
python main.py
# → Starts on ws://localhost:8000  and  http://localhost:8000
```

### 4. Open the frontend

```bash
# Option A: open ui_dashboard/index.html directly in your browser
# Option B: serve with Python
python -m http.server 3000 --directory ui_dashboard
# Visit http://localhost:3000
```

---

## What the User Sees

| Panel | Content |
|-------|---------|
| **Questions** | One interview question at a time, adapts to performance |
| **Coaching** | Human-readable tips only (no scores, no labels) |
| **Video** | Their own camera feed with subtle status dots |

**Nothing else.** All internal scores, emotion labels, and analysis data are
processed silently in the backend pipeline.

---

## Fix: ModuleNotFoundError

The original error was:
```
ModuleNotFoundError: No module named 'vision_engine'
```

**Cause:** Python couldn't find the sub-packages because `__init__.py` files were missing.

**Fix applied in HireMind:**
- All packages now have `__init__.py`
- All imports use the correct package paths (`vision_engine`, `speech_engine`, `ai_core`, `report_generator`)
- Run `python main.py` from **inside** the `HireMind/` directory

```bash
cd HireMind
python main.py   # ← always run from here
```

---

## Architecture

```
WebSocket frame ──► VisionAnalyzer ──► face / posture / eye
                                          │
WebSocket audio ──► SpeechAnalyzer ──► transcript / WPM / fillers
                                          │
Answer text     ──► TextIntelligence ──► structure / depth / relevance
                                          │
All signals ────────────────────────────► EmotionDetector ──► emotion / stress
                                          │
                                        AdaptiveCoach
                                          │
                        ┌─────────────────┴───────────────────┐
                    coaching tips                      next question
                   (user-visible)                    (user-visible)
```

---

## Report Output

After `End & Report`:
- `reports/HireMind_Report_<timestamp>.json` — full session JSON
- `reports/HireMind_Report_<timestamp>.xlsx` — 3-sheet Excel:
  - **Summary** — overall scores with colour coding
  - **Q&A Analysis** — per-question breakdown
  - **Score Timeline** — frame-by-frame score history
