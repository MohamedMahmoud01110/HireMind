import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/dashboard/Sidebar";
import { analyzeCv } from "../apis/analyzeCvApi";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Helmet } from "react-helmet-async";
import FeatureAlreadyTakenModal from "../components/FeatureAlreadyTakenModal";
import {
  useClearUserScore,
  useUpdateUserScore,
  useUserProfile,
} from "../hooks/useUserProfile";
import {
  FEATURES,
  getFeatureScore,
  hasActivePlan,
  hasAttemptedFeature,
} from "../utils/featureAccess";
/* ═══════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════ */
const ACCEPTED = ".pdf,.doc,.docx";
const MAX_MB = 5;

const ANALYSIS_RESULT = {
  score: 78,
  sections: [
    { label: "Contact Info", score: 95, status: "great" },
    { label: "Work Experience", score: 82, status: "good" },
    { label: "Skills Section", score: 74, status: "good" },
    { label: "Education", score: 90, status: "great" },
    { label: "Summary / Objective", score: 55, status: "improve" },
    { label: "Keywords Match", score: 60, status: "improve" },
  ],
  strengths: [
    "Clear and consistent formatting",
    "Quantified achievements in work experience",
    "Relevant skills clearly listed",
    "Education section well structured",
  ],
  improvements: [
    "Add a stronger professional summary (2–3 sentences)",
    "Include more industry-specific keywords",
    "Add links to portfolio or LinkedIn profile",
    "Consider adding certifications or courses",
  ],
};

/* ═══════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════ */
function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getScoreColor(score) {
  if (score >= 80)
    return { bar: "#10b981", bg: "#ecfdf5", text: "#065f46", label: "Great" };
  if (score >= 60)
    return { bar: "#2563eb", bg: "#eff6ff", text: "#1d4ed8", label: "Good" };
  return { bar: "#f59e0b", bg: "#fffbeb", text: "#92400e", label: "Improve" };
}

/* ═══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════════════════ */

/* ─── PageHeader ─────────────────────────────────────────────── */
function PageHeader() {
  return (
    <div className="mb-8">
      <h1
        className="text-[26px] font-bold text-gray-900 leading-tight"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        CV Analysis
      </h1>
      <p
        className="text-[14px] text-gray-400 mt-1"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        Upload your CV and get instant AI-powered analysis
      </p>
    </div>
  );
}

