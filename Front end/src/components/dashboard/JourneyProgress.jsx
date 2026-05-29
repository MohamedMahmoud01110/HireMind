import React, { useMemo } from 'react'

const STEPS = [
  { key: 'cv',         label: 'CV Upload',  icon: '📄' },
  { key: 'assessment', label: 'PreAssessment', icon: '📝' },
  { key: 'interview',  label: 'Interview',  icon: '🎙️' },
  { key: 'report',     label: 'Report',     icon: '📊' },
]

const SCORE_TITLE_BY_STEP = {
  cv: 'CV',
  assessment: 'Pre Assessment',
  interview: 'Interview',
}

export function getCompletedJourneySteps(userScores = []) {
  const hasScore = (title) => {
    const entry = userScores.find((s) => s.title === title)
    return entry != null && Number(entry.score) > 0
  }

  const completed = []

  if (hasScore(SCORE_TITLE_BY_STEP.cv)) completed.push('cv')
  if (hasScore(SCORE_TITLE_BY_STEP.assessment)) completed.push('assessment')
  if (hasScore(SCORE_TITLE_BY_STEP.interview)) completed.push('interview')

  if (
    hasScore(SCORE_TITLE_BY_STEP.cv) &&
    hasScore(SCORE_TITLE_BY_STEP.assessment) &&
    hasScore(SCORE_TITLE_BY_STEP.interview)
  ) {
    completed.push('report')
  }

  return completed
}

function StepBadge({ step, completed }) {
  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      {/* Icon card */}
      <div
        className={[
          'w-full max-w-[88px] rounded-xl border px-2 py-3 flex flex-col items-center gap-1.5 transition-all duration-200',
          completed
            ? 'bg-emerald-50 border-emerald-200'
            : 'bg-gray-50 border-gray-200',
        ].join(' ')}
      >
        <span className="text-xl leading-none">{step.icon}</span>
        <span
          className="text-[18px] leading-none"
          aria-label={completed ? 'Completed' : 'Not completed'}
        >
          {completed ? '✅' : '❌'}
        </span>
      </div>
      {/* Label */}
      <span
        className="text-[11px] font-semibold text-gray-500 text-center leading-tight"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        {step.label}
      </span>
    </div>
  )
}

/**
 * @param {{ userScores?: { title: string, score: number }[] }} props
 */
export default function JourneyProgress({ userScores = [] }) {
  const completed = useMemo(
    () => getCompletedJourneySteps(userScores),
    [userScores],
  )
  const pct = Math.round((completed.length / STEPS.length) * 100)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        {/* Left */}
        <div>
          <h2
            className="text-[15px] font-bold text-gray-900 mb-0.5"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Your Journey Progress
          </h2>
          <p className="text-[13px] text-gray-400">
            {pct === 100
              ? "You've completed all assessment steps! 🎉"
              : `${STEPS.length - completed.length} step${STEPS.length - completed.length > 1 ? 's' : ''} remaining`}
          </p>
        </div>

        {/* Right: % badge */}
        <div className="flex flex-col items-end gap-1">
          <span
            className="text-[22px] font-bold text-gray-900 leading-none"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {pct}%
          </span>
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
            Complete
          </span>
        </div>
      </div>

      {/* Thin progress bar */}
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mb-5">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: pct === 100
              ? 'linear-gradient(90deg,#2563eb 0%,#10b981 100%)'
              : '#2563eb',
          }}
        />
      </div>

      {/* Step badges */}
      <div className="flex items-start justify-between gap-2">
        {STEPS.map((step) => (
          <StepBadge
            key={step.key}
            step={step}
            completed={completed.includes(step.key)}
          />
        ))}
      </div>
    </div>
  )
}