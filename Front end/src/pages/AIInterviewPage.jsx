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

/* ═══════════════════════════════════════════════════════════════
   DATA — Data Analyst Interview Questions
═══════════════════════════════════════════════════════════════ */
const INTERVIEW_QUESTIONS = [
  {
    id: 1,
    category: "Background",
    question:
      "Tell me about yourself and your experience as a Data Analyst. What drew you to this field?",
  },
  {
    id: 2,
    category: "Technical",
    question:
      "Walk me through your data analysis process from receiving a raw dataset to delivering insights to stakeholders.",
  },
  {
    id: 3,
    category: "Technical",
    question:
      "Describe a complex SQL query you have written. What was the business problem it solved?",
  },
  {
    id: 4,
    category: "Technical",
    question:
      "How do you handle missing or inconsistent data in a dataset? Walk me through your approach.",
  },
  {
    id: 5,
    category: "Technical",
    question:
      "What is the difference between supervised and unsupervised machine learning? Can you give an example of each?",
  },
  {
    id: 6,
    category: "Tools & Stack",
    question:
      "Which BI tools have you used (e.g., Tableau, Power BI, Looker)? Describe a dashboard you built and its impact.",
  },
  {
    id: 7,
    category: "Tools & Stack",
    question:
      "How do you use Python or R for data analysis? What libraries are part of your typical workflow?",
  },
  {
    id: 8,
    category: "Behavioral",
    question:
      "Tell me about a time when your analysis led to a significant business decision. What was the outcome?",
  },
  {
    id: 9,
    category: "Behavioral",
    question:
      "Describe a situation where you disagreed with a stakeholder about data interpretation. How did you handle it?",
  },
  {
    id: 10,
    category: "Behavioral",
    question:
      "Tell me about a project where you had to work with a very tight deadline. How did you prioritize and deliver?",
  },
  {
    id: 11,
    category: "Problem Solving",
    question:
      "If our sales are declining month over month, how would you investigate this problem using data?",
  },
  {
    id: 12,
    category: "Problem Solving",
    question:
      "How would you measure the success of a newly launched product feature? What metrics would you track?",
  },
  {
    id: 13,
    category: "Statistics",
    question:
      "Explain the concept of A/B testing. How do you determine if results are statistically significant?",
  },
  {
    id: 14,
    category: "Statistics",
    question:
      "What is the difference between correlation and causation? How do you communicate this distinction to non-technical stakeholders?",
  },
  {
    id: 15,
    category: "Closing",
    question:
      "Where do you see the data analytics field heading in the next 3 years, and how are you preparing for those changes?",
  },
];

const TIPS = [
  "Maintain natural eye contact with the camera — look at the lens, not the screen",
  "Speak clearly and at a moderate pace; pause briefly between key points",
  "Use the STAR method (Situation, Task, Action, Result) for behavioral questions",
  "Take 3–5 seconds to think before answering — silence is a sign of composure",
  'Quantify your achievements whenever possible (e.g., "reduced query time by 40%")',
  "Keep answers between 90 seconds and 2 minutes per question",
];

