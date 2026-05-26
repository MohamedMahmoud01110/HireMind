"""
HireMind — Audio Diagnostic Tool
=================================
أضف السطرين دول في process_audio() في main.py مؤقتاً عشان تحفظ
كل chunk صوت في ملف WAV وتسمعه بنفسك.

طريقة الاستخدام:
  1. ضع هذا الملف في نفس مجلد main.py
  2. في main.py، في دالة process_audio()، بعد السطر:
        audio_bytes  = base64.b64decode(data["audio"])
     أضف:
        from audio_diagnostic import save_chunk
        save_chunk(audio_bytes, engine)
  3. شغّل الـ server وتكلم
  4. افتح مجلد audio_debug/ وافتح الـ WAV files واسمعها
  5. لو الصوت مفهوم → المشكلة في Vosk/Whisper
     لو الصوت مشوش/بطيء/سريع → المشكلة في الـ resampling
     لو الصوت صامت → المشكلة في الـ microphone
"""

import wave, os, struct, time

_CHUNK_COUNT = 0
os.makedirs("audio_debug", exist_ok=True)

def save_chunk(pcm_bytes: bytes, engine: str = "auto"):
    global _CHUNK_COUNT
    _CHUNK_COUNT += 1

    # حفظ WAV خام بـ 16kHz mono int16
    path = f"audio_debug/chunk_{_CHUNK_COUNT:03d}_{engine}.wav"
    with wave.open(path, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)        # int16 = 2 bytes
        wf.setframerate(16000)
        wf.writeframes(pcm_bytes)

    # احسب RMS عشان تعرف مستوى الصوت
    n = len(pcm_bytes) // 2
    samples = struct.unpack_from(f"<{n}h", pcm_bytes)
    rms = int((sum(s*s for s in samples) / max(n,1)) ** 0.5)
    duration = n / 16000

    print(f"[AudioDiag] Saved {path}  |  duration={duration:.1f}s  rms={rms}  bytes={len(pcm_bytes)}")
    if rms < 100:
        print(f"[AudioDiag] ⚠ WARNING: rms={rms} — الصوت صامت جداً! تأكد من الـ microphone")
    elif rms < 300:
        print(f"[AudioDiag] ⚠ WARNING: rms={rms} — الصوت ضعيف — جرب تقرب من الـ mic")
    else:
        print(f"[AudioDiag] ✓ rms={rms} — مستوى الصوت طبيعي")

    # توقف بعد 5 chunks عشان متملاش الـ disk
    if _CHUNK_COUNT >= 5:
        print("[AudioDiag] 5 chunks محفوظين. افصل الـ diagnostic من الكود.")
