import React from "react";
import Logo from "../components/Logo";
import Button from "../components/Button";
import { Helmet } from "react-helmet-async";

/* ─────────────────────────────────────────────────────────────
   Data
───────────────────────────────────────────────────────────── */
const EXPERIENCE_OPTIONS = [
  { id: "0-1", label: "0–1 Years", icon: "🌱" },
  { id: "1-3", label: "1–3 Years", icon: "📈" },
  { id: "3-5", label: "3–5 Years", icon: "💼" },
  { id: "5-10", label: "5–10 Years", icon: "🏆" },
  { id: "10+", label: "10+ Years", icon: "🎯" },
  { id: "student", label: "Student / No Experience", icon: "🎓" },
];

const TOTAL_STEPS = 4;
const CURRENT_STEP = 1;
const PROGRESS_PCT = Math.round((CURRENT_STEP / TOTAL_STEPS) * 100); // 25

/* ─────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────── */

/** Top progress bar + step label */
function ProgressBar({ step, total, pct }) {
  return (
    <div className="mb-8">
      {/* Step label row */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[13px] font-semibold text-gray-500"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Step {step} of {total}
        </span>
        <span
          className="text-[13px] font-bold text-blue-600"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {pct}%
        </span>
      </div>

      {/* Track */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        {/* Fill */}
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Single selectable option card */
function OptionCard({ option, selected, onSelect }) {
  const isSelected = selected === option.id;

  return (
    <button
      type="button"
      onClick={() => onSelect(option.id)}
      className={[
        "flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border-[1.5px]",
        "text-left font-semibold text-[13px] transition-all duration-150",
        "focus:outline-none",
        isSelected
          ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
          : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50",
      ].join(" ")}
      aria-pressed={isSelected}
    >
      {/* Icon bubble */}
      <span
        className={[
          "w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 transition-colors duration-150",
          isSelected ? "bg-blue-100" : "bg-gray-100",
        ].join(" ")}
      >
        {option.icon}
      </span>

      {/* Label */}
      <span style={{ fontFamily: "'Manrope', sans-serif" }}>
        {option.label}
      </span>

      {/* Selected checkmark */}
      {isSelected && (
        <svg
          className="ml-auto w-4 h-4 text-blue-600 flex-shrink-0"
          viewBox="0 0 16 16"
          fill="none"
        >
          <circle cx="8" cy="8" r="7" fill="#2563eb" />
          <path
            d="M5 8l2 2 4-4"
            stroke="white"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   ExperienceStep
   
   Props:
     userData    {object}   — shared multi-step form state
     setUserData {Function} — updates shared state
     goNext      {Function} — advances to next step
     goBack      {Function} — returns to previous step (unused on step 1)
───────────────────────────────────────────────────────────── */
export default function ExperienceStep({
  userData = {},
  setUserData,
  goNext,
  goBack,
}) {
  const selected = userData.experience ?? null;

  const handleSelect = (id) => {
    setUserData((prev) => ({ ...prev, experience: id }));
  };

  const handleNext = () => {
    if (!selected) return;
    goNext();
  };

  return (
    <>
      <Helmet>
        <title>HireMind-ExperienceStep</title>
      </Helmet>
      <div className="min-h-screen py-8 px-4">
        {/* ── Top bar: logo left, (back button right on steps > 1) ── */}
        <header className="max-w-[560px] mx-auto flex items-center justify-between mb-8 animate-fade-up">
          <Logo size="md" />

          {/* Back link — hidden on step 1, shown from step 2 onward */}
          {goBack && (
            <button
              type="button"
              onClick={goBack}
              className="text-[13px] font-semibold text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </button>
          )}
        </header>

        {/* ── Card ── */}
        <main
          className="card max-w-[560px] mx-auto px-8 py-8 animate-fade-up delay-50"
          aria-label="Years of experience step"
        >
          {/* Progress */}
          <ProgressBar
            step={CURRENT_STEP}
            total={TOTAL_STEPS}
            pct={PROGRESS_PCT}
          />

          {/* Title */}
          <div className="mb-6">
            <h1
              className="text-[22px] font-bold text-gray-900 leading-tight mb-2"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Years of Experience
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              How many years of professional experience do you have?
            </p>
          </div>

          {/* Options grid — 2 per row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {EXPERIENCE_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.id}
                option={opt}
                selected={selected}
                onSelect={handleSelect}
              />
            ))}
          </div>

          {/* Footer: Next button right-aligned */}
          <div className="flex items-center justify-between">
            {/* Step counter (small, left) */}
            <p className="text-[12px] text-gray-300">
              {CURRENT_STEP} / {TOTAL_STEPS} steps completed
            </p>

            {/* Next */}
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleNext}
              disabled={!selected}
              className={!selected ? "opacity-40 cursor-not-allowed" : ""}
            >
              Next
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Button>
          </div>
        </main>
      </div>
    </>
  );
}