const CATEGORY_COLORS = {
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
function getCoachingIcon(text) {
  const t = text.toLowerCase();
  if (t.includes("eye") || t.includes("camera") || t.includes("contact")) {
    return "👁️";
  }
  if (t.includes("nervous") || t.includes("calm") || t.includes("breathe")) {
    return "🧘";
  }
  if (t.includes("posture") || t.includes("sit") || t.includes("straight")) {
    return "🧍";
  }
  if (
    t.includes("speak") ||
    t.includes("clear") ||
    t.includes("pace") ||
    t.includes("speed") ||
    t.includes("voice")
  ) {
    return "🎙️";
  }
  if (t.includes("smile") || t.includes("energy") || t.includes("engage")) {
    return "✨";
  }
  return "💡";
}

function formatCoachingLine(text) {
  if (!text) return "";
  const trimmed = text.trim();
  if (!trimmed) return "";
  const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

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

function mergeCoachingComments(comments = [], visualHints = []) {
  const seen = new Set();
  return [...visualHints, ...comments].filter((line) => {
    const key = line.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function VisualStatusPill({ label, status, tone = "neutral" }) {
  const tones = {
    good: "bg-emerald-100 text-emerald-800 border-emerald-200",
    warn: "bg-amber-100 text-amber-800 border-amber-200",
    bad: "bg-red-100 text-red-800 border-red-200",
    neutral: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${tones[tone]}`}
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          tone === "good"
            ? "bg-emerald-500"
            : tone === "warn"
              ? "bg-amber-500"
              : tone === "bad"
                ? "bg-red-500"
                : "bg-slate-400"
        }`}
      />
      {label}: {status}
    </span>
  );
}

function VisualStatusRow({ visual }) {
  if (!visual) return null;

  const stress = visual.stress_level || "LOW";
  const stressTone =
    stress === "HIGH" ? "bad" : stress === "MEDIUM" ? "warn" : "good";
  const stressLabel =
    stress === "HIGH" ? "High" : stress === "MEDIUM" ? "Medium" : "Low";

  return (
    <div className="flex flex-wrap gap-2">
      <VisualStatusPill
        label="Eye contact"
        status={visual.eye_away ? "Look at camera" : "Good"}
        tone={visual.eye_away ? "warn" : "good"}
      />
      <VisualStatusPill
        label="Posture"
        status={visual.slouching ? "Needs work" : "Good"}
        tone={visual.slouching ? "warn" : "good"}
      />
      <VisualStatusPill label="Stress" status={stressLabel} tone={stressTone} />
    </div>
  );
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

/* ─── LiveCoachingPanel ────────────────────────────────────────── */
function LiveCoachingPanel({ coaching, recording, visible }) {
  const { comments = [], adaptiveNote, visual, visualHints = [] } = coaching;
  const mergedComments = mergeCoachingComments(comments, visualHints);
  const hasTips = mergedComments.length > 0 || Boolean(adaptiveNote);
  const allClear =
    visual &&
    !visual.eye_away &&
    !visual.slouching &&
    (visual.stress_level || "LOW") === "LOW";

  if (!visible) return null;

  return (
    <div
      className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-blue-50 shadow-sm overflow-hidden animate-fade-up"
      role="status"
      aria-live="polite"
      aria-label="Live AI coaching feedback"
    >
      <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-violet-100/80 bg-white/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center text-base">
            🤖
          </div>
          <div>
            <p
              className="text-[13px] font-bold text-gray-900 leading-none"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Live AI Coach
            </p>
            <p
              className="text-[11px] text-violet-600 mt-0.5"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Real-time interview guidance
            </p>
          </div>
        </div>
        {recording && (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wide"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Live
          </span>
        )}
      </div>

      <div className="px-5 py-4 flex flex-col gap-3">
        <VisualStatusRow visual={visual} />

        {!visual && !hasTips && (
          <p
            className="text-[13px] text-gray-500 text-center py-2"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Analyzing your camera feed…
          </p>
        )}

        {allClear && !hasTips && visual && (
          <div className="flex items-center gap-2 rounded-xl px-4 py-3 bg-emerald-50 border border-emerald-200">
            <span className="text-lg">✅</span>
            <p
              className="text-[13px] font-semibold text-emerald-800"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Looking good — keep steady eye contact and posture.
            </p>
          </div>
        )}

        {adaptiveNote && (
          <div
            className="flex items-start gap-3 rounded-xl px-4 py-3.5 border"
            style={{
              background: "#fffbeb",
              borderColor: "#fde68a",
            }}
          >
            <span className="text-lg flex-shrink-0 mt-0.5" aria-hidden="true">
              ⚡
            </span>
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Coach insight
              </p>
              <p
                className="text-[14px] font-semibold text-amber-900 leading-snug"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                {formatCoachingLine(adaptiveNote)}
              </p>
            </div>
          </div>
        )}

        {mergedComments.length > 0 && (
          <ul className="flex flex-col gap-2">
            {mergedComments.map((comment, index) => (
              <li
                key={`${comment}-${index}`}
                className="flex items-start gap-3 rounded-xl px-4 py-3 bg-white/80 border border-violet-100"
              >
                <span
                  className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-base flex-shrink-0"
                  aria-hidden="true"
                >
                  {getCoachingIcon(comment)}
                </span>
                <p
                  className="text-[13px] text-gray-700 leading-relaxed pt-1"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  {formatCoachingLine(comment)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ─── CameraSection ──────────────────────────────────────────── */
function CameraSection() {
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [recording, setRecording] = useState(false); // true = recording
  const [paused, setPaused] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [coaching, setCoaching] = useState({
    comments: [],
    adaptiveNote: null,
    visual: null,
    visualHints: [],
  });
  const videoRef = useRef(null);
  const wsRef = useRef(null);
  const intervalRef = useRef(null);
  const streamRef = useRef(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  // const handleEnableCamera = () => setCameraEnabled(true);
  useEffect(() => {
    if (!streamRef.current) return;
    streamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = camOn;
    });
  }, [camOn]);
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
      alert("Camera permission denied");
    }
  };
  // const handleStartRecording = () => {
  //   setRecording(true);
  //   setPaused(false);
  // };
  const handleStartRecording = () => {
    const sessionId = Math.random().toString(36).slice(2);

    const ws = new WebSocket(`ws://localhost:3000/ws/${sessionId}`);

    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to AI");

      ws.send(
        JSON.stringify({
          type: "start_session",
        }),
      );

      startVideoStreaming();

      setRecording(true);
      setPaused(false);
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case "question":
          break;

        case "coaching_update":
          setCoaching((prev) => ({
            ...prev,
            comments: msg.data.comments || [],
            adaptiveNote: msg.data.adaptive_note || null,
          }));
          break;

        case "visual_update": {
          // console.log(msg.data);

          const visual = msg.data || {};
          setCoaching((prev) => ({
            ...prev,
            visual,
            visualHints: buildVisualCoaching(visual),
          }));
          break;
        }

        case "transcript_update":
          break;

        default:
          break;
      }
    };

    ws.onclose = () => {
      console.log("Disconnected");
    };
  };

  // send video to the AI model
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

            // console.log("sending frame");
            wsRef.current.send(
              JSON.stringify({
                type: "video_frame",
                frame: base64,
              }),
            );
          });
        },
        "image/jpeg",
        0.45,
      );
    }, 1000);
  };

  const handlePause = () => setPaused((p) => !p);

  const handleStop = () => {
    setRecording(false);
    setPaused(false);
    setCoaching({
      comments: [],
      adaptiveNote: null,
      visual: null,
      visualHints: [],
    });

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
    }
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

            <VideoVisualIndicators visual={coaching.visual} />

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

      <LiveCoachingPanel
        coaching={coaching}
        recording={recording && !paused}
        visible={recording}
      />

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
function QuestionPanel({ questions, currentIndex, onNext, onPrev }) {
  const question = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const catColors =
    CATEGORY_COLORS[question.category] ?? CATEGORY_COLORS.Technical;

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
            {question.category}
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
          <p
            className="text-[15px] text-gray-800 leading-relaxed font-medium"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {question.question}
          </p>
        </div>

        {/* Question counter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {questions.map((_, i) => (
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
          className={[
            "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-150",
            isLast
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
          ) : (
            <>
              Next Question
              <SvgIcon d={ICON_PATHS.next} className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Upcoming questions preview */}
      {!isLast && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
          <p
            className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Up Next
          </p>
          <p
            className="text-[13px] text-gray-500 leading-relaxed line-clamp-2"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {questions[currentIndex + 1]?.question}
          </p>
          <span
            className="inline-block mt-2 text-[11px] font-semibold text-gray-400"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Question {currentIndex + 2} of {questions.length}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── TipsCard ───────────────────────────────────────────────── */
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
        You've answered all {INTERVIEW_QUESTIONS.length} questions. Your
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
  const [finished, setFinished] = useState(false);
  const [activeNav, setActiveNav] = useState("interview");
  const queryClient = useQueryClient();
  const updateScore = useUpdateUserScore();

  const total = INTERVIEW_QUESTIONS.length;

  const handleNext = async () => {
    if (currentIndex < total - 1) {
      setCurrentIndex((i) => i + 1);
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
    setCurrentIndex(0);
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
                {/* Left: camera */}
                <CameraSection />

                {/* Right: question panel */}
                <QuestionPanel
                  questions={INTERVIEW_QUESTIONS}
                  currentIndex={currentIndex}
                  onNext={handleNext}
                  onPrev={handlePrev}
                />
              </div>
            )}

            {/* Tips card — always visible */}
            <TipsCard />
          </div>
        </main>
      </div>
    </>
  );
}
