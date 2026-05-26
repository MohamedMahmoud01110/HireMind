import React, { useState } from "react";
import Sidebar from "../components/dashboard/Sidebar";
import { Helmet } from "react-helmet-async";

/* ═══════════════════════════════════════════════════════════════
   MOCK DATA
═══════════════════════════════════════════════════════════════ */
const REPORT_DATA = {
  overallScore: 76,
  cvScore: 82,
  assessmentScore: 74,
  interviewScore: 71,

  metrics: [
    {
      id: "communication",
      label: "Communication Clarity",
      icon: "💬",
      score: 80,
    },
    { id: "confidence", label: "Confidence Level", icon: "🎯", score: 72 },
    { id: "eyeContact", label: "Eye Contact", icon: "👁️", score: 65 },
    { id: "speechSpeed", label: "Speech Speed", icon: "🎙️", score: 78 },
    { id: "emotionalTone", label: "Emotional Tone", icon: "💡", score: 58 },
  ],

  strengths: [
    "Clear articulation of technical concepts to non-technical audiences",
    "Strong use of the STAR method in behavioral answers",
    "Confident body posture and consistent eye contact",
    "Well-structured and concise responses under 2 minutes",
    "Demonstrated genuine enthusiasm for the role",
  ],

  improvements: [
    'Reduce filler words ("um", "like", "you know") — detected 14 times',
    "Maintain consistent eye contact — tendency to look away when thinking",
    "Quantify achievements more often with specific numbers and metrics",
    "Slow down speech pace during technical explanations",
  ],

  insights: [
    {
      title: "Body Language Analysis",
      accent: "#2563eb",
      bg: "#eff6ff",
      border: "#bfdbfe",
      text: "Your posture was upright and professional throughout. Occasional hand gestures were natural and added emphasis. Minor tendency to look off-screen during complex questions — this can be improved by practicing with a mirror or recording yourself.",
    },
    {
      title: "Speech Pattern Analysis",
      accent: "#7c3aed",
      bg: "#f5f3ff",
      border: "#ddd6fe",
      text: "Speech rate averaged 148 words per minute, slightly above the ideal 130–145 WPM for interviews. Clarity scored high with good pronunciation. Filler word usage was the primary detractor — targeted practice can eliminate these within 2–3 weeks.",
    },
    {
      title: "Emotional Intelligence",
      accent: "#10b981",
      bg: "#ecfdf5",
      border: "#a7f3d0",
      text: 'You demonstrated self-awareness and empathy in your behavioral responses. Stress responses were moderate — you recovered well from unexpected follow-up questions. Continue developing composure techniques like the "pause and breathe" method before answering.',
    },
  ],

  tabs: {
    strengths: [
      { label: "Technical articulation was clear and well-paced" },
      { label: "STAR method applied consistently in behavioral questions" },
      { label: "Professional vocabulary and industry-appropriate language" },
      { label: "Active listening demonstrated through follow-up responses" },
      { label: "Genuine enthusiasm and cultural-fit alignment communicated" },
    ],
    weaknesses: [
      { label: "Filler word overuse disrupts answer flow (14 instances)" },
      { label: "Eye contact drops when formulating complex answers" },
      { label: "Speech pace accelerates under pressure — harder to follow" },
      { label: "Achievements often stated without quantifiable evidence" },
    ],
    technical: [
      { label: "SQL & Data Modeling", score: 85 },
      { label: "Python / Pandas", score: 78 },
      { label: "Data Visualization (Tableau)", score: 72 },
      { label: "Machine Learning Concepts", score: 64 },
      { label: "Statistics & Probability", score: 70 },
      { label: "Business Intelligence Tools", score: 80 },
    ],
    communication: [
      {
        label: "Clarity",
        score: 80,
        icon: "📢",
        desc: "Answers were well-structured and easy to follow",
      },
      {
        label: "Confidence",
        score: 72,
        icon: "🎯",
        desc: "Good but falters slightly under follow-up pressure",
      },
      {
        label: "Professionalism",
        score: 88,
        icon: "🤝",
        desc: "Tone and vocabulary consistently professional",
      },
      {
        label: "Engagement",
        score: 75,
        icon: "✨",
        desc: "Active and attentive; energy remained high",
      },
    ],
  },

  resources: [
    {
      emoji: "📚",
      title: "Interview Mastery Course",
      desc: "Comprehensive video course covering all interview types",
      badge: "Free",
    },
    {
      emoji: "🎯",
      title: "STAR Method Workbook",
      desc: "Practice sheets with 50+ behavioral question frameworks",
      badge: "Free",
    },
    {
      emoji: "🎙️",
      title: "Speech Confidence Workshop",
      desc: "Weekly live sessions to eliminate filler words",
      badge: "Premium",
    },
    {
      emoji: "💼",
      title: "Data Analyst Interview Prep",
      desc: "Role-specific question bank with AI-graded responses",
      badge: "Premium",
    },
  ],

  careerTips: [
    "Schedule at least 3 mock interviews per week until your score exceeds 85",
    "Record yourself answering common questions — watch for filler words and eye contact",
    "Network actively: 70% of jobs are filled before being publicly posted",
    "Update your LinkedIn profile with keywords from your target job descriptions",
    "Follow industry thought leaders and engage with their content weekly",
  ],
};

