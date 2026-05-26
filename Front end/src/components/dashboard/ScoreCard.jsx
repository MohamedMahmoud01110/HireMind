import React from 'react'

/**
 * @param {{ title, icon, score, color }} props
 *   score — 0–100 number
 *   color — tailwind color string used for accent, e.g. 'blue' | 'violet' | 'emerald' | 'amber'
 */
export default function ScoreCard({ title, icon, score, color = 'blue' }) {
  const colorMap = {
    blue:    { bar: '#2563eb', bg: '#eff6ff', text: '#1d4ed8' },
    violet:  { bar: '#7c3aed', bg: '#f5f3ff', text: '#6d28d9' },
    emerald: { bar: '#10b981', bg: '#ecfdf5', text: '#065f46' },
    amber:   { bar: '#f59e0b', bg: '#fffbeb', text: '#92400e' },
  }
  const { bar, bg, text } = colorMap[color] ?? colorMap.blue

  const radius   = 28
  const circumference = 2 * Math.PI * radius
  const offset   = circumference - (score / 100) * circumference

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-5 flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p
            className="text-[12px] font-semibold text-gray-400 uppercase tracking-widest mb-0.5"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {title}
          </p>
          <p
            className="text-[28px] font-bold leading-none"
            style={{ color: text, fontFamily: "'Manrope', sans-serif" }}
          >
            {score}
            <span className="text-[16px] font-semibold text-gray-400 ml-0.5">%</span>
          </p>
        </div>

        {/* SVG donut */}
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="6" />
            <circle
              cx="36" cy="36" r={radius}
              fill="none"
              stroke={bar}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          {/* Icon in center */}
          <div className="absolute inset-0 flex items-center justify-center text-[18px]">
            {icon}
          </div>
        </div>
      </div>

      {/* Linear bar */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[11px] text-gray-400" style={{ fontFamily: "'Manrope',sans-serif" }}>Score</span>
          <span className="text-[11px] font-bold" style={{ color: text, fontFamily: "'Manrope',sans-serif" }}>{score}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${score}%`, background: bar }}
          />
        </div>
      </div>

      {/* Pill badge */}
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold"
          style={{ background: bg, color: text }}
        >
          {score >= 80 ? '🏆 Excellent' : score >= 60 ? '👍 Good' : score >= 40 ? '📈 Improving' : '🔄 In Progress'}
        </span>
      </div>
    </div>
  )
}