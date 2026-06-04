import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../components/dashboard/Sidebar";
import { Helmet } from "react-helmet-async";
import {
  getScoreByTitle,
  PROFILE_QUERY_KEY,
  useUpdateUserScore,
} from "../hooks/useUserProfile";
import { getProfile } from "../apis/userApi";
import { useQueryClient } from "@tanstack/react-query";
import { useCoachingFeedback, pickIconForText } from "../hooks/useCoachingFeedback";
import CoachingFeedbackFeed from "../components/interview/CoachingFeedbackFeed";

const INTERVIEW_WS_ORIGIN = (
  import.meta.env.VITE_INTERVIEW_WS_URL || "ws://localhost:3000"
).replace(/\/$/, "");

/* Session length — vision coach picks each question dynamically */
const INTERVIEW_QUESTION_COUNT = 15;

const QUESTION_CATEGORY = "Interview";

const TIPS = [
  "Maintain natural eye contact with the camera — look at the lens, not the screen",
  "Speak clearly and at a moderate pace; pause briefly between key points",
  "Use the STAR method (Situation, Task, Action, Result) for behavioral questions",
  "Take 3–5 seconds to think before answering — silence is a sign of composure",
  'Quantify your achievements whenever possible (e.g., "reduced query time by 40%")',
  "Keep answers between 90 seconds and 2 minutes per question",
];

const CATEGORY_COLORS = {
  Interview: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  Background: { bg: "#f5f3ff", text: "#6d28d9", border: "#ddd6fe" },
  Technical: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  "Tools & Stack": { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
  Behavioral: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
  "Problem Solving": { bg: "#fff1f2", text: "#9f1239", border: "#fecdd3" },
  Statistics: { bg: "#f0f9ff", text: "#0369a1", border: "#bae6fd" },
  Closing: { bg: "#f7fee7", text: "#3f6212", border: "#d9f99d" },
};

/* ═══════════════════════════════════════════════════════════════
   ICON HELPERS
═══════════════════════════════════════════════════════════════ */
const SvgIcon = ({ d, className = "w-5 h-5", strokeWidth = 1.8 }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={strokeWidth}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const ICON_PATHS = {
  camera:
    "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  cameraOff:
    "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z",
  mic: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z",
  micOff:
    "M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2",
  record:
    "M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z",
  pause: "M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z",
  stop: "M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z",
  next: "M9 5l7 7-7 7",
  check: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  lightbulb:
    "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
};

/* ═══════════════════════════════════════════════════════════════
   INTERNAL COMPONENTS
═══════════════════════════════════════════════════════════════ */

/* ─── PageHeader ─────────────────────────────────────────────── */
function PageHeader() {
  return (
    <div className="mb-8">
      <h1
        className="text-[26px] font-bold text-gray-900 leading-tight"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        AI Interview Simulation
      </h1>
      <p
        className="text-[14px] text-gray-400 mt-1"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        Practice your interview skills with AI-powered analysis
      </p>
    </div>
  );
}

/* ─── StatusCard — progress bar + Q counter ─────────────────── */
function StatusCard({ currentIndex, total }) {
  const pct = Math.round(((currentIndex + 1) / total) * 100);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
      <div className="flex items-center justify-between mb-4">
        {/* Left: question count */}
        <div>
          <p
            className="text-[13px] text-gray-400"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Question{" "}
            <span className="font-bold text-gray-800">{currentIndex + 1}</span>{" "}
            of <span className="font-bold text-gray-800">{total}</span>
          </p>
        </div>

        {/* Right: percentage */}
        <div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full border text-[13px] font-bold"
          style={{
            background: "#eff6ff",
            borderColor: "#bfdbfe",
            color: "#1d4ed8",
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          {pct}% Complete
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background:
              pct === 100
                ? "linear-gradient(90deg,#2563eb 0%,#10b981 100%)"
                : "#2563eb",
          }}
        />
      </div>
    </div>
  );
}

/* ─── RecordingDot — animated pulsing red dot ────────────────── */
function RecordingDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
    </span>
  );
}

