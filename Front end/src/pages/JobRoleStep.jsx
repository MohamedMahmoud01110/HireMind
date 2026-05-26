import React from 'react'
import Logo   from '../components/Logo'
import Button from '../components/Button'

/* ─────────────────────────────────────────────────────────────
   Data
───────────────────────────────────────────────────────────── */
const JOB_ROLES = [
  {
    id:       'data-analyst',
    label:    'Data Analyst',
    subtitle: 'Analyze data and create insights',
    icon:     '📊',
  },
  {
    id:       'web-developer',
    label:    'Web Developer',
    subtitle: 'Build modern web applications',
    icon:     '💻',
  },
  {
    id:       'marketing-specialist',
    label:    'Marketing Specialist',
    subtitle: 'Drive growth and engagement',
    icon:     '📣',
  },
  {
    id:       'ui-ux-designer',
    label:    'UI/UX Designer',
    subtitle: 'Design user experiences',
    icon:     '🎨',
  },
  {
    id:       'hr-specialist',
    label:    'HR Specialist',
    subtitle: 'Manage people and culture',
    icon:     '🤝',
  },
  {
    id:       'other',
    label:    'Other',
    subtitle: 'Specify your preferred role',
    icon:     '✨',
  },
]

const TOTAL_STEPS  = 4
const CURRENT_STEP = 4
const PROGRESS_PCT = Math.round((CURRENT_STEP / TOTAL_STEPS) * 100) // 100

/* ─────────────────────────────────────────────────────────────
   ProgressBar — same pattern as all previous steps
───────────────────────────────────────────────────────────── */
function ProgressBar({ step, total, pct }) {
  return (
    <div className="mb-8">
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
        {/* Fill — green at 100% to signal completion */}
        <div
          className="h-full rounded-full transition-all duration-700"
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

/* ─────────────────────────────────────────────────────────────
   RoleCard — single-select full-width card with check on left
───────────────────────────────────────────────────────────── */
function RoleCard({ role, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(role.id)}
      aria-pressed={isSelected}
      className={[
        'flex items-center gap-4 w-full px-4 py-4 rounded-xl border-[1.5px]',
        'text-left transition-all duration-150 focus:outline-none group',
        isSelected
          ? 'border-blue-600 bg-blue-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
      ].join(' ')}
    >
      {/* ── Check circle (left) ── */}
      <span
        className={[
          'flex-shrink-0 w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all duration-150',
          isSelected
            ? 'bg-blue-600 border-blue-600'
            : 'bg-white border-gray-300 group-hover:border-gray-400',
        ].join(' ')}
        aria-hidden="true"
      >
        {isSelected && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path
              d="M2 5l2.5 2.5 4-4"
              stroke="white"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>

      {/* ── Icon bubble ── */}
      <span
        className={[
          'w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 transition-colors duration-150',
          isSelected ? 'bg-blue-100' : 'bg-gray-100',
        ].join(' ')}
      >
        {role.icon}
      </span>

      {/* ── Text: label + subtitle ── */}
      <div className="flex flex-col min-w-0">
        <span
          className={[
            'text-[13px] font-semibold leading-tight transition-colors duration-150',
            isSelected ? 'text-blue-700' : 'text-gray-800',
          ].join(' ')}
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {role.label}
        </span>
        <span
          className={[
            'text-[12px] mt-0.5 transition-colors duration-150',
            isSelected ? 'text-blue-500' : 'text-gray-400',
          ].join(' ')}
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {role.subtitle}
        </span>
      </div>

      {/* ── Arrow indicator (right) — only when selected ── */}
      {isSelected && (
        <svg
          className="ml-auto w-4 h-4 text-blue-500 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
   JobRoleStep

   Props:
     userData    {object}   — shared multi-step form state
     setUserData {Function} — updates shared state
     goNext      {Function} — called on Complete (triggers finish/success)
     goBack      {Function} — returns to Step 3
───────────────────────────────────────────────────────────── */
export default function JobRoleStep({ userData = {}, setUserData, goNext, goBack }) {
  const selected = userData.jobRole ?? null

  const handleSelect = (id) => {
    setUserData((prev) => ({ ...prev, jobRole: id }))
  }

  const handleComplete = () => {
    if (!selected) return
    goNext()
  }

  /* Resolve selected role label for the completion hint */
  const selectedRole = JOB_ROLES.find((r) => r.id === selected)

  return (
    <div className="min-h-screen py-8 px-4">

      {/* ── Top bar ── */}
      <header className="max-w-[540px] mx-auto flex items-center justify-between mb-8 animate-fade-up">
        <Logo size="md" />

        {goBack && (
          <button
            type="button"
            onClick={goBack}
            className="text-[13px] font-semibold text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}
      </header>

      {/* ── Card ── */}
      <main
        className="card max-w-[540px] mx-auto px-8 py-8 animate-fade-up delay-50"
        aria-label="Preferred job role step"
      >
        {/* Progress */}
        <ProgressBar step={CURRENT_STEP} total={TOTAL_STEPS} pct={PROGRESS_PCT} />

        {/* Title + subtitle */}
        <div className="mb-6">
          <h1
            className="text-[22px] font-bold text-gray-900 leading-tight mb-2"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Preferred Job Role
          </h1>
          <p className="text-sm text-gray-500 leading-relaxed">
            What type of position are you looking for?
          </p>
        </div>

        {/* ── Role cards — one per row ── */}
        <div className="flex flex-col gap-2.5 mb-6">
          {JOB_ROLES.map((role, i) => (
            <div
              key={role.id}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <RoleCard
                role={role}
                isSelected={selected === role.id}
                onSelect={handleSelect}
              />
            </div>
          ))}
        </div>

        {/* ── Selection hint ── */}
        <div className="min-h-[20px] mb-4">
          {selectedRole && (
            <p className="text-[12px] font-semibold text-emerald-600 flex items-center gap-1.5 animate-fade-up">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              {selectedRole.label} selected — you're all set!
            </p>
          )}
        </div>

        {/* ── Footer nav ── */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">

          {/* Back — bottom left */}
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={goBack}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Button>

          {/* Complete — bottom right */}
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleComplete}
            disabled={!selected}
            className={[
              !selected ? 'opacity-40 cursor-not-allowed' : '',
              selected  ? 'bg-emerald-600 hover:bg-emerald-700' : '',
            ].join(' ')}
          >
            Complete
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </Button>
        </div>
      </main>
    </div>
  )
}