/* ─── UploadSection ──────────────────────────────────────────── */
function UploadSection({ file, onFile, onRemove }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (f) => {
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) {
      alert(`File too large. Maximum size is ${MAX_MB} MB.`);
      return;
    }
    onFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2
            className="text-[15px] font-bold text-gray-900"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Upload Your CV
          </h2>
          <p
            className="text-[13px] text-gray-400 mt-0.5"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Supported formats: PDF, DOC, DOCX — max 5 MB
          </p>
        </div>
        {file && (
          <button
            onClick={onRemove}
            className="text-[12px] font-semibold text-red-400 hover:text-red-600 transition-colors flex items-center gap-1"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            Remove
          </button>
        )}
      </div>

      {/* ── Drop zone ── */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload CV"
        onClick={() => inputRef.current.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={[
          "relative w-full rounded-2xl border-2 border-dashed cursor-pointer",
          "flex flex-col items-center justify-center transition-all duration-200",
          "py-14 px-6",
          file
            ? "border-emerald-300 bg-emerald-50"
            : dragging
              ? "border-blue-500 bg-blue-50 scale-[1.01]"
              : "border-gray-200 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/40",
        ].join(" ")}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          onChange={(e) => handleFile(e.target.files[0])}
          className="hidden"
          aria-hidden="true"
        />

        {file ? (
          /* ── Uploaded state ── */
          <div className="flex flex-col items-center gap-3 animate-fade-up">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-3xl shadow-sm">
              📄
            </div>
            <div className="text-center">
              <p
                className="text-[15px] font-bold text-emerald-700 max-w-[280px] truncate"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                {file.name}
              </p>
              <p
                className="text-[13px] text-emerald-500 mt-0.5"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                {formatSize(file.size)}
              </p>
            </div>
            <span
              className="text-[12px] text-emerald-400 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full font-semibold"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              ✅ Ready to analyze — click to replace
            </span>
          </div>
        ) : (
          /* ── Empty state ── */
          <div className="flex flex-col items-center gap-3">
            {/* Animated upload icon */}
            <div
              className={[
                "w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-all duration-200",
                dragging ? "bg-blue-100 scale-110" : "bg-gray-100",
              ].join(" ")}
            >
              {dragging ? "📥" : "📎"}
            </div>
            <div className="text-center">
              <p
                className="text-[15px] font-semibold text-gray-700 mb-1"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Drag & drop your CV here, or{" "}
                <span className="text-blue-600 underline underline-offset-2">
                  browse
                </span>
              </p>
              <p
                className="text-[13px] text-gray-400"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                PDF, DOC, DOCX — max {MAX_MB} MB
              </p>
            </div>

            {/* Accepted format pills */}
            <div className="flex items-center gap-2 mt-1">
              {["PDF", "DOC", "DOCX"].map((fmt) => (
                <span
                  key={fmt}
                  className="text-[11px] font-bold text-gray-400 bg-white border border-gray-200 px-2.5 py-0.5 rounded-full"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  {fmt}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── AnalyzeButton ──────────────────────────────────────────── */
function AnalyzeButton({ disabled, loading, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        "w-full py-3.5 rounded-xl text-[15px] font-bold flex items-center justify-center gap-2.5",
        "transition-all duration-200 focus:outline-none",
        disabled || loading
          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
          : "bg-gray-900 text-white hover:bg-gray-700 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0",
      ].join(" ")}
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      {loading ? (
        <>
          <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
          Analyzing your CV…
        </>
      ) : (
        <>
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          {disabled ? "Upload a CV to analyze" : "Analyze CV"}
        </>
      )}
    </button>
  );
}

/* ─── OverallScoreRing ───────────────────────────────────────── */
function OverallScoreRing({ score }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const { bar, text, label } = getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth="10"
          />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={bar}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-[28px] font-bold leading-none"
            style={{ color: text, fontFamily: "'Manrope', sans-serif" }}
          >
            {score}
          </span>
          <span
            className="text-[12px] text-gray-400 font-semibold"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            / 100
          </span>
        </div>
      </div>
      <span
        className="text-[12px] font-bold px-3 py-1 rounded-full"
        style={{
          background: getScoreColor(score).bg,
          color: text,
          fontFamily: "'Manrope', sans-serif",
        }}
      >
        {label} Score
      </span>
    </div>
  );
}

/* ─── SectionScoreRow ────────────────────────────────────────── */
function SectionScoreRow({ label, score }) {
  const { bar, text, bg } = getScoreColor(score);
  return (
    <div className="flex items-center gap-3">
      <span
        className="text-[13px] text-gray-600 w-44 flex-shrink-0 truncate"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        {label}
      </span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: bar }}
        />
      </div>
      <span
        className="text-[11px] font-bold w-8 text-right"
        style={{ color: text, fontFamily: "'Manrope', sans-serif" }}
      >
        {score}
      </span>
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
        style={{
          background: bg,
          color: text,
          fontFamily: "'Manrope', sans-serif",
        }}
      >
        {getScoreColor(score).label}
      </span>
    </div>
  );
}

/* ─── AnalysisResults ────────────────────────────────────────── */
function AnalysisResults({ file, result, handleAnalyze, handleDownload }) {
  return (
    <div className="flex flex-col gap-5 animate-fade-up">
      {/* ── Score overview card ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-6">
        <div className="flex flex-col sm:flex-row items-center gap-8">
          {/* Ring */}
          <div className="flex-shrink-0">
            <OverallScoreRing score={result.score} />
          </div>

          {/* Section breakdown */}
          <div className="flex-1 w-full">
            <h3
              className="text-[14px] font-bold text-gray-900 mb-4"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Section Breakdown
            </h3>
            <div className="flex flex-col gap-3">
              {result.sections.map((s) => (
                <SectionScoreRow
                  key={s.label}
                  label={s.label}
                  score={s.score}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Strengths & Improvements ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Strengths */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">💪</span>
            <h3
              className="text-[14px] font-bold text-gray-900"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Strengths
            </h3>
          </div>
          <ul className="flex flex-col gap-2.5">
            {result.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg
                    className="w-2.5 h-2.5 text-emerald-600"
                    fill="none"
                    viewBox="0 0 10 10"
                  >
                    <path
                      d="M2 5l2 2 4-3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🔧</span>
            <h3
              className="text-[14px] font-bold text-gray-900"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Improvements
            </h3>
          </div>
          <ul className="flex flex-col gap-2.5">
            {result.improvements.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center">
                  <svg
                    className="w-2.5 h-2.5 text-amber-600"
                    fill="none"
                    viewBox="0 0 10 10"
                  >
                    <path
                      d="M5 3v3M5 7.5v.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
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

      {/* ── Actions bar ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-base">
            📄
          </div>
          <div>
            <p
              className="text-[13px] font-semibold text-gray-800 max-w-[200px] truncate"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {file.name}
            </p>
            <p className="text-[11px] text-gray-400">{formatSize(file.size)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-4 py-2 rounded-xl text-[13px] font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-all"
            style={{ fontFamily: "'Manrope', sans-serif" }}
            onClick={handleDownload}
          >
            Download Report
          </button>
          <button
            className="px-4 py-2 rounded-xl text-[13px] font-semibold bg-gray-900 text-white hover:bg-gray-700 transition-all"
            style={{ fontFamily: "'Manrope', sans-serif" }}
            onClick={handleAnalyze}
          >
            Re-analyze →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   CVAnalysisPage
═══════════════════════════════════════════════════════════════ */
export default function CVAnalysisPage({
  userData = {},
  onLogout,
  onNavigate,
}) {
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useUserProfile();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showTakenModal, setShowTakenModal] = useState(false);
  const [retakeUnlocked, setRetakeUnlocked] = useState(false);
  const [isRetakeLoading, setIsRetakeLoading] = useState(false);
  const reportRef = useRef();
  const updateScore = useUpdateUserScore();
  const clearScore = useClearUserScore();
  const cvScore = getFeatureScore(profile?.scores, FEATURES.CV);

  const alreadyTaken =
    hasAttemptedFeature(profile?.scores, FEATURES.CV) && !retakeUnlocked;

  useEffect(() => {
    if (!profileLoading && alreadyTaken) {
      setShowTakenModal(true);
    }
  }, [profileLoading, alreadyTaken]);

  const handleFile = (f) => {
    setFile(f);
    setResult(null);
  };

  const handleRemove = () => {
    setFile(null);
    setResult(null);
  };
  const mapResult = (data) => {
    return {
      score: data.final_score || 0,

      sections: [
        { label: "Skills", score: data.score_breakdown?.skills || 0 },
        { label: "Experience", score: data.score_breakdown?.experience || 0 },
        { label: "Education", score: data.score_breakdown?.education || 0 },
      ],

      strengths: data.strengths || [],
      improvements: data.recommendations || [],
    };
  };
  const handleRetake = async () => {
    if (!hasActivePlan(profile)) {
      navigate("/payment");
      return;
    }

    try {
      setIsRetakeLoading(true);
      await clearScore.mutateAsync(FEATURES.CV);
      setRetakeUnlocked(true);
      setShowTakenModal(false);
      setResult(null);
      setFile(null);
    } finally {
      setIsRetakeLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!file || alreadyTaken) return;

    setLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await analyzeCv(formData);

      const mapped = mapResult(res.data);
      setResult(mapped);

      await updateScore.mutateAsync({
        title: "CV",
        score: res.data.final_score || 0,
      });
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!reportRef.current) return;
    document.body.style.zoom = "1"; // مهم

    const canvas = await html2canvas(reportRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("cv-analysis-report.pdf");
  };

  return (
    <>
      <Helmet>
        <title>HireMind-CVAnalysis</title>
      </Helmet>
      <FeatureAlreadyTakenModal
        open={showTakenModal}
        title="CV Analysis Already Completed"
        message="You have already analyzed your CV."
        score={cvScore ?? 0}
        onClose={() => navigate("/dashboard")}
        onRetake={handleRetake}
        isRetakeLoading={isRetakeLoading}
      />

      <div
        className="flex min-h-screen bg-[#f0f4ff]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(37,99,235,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,0.03) 1px,transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      >
        {/* ── Sidebar ── */}
        <Sidebar activeKey="cv" onNavigate={onNavigate} onLogout={onLogout} />

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
          <div className="max-w-3xl mx-auto px-5 lg:px-8 py-8 flex flex-col gap-6">
            {/* Header */}
            <PageHeader />

            {/* Upload section */}
            <UploadSection
              file={file}
              onFile={handleFile}
              onRemove={handleRemove}
            />

            {/* Analyze button */}
            <AnalyzeButton
              disabled={!file || alreadyTaken}
              loading={loading}
              onClick={handleAnalyze}
            />

            {/* Analysis results */}
            {result && (
              <div ref={reportRef}>
                <AnalysisResults
                  file={file}
                  result={result}
                  handleDownload={handleDownload}
                  handleAnalyze={handleAnalyze}
                />
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