/* ─── ElapsedTimer — counts up while recording ───────────────── */
function ElapsedTimer({ active }) {
  const [secs, setSecs] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (active) {
      ref.current = setInterval(() => setSecs((s) => s + 1), 1000);
    } else {
      clearInterval(ref.current);
      setSecs(0);
    }
    return () => clearInterval(ref.current);
  }, [active]);

  const mm = String(Math.floor(secs / 60)).padStart(2, "0");
  const ss = String(secs % 60).padStart(2, "0");
  return (
    <span
      className="text-[13px] font-bold text-gray-300 tabular-nums"
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      {mm}:{ss}
    </span>
  );
}

/* ─── Coaching helpers ─────────────────────────────────────────── */
function buildVisualCoaching(data = {}) {
  if (data.hints?.length) return data.hints;

  const tips = [];
  if (data.eye_away) tips.push("Look at the camera");
  if (data.slouching) tips.push("Sit up straighter — improve your posture");
  if (data.stress_level === "HIGH") {
    tips.push("You seem nervous — breathe and speak clearly");
  } else if (data.stress_level === "MEDIUM") {
    tips.push("Stay calm and speak at a steady pace");
  }
  if (data.emotion_detected === false) {
    tips.push("Face the camera in good lighting");
  }
  return tips;
}

function VideoVisualIndicators({ visual }) {
  if (!visual) return null;

  const stress = visual.stress_level || "LOW";
  const stressColor =
    stress === "HIGH"
      ? "bg-red-500"
      : stress === "MEDIUM"
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-black/55 backdrop-blur-sm rounded-full px-3 py-2">
      <span
        className={`w-2.5 h-2.5 rounded-full ${visual.eye_away ? "bg-red-500" : "bg-emerald-500"}`}
        title={visual.eye_away ? "Eye contact: away" : "Eye contact: good"}
      />
      <span
        className={`w-2.5 h-2.5 rounded-full ${visual.slouching ? "bg-amber-500" : "bg-emerald-500"}`}
        title={visual.slouching ? "Posture: slouching" : "Posture: good"}
      />
      <span
        className={`w-2.5 h-2.5 rounded-full ${stressColor}`}
        title={`Stress: ${stress}`}
      />
    </div>
  );
}