/* ═══════════════════════════════════════════════════════════════
   SCORE LEVEL SYSTEM
═══════════════════════════════════════════════════════════════ */
function getLevel(score) {
  if (score >= 80)
    return {
      color: "#10b981",
      light: "#ecfdf5",
      border: "#a7f3d0",
      label: "Excellent",
    };
  if (score >= 65)
    return {
      color: "#2563eb",
      light: "#eff6ff",
      border: "#bfdbfe",
      label: "Good",
    };
  if (score >= 50)
    return {
      color: "#f59e0b",
      light: "#fffbeb",
      border: "#fde68a",
      label: "Average",
    };
  return {
    color: "#ef4444",
    light: "#fef2f2",
    border: "#fecaca",
    label: "Needs Work",
  };
}

function getMessage(score) {
  if (score >= 80)
    return "Excellent performance! You're well prepared for interviews.";
  if (score >= 65) return "Good performance with room for improvement.";
  if (score >= 50) return "Average performance. Consistent practice is needed.";
  return "Needs significant improvement. Focus on fundamentals first.";
}

/* ═══════════════════════════════════════════════════════════════
   SHARED PRIMITIVES
═══════════════════════════════════════════════════════════════ */
const CARD = "bg-white rounded-2xl border border-gray-100 shadow-sm";

function SectionTitle({ children, className = "" }) {
  return (
    <h2
      className={`text-[15px] font-bold text-gray-900 ${className}`}
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      {children}
    </h2>
  );
}

