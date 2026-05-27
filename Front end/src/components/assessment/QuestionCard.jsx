import React from "react";

/* ─── Option labels ─────────────────────────────────────────── */
const LABELS = ["A", "B", "C", "D"];

/* ─── OptionButton ───────────────────────────────────────────── */
function OptionButton({ label, text, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full flex items-center gap-4 px-5 py-4 rounded-xl border-[1.5px]",
        "text-left transition-all duration-150 focus:outline-none group",
        selected
          ? "border-blue-600 bg-blue-50 shadow-sm"
          : "border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm",
      ].join(" ")}
    >
      {/* Letter badge */}
      <span
        className={[
          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-bold transition-all duration-150",
          selected
            ? "bg-blue-600 text-white"
            : "bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600",
        ].join(" ")}
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        {label}
      </span>

      {/* Option text */}
      <span
        className={[
          "flex-1 text-[14px] leading-relaxed transition-colors duration-150",
          selected ? "font-semibold text-blue-800" : "text-gray-700",
        ].join(" ")}
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        {text}
      </span>

      {/* Selected checkmark */}
      {selected && (
        <svg
          className="flex-shrink-0 w-5 h-5 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )}
    </button>
  );
}

/* ─── QuestionCard ───────────────────────────────────────────── */
/**
 * @param {{ difficulty, skill, text, options }} questionData
 * @param {number|null}  selectedAnswer  - index of selected option (0–3) or null
 * @param {Function}     onSelect        - called with option index
 * @param {number}       questionIndex   - 0-based index (for animation key)
 */
export default function QuestionCard({
  questionData,
  selectedAnswer,
  onSelect,
  questionIndex,
}) {
  return (
    <div
      key={questionIndex} // remounts on question change → triggers fresh animation
      className="bg-white  rounded-2xl border border-gray-100 shadow-sm px-6 py-7 animate-fade-up"
    >
      {/* Category pill */}
      <div className="mb-5 flex justify-between items-center">
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-100"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {questionData.skill}
        </span>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border
            ${
              questionData.difficulty === "easy"
                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                : questionData.difficulty === "medium"
                  ? "bg-amber-50 text-amber-600 border-amber-100"
                  : "bg-red-50 text-red-600 border-red-100"
            }
          `}
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          {questionData.difficulty}
        </span>
      </div>

      {/* Question text */}
      <h2
        className="text-[17px] font-bold text-gray-900 leading-relaxed mb-7"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        {questionData.text}
      </h2>

      {/* Options */}
      <div className="flex flex-col gap-3">
        {questionData.options.map((opt, i) => (
          <OptionButton
            key={i}
            label={LABELS[i]}
            text={opt}
            selected={selectedAnswer === i}
            onClick={() => onSelect(i)}
          />
        ))}
      </div>

      {/* No-selection hint */}
      {selectedAnswer === null && (
        <p
          className="mt-4 text-[12px] text-gray-300 text-center"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Select an answer to continue
        </p>
      )}
    </div>
  );
}
