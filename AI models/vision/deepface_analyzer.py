"""
HireMind - DeepFace Emotion Enrichment Layer
=============================================
ROLE  : Optional add-on that enriches emotion data produced by EmotionDetector
        (which is fed by MediaPipe's VisionAnalyzer).
SCOPE : This module is ADDITIVE ONLY.
        - It does NOT replace any MediaPipe output.
        - It does NOT modify VisionAnalyzer, EmotionDetector, or any existing class.
        - If DeepFace is unavailable or fails for any reason, the pipeline
          continues with MediaPipe-only emotion data - silently, no crash.

FIX (v3.1):
  - actions now includes "age" and "gender" so _append_frame_jsonl
    in main.py can populate those fields instead of "N/A".
  - gender dict {"Man": p, "Woman": p} is resolved to the dominant label here.
"""

import logging
import os
import threading
from typing import Optional

log = logging.getLogger("hiremind.deepface")

# FIX: Keep TensorFlow/DeepFace out of FastAPI startup. DeepFace imports
# TensorFlow, which can allocate a large amount of RAM and stall the process
# before the WebSocket receive loop is ready. These env vars are read before
# TensorFlow is imported; callers can override them in the environment.
os.environ.setdefault("CUDA_VISIBLE_DEVICES", "-1")       # CPU-only runtime; avoids CUDA probing.
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")        # Reduce noisy TF INFO/WARNING logs.
os.environ.setdefault("TF_FORCE_GPU_ALLOW_GROWTH", "true")
os.environ.setdefault("TF_NUM_INTRAOP_THREADS", "1")      # Limit CPU thread fan-out under WS load.
os.environ.setdefault("TF_NUM_INTEROP_THREADS", "1")

_DEEPFACE_LOCK = threading.Lock()
_DEEPFACE_AVAILABLE: Optional[bool] = None
_DEEPFACE_IMPORT_ERROR: Optional[Exception] = None
_DeepFace = None


def _get_deepface():
    """Lazy-load DeepFace once, only when a frame actually needs enrichment."""
    global _DEEPFACE_AVAILABLE, _DEEPFACE_IMPORT_ERROR, _DeepFace

    if _DEEPFACE_AVAILABLE is False:
        return None
    if _DeepFace is not None:
        return _DeepFace

    with _DEEPFACE_LOCK:
        if _DEEPFACE_AVAILABLE is False:
            return None
        if _DeepFace is not None:
            return _DeepFace

        try:
            from deepface import DeepFace as _LoadedDeepFace

            # FIX: If TensorFlow was imported by DeepFace, keep it CPU-only and
            # constrained. Failures here are non-fatal; the fallback behavior is
            # still to return MediaPipe-only emotion data.
            try:
                import tensorflow as tf

                try:
                    tf.config.set_visible_devices([], "GPU")
                except Exception:
                    pass
                try:
                    tf.config.threading.set_intra_op_parallelism_threads(
                        int(os.environ.get("TF_NUM_INTRAOP_THREADS", "1"))
                    )
                    tf.config.threading.set_inter_op_parallelism_threads(
                        int(os.environ.get("TF_NUM_INTEROP_THREADS", "1"))
                    )
                except Exception:
                    pass
            except Exception:
                pass

            _DeepFace = _LoadedDeepFace
            _DEEPFACE_AVAILABLE = True
            _DEEPFACE_IMPORT_ERROR = None
            log.info("[DeepFaceAnalyzer] DeepFace lazy-loaded successfully.")
            return _DeepFace
        except ImportError as exc:
            _DEEPFACE_AVAILABLE = False
            _DEEPFACE_IMPORT_ERROR = exc
            log.warning(
                "[DeepFaceAnalyzer] DeepFace not installed - running in passthrough mode. "
                "Install with:  pip install deepface"
            )
            return None
        except Exception as exc:
            _DEEPFACE_AVAILABLE = False
            _DEEPFACE_IMPORT_ERROR = exc
            log.warning("[DeepFaceAnalyzer] DeepFace lazy-load failed: %s", exc)
            return None


# -----------------------------------------------------------------------------
# Core enrichment function
# -----------------------------------------------------------------------------

def enrich_emotion(mediapipe_emotion: dict, img_rgb=None) -> dict:
    """
    Wrap the existing MediaPipe emotion result with an optional DeepFace layer.

    Returns
    -------
    dict with keys:
        "mediapipe"  - identical copy of the input (never mutated)
        "deepface"   - DeepFace result dict (emotion + age + gender), or None on failure
    """
    deepface_result = _run_deepface(img_rgb) if img_rgb is not None else None

    return {
        "mediapipe": mediapipe_emotion,
        "deepface":  deepface_result,
    }


def _run_deepface(img_rgb) -> Optional[dict]:
    """
    Run DeepFace analysis for emotion, age, and gender.
    Returns None on any error (silent fallback).

    Output structure:
        {
            "dominant_emotion": str,
            "scores":  {emotion_label: float, ...},
            "region":  {x, y, w, h},
            "age":     int | "N/A",
            "gender":  str,           # "Man" | "Woman" | "N/A"
        }
    """
    DeepFace = _get_deepface()
    if DeepFace is None:
        return None

    try:
        results = DeepFace.analyze(
            img_path          = img_rgb,
            actions           = ["emotion", "age", "gender"],   # FIX: added age + gender
            enforce_detection = False,
            silent            = True,
        )

        face = results[0] if isinstance(results, list) else results

        emotion_scores: dict = face.get("emotion", {})
        dominant: str        = face.get("dominant_emotion", "neutral")
        region: dict         = face.get("region", {})

        # Age - DeepFace returns a float, round to int
        raw_age = face.get("age", "N/A")
        age = int(round(raw_age)) if isinstance(raw_age, (int, float)) else "N/A"

        # Gender - DeepFace returns dict {"Man": prob, "Woman": prob} OR a plain string
        raw_gender = face.get("gender", "N/A")
        if isinstance(raw_gender, dict):
            gender = max(raw_gender, key=raw_gender.get)   # pick dominant
        elif isinstance(raw_gender, str):
            gender = raw_gender
        else:
            gender = "N/A"

        return {
            "dominant_emotion": dominant,
            "scores":           {k: round(float(v), 2) for k, v in emotion_scores.items()},
            "region":           region,
            "age":              age,
            "gender":           gender,
        }

    except Exception as exc:
        log.debug("[DeepFaceAnalyzer] Analysis failed (silent fallback): %s", exc)
        return None


# -----------------------------------------------------------------------------
# Compatibility helpers
# -----------------------------------------------------------------------------

def mediapipe_emotion(emotion: dict) -> dict:
    if "mediapipe" in emotion:
        return emotion["mediapipe"]
    return emotion


def deepface_dominant(emotion: dict) -> Optional[str]:
    df = emotion.get("deepface")
    if df is None:
        return None
    return df.get("dominant_emotion")


def combined_dominant(emotion: dict) -> str:
    df_label = deepface_dominant(emotion)
    if df_label:
        return df_label
    return mediapipe_emotion(emotion).get("label", "neutral")
