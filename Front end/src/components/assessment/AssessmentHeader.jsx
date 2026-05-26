import React from 'react'

/* ─── Helpers ────────────────────────────────────────────────── */
function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function getTimerStyle(seconds) {
  if (seconds <= 60)  return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' } // red — urgent
  if (seconds <= 300) return { bg: '#fffbeb', border: '#fde68a', text: '#d97706' } // amber — warning
  return               { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb' }       // blue — normal
}

/* ─── ProgressBar (thin animated fill) ──────────────────────── */
export function ProgressBar({ current, total }) {
  const pct = Math.round(((current + 1) / total) * 100)

  return (
    <div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: pct === 100
              ? 'linear-gradient(90deg, #2563eb 0%, #10b981 100%)'
              : '#2563eb',
          }}
        />
      </div>
    </div>
  )
}

/* ─── AssessmentHeader ───────────────────────────────────────── */
/**
 * @param {number} currentIndex  - 0-based current question index
 * @param {number} total         - total question count
 * @param {number} timeLeft      - remaining seconds
 */
export default function AssessmentHeader({ currentIndex, total, timeLeft }) {
  const timerStyle = getTimerStyle(timeLeft)
  const isUrgent   = timeLeft <= 60

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
      {/* Top row: title left, timer right */}
      <div className="flex items-start justify-between gap-4 mb-4">

        {/* Left: title + subtitle */}
        <div>
          <h1
            className="text-[22px] font-bold text-gray-900 leading-tight"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Skills PreAssessment
          </h1>
          <p
            className="text-[13px] text-gray-400 mt-0.5"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Question{' '}
            <span className="font-bold text-gray-700">{currentIndex + 1}</span>
            {' '}of{' '}
            <span className="font-bold text-gray-700">{total}</span>
          </p>
        </div>

        {/* Right: countdown timer badge */}
        <div
          className={[
            'flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-[15px] flex-shrink-0 transition-all duration-300',
            isUrgent ? 'animate-pulse' : '',
          ].join(' ')}
          style={{
            background:   timerStyle.bg,
            borderColor:  timerStyle.border,
            color:        timerStyle.text,
            fontFamily:   "'Sora', sans-serif",
          }}
        >
          {/* Clock icon */}
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatTime(timeLeft)}
        </div>
      </div>

      {/* Bottom: progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            Progress
          </span>
          <span
            className="text-[11px] font-bold text-blue-600"
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            {Math.round(((currentIndex + 1) / total) * 100)}%
          </span>
        </div>
        <ProgressBar current={currentIndex} total={total} />
      </div>
    </div>
  )
}