/* ─── CameraSection ──────────────────────────────────────────── */
function CameraSection({
  appendFeedback,
  appendVisualHints,
  clearFeedback,
  modelsReadyRef,
  wasRecordingRef,
  markRecording,
  onTranscript,
  onRecordingChange,
  onWsReady,
  onQuestion,
  onSessionReset,
}) {
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [recording, setRecording] = useState(false); // true = recording
  const [paused, setPaused] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [visual, setVisual] = useState(null);
  const [transcript, setTranscript] = useState(
    "Start recording to begin transcription…",
  );
  const videoRef = useRef(null);
  const wsRef = useRef(null);
  const intervalRef = useRef(null);
  const streamRef = useRef(null);
  const pausedRef = useRef(false);
  const recordingRef = useRef(false);
  const audioCtxRef = useRef(null);
  const audioProcRef = useRef(null);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    recordingRef.current = recording;
    onRecordingChange?.(recording);
  }, [recording, onRecordingChange]);

  useEffect(() => {
    if (!streamRef.current) return;
    streamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = camOn;
    });
  }, [camOn]);

  useEffect(() => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = micOn;
    });
  }, [micOn]);
  // const handleEnableCamera = async () => {
  //   try {
  //     const stream = await navigator.mediaDevices.getUserMedia({
  //       video: true,
  //       audio: true,
  //     });

  //     streamRef.current = stream;

  //     if (videoRef.current) {
  //       videoRef.current.srcObject = stream;
  //       await videoRef.current.play();
  //     }

  //     setCameraEnabled(true);
  //   } catch (err) {
  //     console.error(err);
  //     alert("Camera permission denied");
  //   }
  // };

  //  useEffect(() => {
  //   if (videoRef.current && streamRef.current) {
  //     videoRef.current.srcObject = streamRef.current;
  //   }
  // }, [cameraEnabled]);
  // useEffect(() => {
  //   console.log("videoRef:", videoRef.current);
  //   console.log("stream:", streamRef.current);
  // }, [cameraEnabled]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (!streamRef.current) return;

    const video = videoRef.current;

    video.srcObject = streamRef.current;

    const playVideo = async () => {
      try {
        await video.play();
      } catch (err) {
        console.log("Play blocked:", err);
      }
    };

    playVideo();
  }, [cameraEnabled]);

  //  const handleEnableCamera = async () => {
  //   try {
  //     const stream = await navigator.mediaDevices.getUserMedia({
  //       video: true,
  //       audio: true,
  //     });

  //     streamRef.current = stream;

  //     setCameraEnabled(true);

  //     // مهم جدًا: استنى render
  //     setTimeout(() => {
  //       if (videoRef.current) {
  //         videoRef.current.srcObject = stream;
  //         videoRef.current.play(); // 🔥 مهم في بعض browsers
  //       }
  //     }, 0);

  //   } catch (err) {
  //     console.error(err);
  //     alert("Camera permission denied");
  //   }
  // };
  const handleEnableCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await videoRef.current.play().catch((err) => {
          console.log("Play error:", err);
        });
      }

      setCameraEnabled(true);
    } catch (err) {
      console.error(err);
      appendFeedback?.(
        "Camera and microphone access denied. Please allow permissions and try again.",
        "urgent",
        "⚠",
      );
      alert("Camera permission denied");
    }
  };
  // const handleStartRecording = () => {
  //   setRecording(true);
  //   setPaused(false);
  // };
  const stopAudioCapture = () => {
    if (audioProcRef.current) {
      audioProcRef.current.disconnect();
      audioProcRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
  };

  const wsSend = (payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  };

  const handleStartRecording = () => {
    const sessionId = Math.random().toString(36).slice(2);
    clearFeedback();
    onSessionReset?.();
    setRecording(true);
    appendFeedback(
      "Loading AI models (first run takes ~30 seconds). Please wait — do not close this tab.",
      "info",
      "⏳",
    );

    const ws = new WebSocket(`${INTERVIEW_WS_ORIGIN}/ws/${sessionId}`);
    wsRef.current = ws;
    markRecording(true);

    ws.onopen = () => {
      wsSend({ type: "start_session", mode: "interview" });
      onWsReady?.(wsSend);
      startCapture();
      setPaused(false);
    };

    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (msg.type) {
        case "ping":
          if (!modelsReadyRef.current) {
            modelsReadyRef.current = true;
            appendFeedback(
              "AI coach is ready. Speak naturally — tips will appear here.",
              "success",
              "✅",
            );
          }
          break;

        case "question": {
          const data = msg.data || {};
          const text = data.question?.trim();
          if (text) {
            onQuestion?.({
              text,
              index: Number.isFinite(data.question_index)
                ? data.question_index
                : 0,
            });
          }
          break;
        }

        case "coaching_update": {
          const data = msg.data || {};
          (data.comments || []).forEach((tip) =>
            appendFeedback(tip, "info", pickIconForText(tip)),
          );
          if (data.adaptive_note) {
            appendFeedback(data.adaptive_note, "adaptive", "🧠");
          }
          break;
        }

        case "visual_update": {
          const visualData = msg.data || {};
          setVisual(visualData);
          const hints =
            visualData.hints || buildVisualCoaching(visualData);
          appendVisualHints(hints);
          break;
        }

        case "transcript_update": {
          const text = msg.data?.text || "";
          setTranscript(text);
          onTranscript?.(text);
          break;
        }

        case "session_complete": {
          const verdict = msg.data?.verdict || msg.data?.message;
          if (verdict) {
            appendFeedback(verdict, "success", "📊");
          }
          break;
        }

        default:
          break;
      }
    };

    ws.onerror = () => {
      if (wasRecordingRef.current) {
        appendFeedback(
          "Connection error — check that the AI server is running on port 3000.",
          "urgent",
          "⚠",
        );
      }
    };

    ws.onclose = () => {
      if (wasRecordingRef.current) {
        appendFeedback(
          "Connection lost — please refresh to restart.",
          "urgent",
          "⚠",
        );
      }
      setRecording(false);
      markRecording(false);
    };
  };

  const startCapture = () => {
    startVideoStreaming();
    startAudioStreaming();
  };

  const startVideoStreaming = () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    intervalRef.current = setInterval(() => {
      if (!videoRef.current || !wsRef.current) return;
      if (pausedRef.current) return;

      if (wsRef.current.readyState !== WebSocket.OPEN) return;

      canvas.width = 240;
      canvas.height = 180;

      ctx.drawImage(videoRef.current, 0, 0, 240, 180);

      canvas.toBlob(
        (blob) => {
          if (!blob) return;

          blob.arrayBuffer().then((buffer) => {
            const bytes = new Uint8Array(buffer);

            let binary = "";
            bytes.forEach((b) => (binary += String.fromCharCode(b)));

            const base64 = btoa(binary);

            wsSend({
              type: "video_frame",
              frame: base64,
            });
          });
        },
        "image/jpeg",
        0.45,
      );
    }, 1000);
  };

  const startAudioStreaming = () => {
    const stream = streamRef.current;
    const audioTrack = stream?.getAudioTracks?.()[0];
    if (!audioTrack) return;

    const TARGET_RATE = 16000;
    const CHUNK_SECS = 3;
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const nativeRate = audioCtx.sampleRate;
    const source = audioCtx.createMediaStreamSource(
      new MediaStream([audioTrack]),
    );
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);

    let pcmBuffer = new Float32Array(0);
    const bufferSize = TARGET_RATE * CHUNK_SECS;

    const resampleTo16k = (f32, fromRate) => {
      if (fromRate === TARGET_RATE) return f32;
      const ratio = fromRate / TARGET_RATE;
      const outLen = Math.round(f32.length / ratio);
      const out = new Float32Array(outLen);
      for (let i = 0; i < outLen; i++) {
        const srcIdx = i * ratio;
        const lo = Math.floor(srcIdx);
        const hi = Math.min(lo + 1, f32.length - 1);
        const frac = srcIdx - lo;
        out[i] = f32[lo] * (1 - frac) + f32[hi] * frac;
      }
      return out;
    };

    processor.onaudioprocess = (e) => {
      if (!recordingRef.current || pausedRef.current) return;

      const native = e.inputBuffer.getChannelData(0);
      const resampled = resampleTo16k(native, nativeRate);
      const merged = new Float32Array(pcmBuffer.length + resampled.length);
      merged.set(pcmBuffer);
      merged.set(resampled, pcmBuffer.length);
      pcmBuffer = merged;

      if (pcmBuffer.length >= bufferSize) {
        const toSend = pcmBuffer.slice(0, bufferSize);
        pcmBuffer = pcmBuffer.slice(bufferSize);
        const int16 = new Int16Array(toSend.length);
        for (let i = 0; i < toSend.length; i++) {
          const s = Math.max(-1, Math.min(1, toSend[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        const bytes = new Uint8Array(int16.buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        wsSend({
          type: "audio_chunk",
          audio: btoa(binary),
          engine: "auto",
        });
      }
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);
    audioCtxRef.current = audioCtx;
    audioProcRef.current = processor;
  };

  const handlePause = () => setPaused((p) => !p);

  const handleStop = () => {
    setRecording(false);
    setPaused(false);
    setVisual(null);
    setTranscript("Session ended.");
    markRecording(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    stopAudioCapture();

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsSend({ type: "end_session" });
      wsRef.current.close();
    }
    wsRef.current = null;
    onWsReady?.(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Camera viewport ── */}
      <div
        className="relative w-full aspect-video rounded-2xl overflow-hidden"
        style={{ background: "#0d1117" }}
      >
        {cameraEnabled ? (
          /* Camera "on" — simulated feed with animated gradient */
          <>
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at center, #1e293b 0%, #0d1117 100%)",
              }}
            />
            {/* Simulated person silhouette */}
            {/* <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 select-none">
              <div
                className="w-20 h-20 rounded-full border-2 border-gray-600 flex items-center justify-center"
                style={{ background: "#1e293b" }}
              >
                <svg
                  className="w-10 h-10 text-gray-600"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                </svg>
              </div>
              <span
                className="text-gray-600 text-[12px]"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Camera preview
              </span>
            </div> */}

            {/* real camera */}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Recording indicator top-left */}
            {recording && !paused && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
                <RecordingDot />
                <span
                  className="text-white text-[11px] font-bold"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  REC
                </span>
                <ElapsedTimer active={recording && !paused} />
              </div>
            )}

            {recording && paused && (
              <div className="absolute top-3 left-3 flex items-center gap-2 bg-amber-500/80 backdrop-blur-sm rounded-full px-3 py-1.5">
                <span
                  className="text-white text-[11px] font-bold"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  ⏸ PAUSED
                </span>
              </div>
            )}

            <VideoVisualIndicators visual={visual} />

            {/* Camera off overlay */}
            {cameraEnabled && !camOn && (
              <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center gap-2">
                <SvgIcon
                  d={ICON_PATHS.cameraOff}
                  className="w-8 h-8 text-gray-400"
                />
                <p
                  className="text-gray-400 text-[12px]"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  Camera off
                </p>
              </div>
            )}
          </>
        ) : (
          /* Camera "off" — permission state */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center">
              <SvgIcon
                d={ICON_PATHS.camera}
                className="w-7 h-7 text-gray-400"
              />
            </div>
            <div>
              <p
                className="text-[14px] font-semibold text-gray-300 mb-1"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Camera access required
              </p>
              <p
                className="text-[12px] text-gray-500 leading-relaxed"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Please grant camera and microphone permissions to begin your
                interview simulation
              </p>
            </div>
            <button
              onClick={handleEnableCamera}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-500 transition-all duration-150 hover:-translate-y-px hover:shadow-lg active:translate-y-0"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              <SvgIcon d={ICON_PATHS.camera} className="w-4 h-4" />
              Enable Camera
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
        <span className="text-base" aria-hidden="true">
          🎙️
        </span>
        <p
          className="text-[13px] text-gray-600 leading-relaxed line-clamp-2"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {transcript}
        </p>
      </div>

      {/* ── Recording controls card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
        <div className="flex items-center justify-between">
          {/* Left: mic + camera toggles */}
          <div className="flex items-center gap-2">
            {/* Mic toggle */}
            <button
              onClick={() => setMicOn((m) => !m)}
              title={micOn ? "Mute microphone" : "Unmute microphone"}
              className={[
                "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150",
                micOn
                  ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  : "bg-red-100 text-red-500 hover:bg-red-200",
              ].join(" ")}
            >
              <SvgIcon
                d={micOn ? ICON_PATHS.mic : ICON_PATHS.micOff}
                className="w-4 h-4"
              />
            </button>

            {/* Camera toggle (only when camera enabled) */}
            {cameraEnabled && (
              <button
                onClick={() => setCamOn((c) => !c)}
                title={camOn ? "Turn off camera" : "Turn on camera"}
                className={[
                  "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150",
                  camOn
                    ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    : "bg-red-100 text-red-500 hover:bg-red-200",
                ].join(" ")}
              >
                <SvgIcon
                  d={camOn ? ICON_PATHS.camera : ICON_PATHS.cameraOff}
                  className="w-4 h-4"
                />
              </button>
            )}
          </div>

          {/* Right: recording action buttons */}
          <div className="flex items-center gap-2">
            {!recording ? (
              /* Start recording */
              <button
                onClick={handleStartRecording}
                disabled={!cameraEnabled}
                className={[
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all duration-150",
                  !cameraEnabled
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-900 text-white hover:bg-gray-700 hover:-translate-y-px hover:shadow-md active:translate-y-0",
                ].join(" ")}
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                Start Recording
              </button>
            ) : (
              /* Pause + Stop */
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePause}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-100 text-amber-700 text-[13px] font-bold hover:bg-amber-200 transition-all duration-150"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  <SvgIcon d={ICON_PATHS.pause} className="w-4 h-4" />
                  {paused ? "Resume" : "Pause"}
                </button>
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-[13px] font-bold hover:bg-red-500 transition-all duration-150"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  <SvgIcon d={ICON_PATHS.stop} className="w-4 h-4" />
                  Stop
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── QuestionPanel ──────────────────────────────────────────── */
function QuestionPanel({
  questions,
  currentIndex,
  totalQuestions,
  isRecording,
  waitingForQuestion,
  advancing,
  onNext,
  onPrev,
}) {
  const question = questions[currentIndex];
  const isLast = currentIndex >= totalQuestions - 1;
  const showLoading =
    isRecording && (waitingForQuestion || advancing || !question);
  const catColors =
    CATEGORY_COLORS[question?.category] ?? CATEGORY_COLORS.Interview;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Question card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-6 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-[15px] font-bold text-gray-900"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Current Question
          </h2>
          {/* Category pill */}
          <span
            className="text-[11px] font-bold px-2.5 py-1 rounded-full border"
            style={{
              background: catColors.bg,
              color: catColors.text,
              borderColor: catColors.border,
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            {question?.category ?? QUESTION_CATEGORY}
          </span>
        </div>

        {/* Question text box with left accent border */}
        <div
          className="rounded-xl px-5 py-5 mb-6"
          style={{
            background: "#f8fafc",
            borderLeft: "3px solid #2563eb",
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          {!isRecording ? (
            <p
              className="text-[14px] text-gray-500"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Start recording to receive your first AI interview question.
            </p>
          ) : showLoading ? (
            <p
              className="text-[14px] text-gray-400 animate-pulse"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {advancing
                ? "Loading your next question from the AI coach…"
                : "Waiting for your first question from the AI coach…"}
            </p>
          ) : (
            <p
              className="text-[15px] text-gray-800 leading-relaxed font-medium"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {question.question}
            </p>
          )}
        </div>

        {/* Question counter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <div
              key={i}
              className={[
                "w-2 h-2 rounded-full transition-all duration-300",
                i === currentIndex
                  ? "bg-blue-600 scale-125"
                  : i < currentIndex
                    ? "bg-emerald-400"
                    : "bg-gray-200",
              ].join(" ")}
            />
          ))}
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between gap-3">
        {/* Previous */}
        <div>
          {currentIndex > 0 && (
            <button
              onClick={onPrev}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Previous
            </button>
          )}
        </div>

        {/* Next / Finish */}
        <button
          onClick={onNext}
          disabled={!isRecording || showLoading}
          className={[
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-150",
            !isRecording || showLoading
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : isLast
                ? "bg-emerald-600 text-white hover:bg-emerald-500 hover:-translate-y-px hover:shadow-md active:translate-y-0"
                : "bg-gray-900 text-white hover:bg-gray-700 hover:-translate-y-px hover:shadow-md active:translate-y-0",
          ].join(" ")}
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {isLast ? (
            <>
              <SvgIcon d={ICON_PATHS.check} className="w-4 h-4" />
              Finish Interview
            </>
          ) : advancing ? (
            "Loading…"
          ) : (
            <>
              Next Question
              <SvgIcon d={ICON_PATHS.next} className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Upcoming — next question is chosen by vision coach */}
      {!isLast && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <p
            className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Up Next
          </p>
          <p
            className="text-[13px] text-gray-500 leading-relaxed"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Your AI coach will pick the next question based on how you are doing.
          </p>
          <span
            className="inline-block mt-2 text-[11px] font-semibold text-gray-400"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Question {currentIndex + 2} of {totalQuestions}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── TipsCard — static prep tips (backend has no separate tips list) ─ */
function TipsCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
          <SvgIcon
            d={ICON_PATHS.lightbulb}
            className="w-4 h-4 text-amber-600"
          />
        </div>
        <h3
          className="text-[15px] font-bold text-gray-900"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Interview Tips
        </h3>
      </div>

      <ul className="flex flex-col gap-2.5">
        {TIPS.map((tip, i) => (
          <li key={i} className="flex items-start gap-3">
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center mt-0.5 text-[10px] font-bold text-amber-600"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {i + 1}
            </span>
            <span
              className="text-[13px] text-gray-600 leading-relaxed"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {tip}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── FinishedBanner ─────────────────────────────────────────── */
function FinishedBanner({ onRestart, goNext }) {
  return (
    <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm px-8 py-10 text-center animate-fade-up">
      <div className="text-5xl mb-4">🎉</div>
      <h2
        className="text-[22px] font-bold text-gray-900 mb-2"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        Interview Complete!
      </h2>
      <p
        className="text-[14px] text-gray-500 max-w-sm mx-auto mb-8 leading-relaxed"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        You've answered all {INTERVIEW_QUESTION_COUNT} questions. Your
        responses are ready for AI analysis.
      </p>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button
          onClick={onRestart}
          className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Redo Interview
        </button>
        <button
          onClick={() => goNext?.()}
          className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-[13px] font-bold hover:bg-emerald-500 hover:-translate-y-px hover:shadow-md transition-all"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          View My Report →
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AIInterviewPage — MAIN EXPORT
   Props:
     userData {object}
     goNext   {Function} — navigate to Report page
     goBack   {Function} — navigate back
     onLogout {Function} — sidebar logout
═══════════════════════════════════════════════════════════════ */
export default function AIInterviewPage({
  userData = {},
  goNext,
  goBack,
  onLogout,
  onNavigate,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [waitingForQuestion, setWaitingForQuestion] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const queryClient = useQueryClient();
  const updateScore = useUpdateUserScore();
  const {
    messages: feedbackMessages,
    appendFeedback,
    appendVisualHints,
    clearFeedback,
    modelsReadyRef,
    wasRecordingRef,
    markRecording,
  } = useCoachingFeedback();

  const total = INTERVIEW_QUESTION_COUNT;
  const wsSendRef = useRef(null);

  const resetInterviewSession = () => {
    setQuestions([]);
    setCurrentIndex(0);
    setWaitingForQuestion(true);
    setAdvancing(false);
  };

  const handleQuestionFromServer = ({ text, index }) => {
    const entry = {
      id: index + 1,
      category: QUESTION_CATEGORY,
      question: text,
    };
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = entry;
      return next;
    });
    setCurrentIndex(index);
    setWaitingForQuestion(false);
    setAdvancing(false);
  };

  const handleNext = async () => {
    if (advancing || waitingForQuestion) return;

    if (currentIndex < total - 1) {
      setAdvancing(true);
      wsSendRef.current?.({
        type: "next_question",
        answer: "",
      });
    } else {
      setFinished(true);

      const profile = await queryClient.fetchQuery({
        queryKey: PROFILE_QUERY_KEY,
        queryFn: getProfile,
      });
      const scores = profile?.scores || [];
      const cvScore = getScoreByTitle(scores, "CV");
      const assessmentScore = getScoreByTitle(scores, "Pre Assessment");
      const baseScore = cvScore * 0.8 + assessmentScore * 0.2;
      const randomOffset = Math.floor(Math.random() * 7) - 3;
      const finalScore = Math.max(
        0,
        Math.min(100, Math.round(baseScore + randomOffset)),
      );

      await updateScore.mutateAsync({
        title: "Interview",
        score: finalScore,
      });
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleRestart = () => {
    resetInterviewSession();
    setFinished(false);
  };

  return (
    <>
      <Helmet>
        <title>HireMind-AIInterview</title>
      </Helmet>
      <div
        className="flex min-h-screen bg-[#f0f4ff]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(37,99,235,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,0.03) 1px,transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      >
        {/* ── Sidebar ── */}
        <Sidebar
          activeKey="interview"
          onNavigate={onNavigate}
          onLogout={onLogout}
        />

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
          <div className="max-w-6xl mx-auto px-5 lg:px-8 py-8 flex flex-col gap-6">
            {/* Page header */}
            <PageHeader />

            {/* Status card */}
            {!finished && (
              <StatusCard currentIndex={currentIndex} total={total} />
            )}

            {finished ? (
              /* Finished state */
              <FinishedBanner onRestart={handleRestart} goNext={goNext} />
            ) : (
              /* Two-column main content */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                <CameraSection
                  appendFeedback={appendFeedback}
                  appendVisualHints={appendVisualHints}
                  clearFeedback={clearFeedback}
                  modelsReadyRef={modelsReadyRef}
                  wasRecordingRef={wasRecordingRef}
                  markRecording={markRecording}
                  onRecordingChange={setIsRecording}
                  onSessionReset={resetInterviewSession}
                  onQuestion={handleQuestionFromServer}
                  onWsReady={(send) => {
                    wsSendRef.current = send;
                  }}
                />

                <div className="flex flex-col gap-4 min-h-0">
                  <QuestionPanel
                    questions={questions}
                    currentIndex={currentIndex}
                    totalQuestions={total}
                    isRecording={isRecording}
                    waitingForQuestion={waitingForQuestion}
                    advancing={advancing}
                    onNext={handleNext}
                    onPrev={handlePrev}
                  />
                  {isRecording && <TipsCard />}
                  <CoachingFeedbackFeed
                    messages={feedbackMessages}
                    isLive={isRecording}
                  />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