function ScoreBar({ score, color, className = "" }) {
  return (
    <div
      className={`w-full h-1.5 bg-gray-100 rounded-full overflow-hidden ${className}`}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${score}%`, background: color }}
      />
    </div>
  );
}

function Pct({ score, color }) {
  return (
    <span
      className="text-[12px] font-bold"
      style={{ color, fontFamily: "'Manrope', sans-serif" }}
    >
      {score}%
    </span>
  );
}

function CheckIcon({ color = "#10b981" }) {
  return (
    <svg
      className="w-4 h-4 flex-shrink-0 mt-0.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke={color}
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg
      className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TOP SCORE CARD
═══════════════════════════════════════════════════════════════ */
function TopScoreCard({ score, label = "Overall Interview Score" }) {
  const lv = getLevel(score);
  return (
    <div
      className="rounded-2xl border shadow-sm px-8 py-8 flex flex-col items-center text-center"
      style={{ background: lv.light, borderColor: lv.border }}
    >
      {/* Score ring */}
      <div className="relative w-32 h-32 mb-5">
        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke={lv.color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 52}`}
            strokeDashoffset={`${2 * Math.PI * 52 * (1 - score / 100)}`}
            style={{
              transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-[30px] font-bold leading-none"
            style={{ color: lv.color, fontFamily: "'Manrope', sans-serif" }}
          >
            {score}
          </span>
          <span
            className="text-[11px] text-gray-400 mt-0.5"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            / 100
          </span>
        </div>
      </div>

      {/* Label */}
      <h2
        className="text-[18px] font-bold text-gray-900 mb-2"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        {label}
      </h2>

      {/* Message */}
      <p
        className="text-[14px] max-w-sm leading-relaxed"
        style={{ color: lv.color, fontFamily: "'Manrope', sans-serif" }}
      >
        {getMessage(score)}
      </p>

      {/* Level badge */}
      <span
        className="mt-4 px-4 py-1.5 rounded-full text-[12px] font-bold border"
        style={{
          background: "white",
          color: lv.color,
          borderColor: lv.border,
          fontFamily: "'Manrope', sans-serif",
        }}
      >
        {lv.label} Performance
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PERFORMANCE CARDS (5)
═══════════════════════════════════════════════════════════════ */
function MetricDesc({ score }) {
  if (score >= 80) return "Performing excellently — keep it up!";
  if (score >= 65) return "Good level — minor refinements will help.";
  if (score >= 50) return "Average — focused practice is recommended.";
  return "Needs significant work — prioritise this area.";
}

function MetricCard({ metric }) {
  const lv = getLevel(metric.score);
  return (
    <div className={`${CARD} px-5 py-5 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: lv.light }}
          >
            {metric.icon}
          </span>
          <span
            className="text-[13px] font-bold text-gray-900"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {metric.label}
          </span>
        </div>
        <Pct score={metric.score} color={lv.color} />
      </div>

      <ScoreBar score={metric.score} color={lv.color} />

      <p
        className="text-[12px] leading-relaxed"
        style={{ color: lv.color, fontFamily: "'Manrope', sans-serif" }}
      >
        <MetricDesc score={metric.score} />
      </p>

      <span
        className="self-start px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
        style={{
          background: lv.light,
          color: lv.color,
          borderColor: lv.border,
          fontFamily: "'Manrope', sans-serif",
        }}
      >
        {lv.label}
      </span>
    </div>
  );
}

function PerformanceGrid({ metrics }) {
  return (
    <div className="flex flex-col gap-4">
      <SectionTitle>Performance Breakdown</SectionTitle>
      {/* Row 1 — 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.slice(0, 3).map((m) => (
          <MetricCard key={m.id} metric={m} />
        ))}
      </div>
      {/* Row 2 — 2 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {metrics.slice(3).map((m) => (
          <MetricCard key={m.id} metric={m} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STRENGTHS & IMPROVEMENTS
═══════════════════════════════════════════════════════════════ */
function StrengthsImprovements({ strengths, improvements }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Strengths */}
      <div className={`${CARD} px-6 py-5`}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-lg">
            💪
          </div>
          <SectionTitle>Strengths</SectionTitle>
        </div>
        <ul className="flex flex-col gap-3">
          {strengths.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <CheckIcon />
              <span
                className="text-[13px] text-gray-600 leading-relaxed"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                {s}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Improvements */}
      <div className={`${CARD} px-6 py-5`}>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-lg">
            🔧
          </div>
          <SectionTitle>Areas for Improvement</SectionTitle>
        </div>
        <ul className="flex flex-col gap-3">
          {improvements.map((s, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <WarnIcon />
              <span
                className="text-[13px] text-gray-600 leading-relaxed"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                {s}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DETAILED INSIGHTS
═══════════════════════════════════════════════════════════════ */
function DetailedInsights({ insights }) {
  return (
    <div className={`${CARD} px-6 py-5`}>
      <SectionTitle className="mb-5">Detailed Insights</SectionTitle>
      <div className="flex flex-col gap-4">
        {insights.map((ins) => (
          <div
            key={ins.title}
            className="rounded-xl px-5 py-4"
            style={{
              background: ins.bg,
              borderLeft: `3px solid ${ins.accent}`,
            }}
          >
            <p
              className="text-[13px] font-bold mb-1.5"
              style={{ color: ins.accent, fontFamily: "'Manrope', sans-serif" }}
            >
              {ins.title}
            </p>
            <p
              className="text-[13px] text-gray-600 leading-relaxed"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {ins.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ACTION BUTTONS
═══════════════════════════════════════════════════════════════ */
function ActionButtons({ onViewFullReport, onPracticeAgain }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <button
        onClick={onViewFullReport}
        className="px-6 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-150"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        📋 View Full Report
      </button>
      <button
        onClick={onPracticeAgain}
        className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-[13px] font-bold hover:bg-gray-700 hover:-translate-y-px hover:shadow-md transition-all duration-150"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        🔁 Practice Again
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FULL REPORT MODE
═══════════════════════════════════════════════════════════════ */

/* Tab Switcher */
const TABS = ["Strengths", "Weaknesses", "Technical", "Communication"];

function TabSwitcher({ active, onChange }) {
  return (
    <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
      {TABS.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={[
            "flex-1 py-2 rounded-lg text-[12px] font-bold transition-all duration-150",
            active === t
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700",
          ].join(" ")}
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

/* Tab content panels */
function TabContent({ tab, data }) {
  if (tab === "Strengths") {
    return (
      <div className="flex flex-col gap-2.5">
        {data.strengths.map((s, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
            style={{ background: "#ecfdf5", border: "1px solid #a7f3d0" }}
          >
            <CheckIcon />
            <span
              className="text-[13px] text-emerald-800 leading-relaxed"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (tab === "Weaknesses") {
    return (
      <div className="flex flex-col gap-2.5">
        {data.weaknesses.map((s, i) => (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-3.5 rounded-xl"
            style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
          >
            <WarnIcon />
            <span
              className="text-[13px] text-amber-800 leading-relaxed"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (tab === "Technical") {
    return (
      <div className="flex flex-col gap-4">
        {data.technical.map((t) => {
          const lv = getLevel(t.score);
          return (
            <div key={t.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="text-[13px] font-semibold text-gray-700"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  {t.label}
                </span>
                <Pct score={t.score} color={lv.color} />
              </div>
              <ScoreBar score={t.score} color={lv.color} />
            </div>
          );
        })}
      </div>
    );
  }

  if (tab === "Communication") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.communication.map((c) => {
          const lv = getLevel(c.score);
          return (
            <div
              key={c.label}
              className={`${CARD} px-5 py-4 flex flex-col gap-2.5`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{c.icon}</span>
                  <span
                    className="text-[13px] font-bold text-gray-900"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  >
                    {c.label}
                  </span>
                </div>
                <Pct score={c.score} color={lv.color} />
              </div>
              <ScoreBar score={c.score} color={lv.color} />
              <p
                className="text-[12px] text-gray-500 leading-relaxed"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                {c.desc}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

/* Score summary cards (CV / Assessment / Interview) */
function ScoreSummaryCards({ data }) {
  const cards = [
    { label: "CV Score", score: data.cvScore, icon: "📄" },
    { label: "Assessment Score", score: data.assessmentScore, icon: "📝" },
    { label: "Interview Score", score: data.interviewScore, icon: "🎙️" },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((c) => {
        const lv = getLevel(c.score);
        return (
          <div
            key={c.label}
            className={`${CARD} px-5 py-5 flex flex-col items-center text-center gap-3`}
          >
            <span className="text-3xl">{c.icon}</span>
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                {c.label}
              </p>
              <p
                className="text-[28px] font-bold leading-none"
                style={{ color: lv.color, fontFamily: "'Manrope', sans-serif" }}
              >
                {c.score}
                <span className="text-[14px] text-gray-400 font-semibold ml-0.5">
                  %
                </span>
              </p>
            </div>
            <ScoreBar score={c.score} color={lv.color} className="w-full" />
            <span
              className="text-[11px] font-bold px-3 py-0.5 rounded-full border"
              style={{
                background: lv.light,
                color: lv.color,
                borderColor: lv.border,
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              {lv.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* Improvement Section */
function ImprovementSection({ data }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`${CARD} px-6 py-6`}>
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">🚀</div>
        <h3
          className="text-[18px] font-bold text-gray-900 mb-2"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Ready to Improve Your Skills?
        </h3>
        <p
          className="text-[13px] text-gray-500 max-w-md mx-auto"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Based on your report, we've curated resources and tips to help you
          level up fast.
        </p>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-4 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-[13px] font-bold hover:bg-blue-500 hover:-translate-y-px hover:shadow-md transition-all duration-150"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {expanded ? "✕ Hide Resources" : "✨ Improve Your Skills"}
        </button>
      </div>

      {expanded && (
        <div className="flex flex-col gap-6 animate-fade-up">
          {/* Resources */}
          <div>
            <h4
              className="text-[13px] font-bold text-gray-700 uppercase tracking-widest mb-3"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Recommended Learning Resources
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.resources.map((r) => (
                <div
                  key={r.title}
                  className="flex items-start gap-3 px-4 py-4 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <span className="text-2xl flex-shrink-0">{r.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p
                        className="text-[13px] font-bold text-gray-900 truncate"
                        style={{ fontFamily: "'Manrope', sans-serif" }}
                      >
                        {r.title}
                      </p>
                      <span
                        className="flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={
                          r.badge === "Premium"
                            ? { background: "#fef3c7", color: "#92400e" }
                            : { background: "#dcfce7", color: "#14532d" }
                        }
                      >
                        {r.badge}
                      </span>
                    </div>
                    <p
                      className="text-[12px] text-gray-500"
                      style={{ fontFamily: "'Manrope', sans-serif" }}
                    >
                      {r.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Career tips */}
          <div>
            <h4
              className="text-[13px] font-bold text-gray-700 uppercase tracking-widest mb-3"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Career Improvement Tips
            </h4>
            <ul className="flex flex-col gap-2.5">
              {data.careerTips.map((tip, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 mt-0.5"
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
        </div>
      )}
    </div>
  );
}

/* Full Report view */
function FullReport({ data, onBack, onGoPayment }) {
  const [activeTab, setActiveTab] = useState("Strengths");

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <button
        onClick={onBack}
        className="self-start flex items-center gap-1.5 text-[13px] font-semibold text-gray-500 hover:text-gray-900 transition-colors"
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
        Back to Summary
      </button>

      {/* Overall + 3 score cards */}
      <TopScoreCard score={data.overallScore} label="Overall Score" />
      <ScoreSummaryCards data={data} />

      {/* Tab switcher + content */}
      <div className={`${CARD} px-6 py-5 flex flex-col gap-5`}>
        <TabSwitcher active={activeTab} onChange={setActiveTab} />
        <TabContent tab={activeTab} data={data.tabs} />
      </div>

      {/* Improvement section */}
      <ImprovementSection data={data} />

      {/* Footer actions */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-all"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          ← Back to Dashboard
        </button>
        <button
          onClick={onGoPayment}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[13px] font-bold hover:-translate-y-px hover:shadow-lg transition-all"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          ⚡ Upgrade Plan
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MyReportPage — MAIN EXPORT
   Props:
     userData    {object}
     goBack      {Function} → back to dashboard
     goPayment   {Function} → payment page
     onLogout    {Function} → sidebar logout
═══════════════════════════════════════════════════════════════ */
export default function MyReportPage({
  userData = {},
  goBack,
  goPayment,
  onNavigate,
  onLogout,
}) {
  const [fullReport, setFullReport] = useState(false);

  const data = REPORT_DATA;

  return (
    <>
      <Helmet>
        <title>HireMind-Report</title>
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
          activeKey="report"
          onNavigate={onNavigate}
          onLogout={onLogout}
        />

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
          <div className="max-w-5xl mx-auto px-5 lg:px-8 py-8 flex flex-col gap-6">
            {fullReport ? (
              /* ══ FULL REPORT MODE ══ */
              <FullReport
                data={data}
                onBack={() => setFullReport(false)}
                onGoPayment={goPayment}
              />
            ) : (
              /* ══ SUMMARY MODE ══ */
              <>
                {/* Page header */}
                <div className="mb-2">
                  <h1
                    className="text-[26px] font-bold text-gray-900 leading-tight"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  >
                    My Report
                  </h1>
                  <p
                    className="text-[14px] text-gray-400 mt-1"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  >
                    Your complete interview performance analysis
                  </p>
                </div>

                {/* Top score card */}
                <TopScoreCard score={data.overallScore} />

                {/* Performance grid */}
                <PerformanceGrid metrics={data.metrics} />

                {/* Strengths & Improvements */}
                <StrengthsImprovements
                  strengths={data.strengths}
                  improvements={data.improvements}
                />

                {/* Detailed insights */}
                <DetailedInsights insights={data.insights} />

                {/* Action buttons */}
                <ActionButtons
                  onViewFullReport={() => setFullReport(true)}
                  onPracticeAgain={() => goBack?.()}
                />

                {/* Footer nav */}
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => goBack?.()}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] font-bold text-gray-700 hover:bg-gray-50 transition-all"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  >
                    ← Back to Dashboard
                  </button>
                  <button
                    onClick={() => goPayment?.()}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-[13px] font-bold hover:-translate-y-px hover:shadow-lg transition-all"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  >
                    ⚡ Upgrade Plan
                  </button>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
