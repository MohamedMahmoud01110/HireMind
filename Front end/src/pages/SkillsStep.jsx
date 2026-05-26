import React from 'react'
import Logo   from '../components/Logo'
import Button from '../components/Button'

/* ─────────────────────────────────────────────────────────────
   Data
───────────────────────────────────────────────────────────── */
const SKILLS = [
  { id: 'frontend',   label: 'Frontend Development',  icon: '🖥️'  },
  { id: 'backend',    label: 'Backend Development',   icon: '⚙️'  },
  { id: 'fullstack',  label: 'Full Stack Development', icon: '🔗' },
  { id: 'data',       label: 'Data Analysis',         icon: '📊' },
  { id: 'ml',         label: 'Machine Learning',      icon: '🤖' },
  { id: 'devops',     label: 'DevOps',                icon: '🔄' },
  { id: 'cloud',      label: 'Cloud Computing',       icon: '☁️'  },
  { id: 'mobile',     label: 'Mobile Development',    icon: '📱' },
  { id: 'uiux',       label: 'UI/UX Design',          icon: '🎨' },
  { id: 'database',   label: 'Database Management',   icon: '🗄️'  },
]

const TOTAL_STEPS  = 4
const CURRENT_STEP = 3
const PROGRESS_PCT = Math.round((CURRENT_STEP / TOTAL_STEPS) * 100) // 75

/* ─────────────────────────────────────────────────────────────
   ProgressBar — identical pattern to previous steps
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

      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   SkillRow — full-width selectable row with check icon on LEFT
───────────────────────────────────────────────────────────── */
function SkillRow({ skill, isSelected, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(skill.id)}
      aria-pressed={isSelected}
      className={[
        'flex items-center gap-3.5 w-full px-4 py-3.5 rounded-xl border-[1.5px]',
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
          'w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0 transition-colors duration-150',
          isSelected ? 'bg-blue-100' : 'bg-gray-100',
        ].join(' ')}
      >
        {skill.icon}
      </span>

      {/* ── Label ── */}
      <span
        className={[
          'text-[13px] font-semibold transition-colors duration-150',
          isSelected ? 'text-blue-700' : 'text-gray-600',
        ].join(' ')}
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        {skill.label}
      </span>
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
   SkillsStep

   Props:
     userData    {object}   — shared multi-step form state
     setUserData {Function} — updates shared state
     goNext      {Function} — advances to next step
     goBack      {Function} — returns to previous step
───────────────────────────────────────────────────────────── */
export default function SkillsStep({ userData = {}, setUserData, goNext, goBack }) {
  const selectedSkills = userData.skills ?? []

  const handleToggle = (id) => {
    setUserData((prev) => {
      const current = prev.skills ?? []
      const next    = current.includes(id)
        ? current.filter((s) => s !== id)
        : [...current, id]
      return { ...prev, skills: next }
    })
  }

  const handleNext = () => {
    if (selectedSkills.length === 0) return
    goNext()
  }

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
        aria-label="Key technical skills step"
      >
        {/* Progress */}
        <ProgressBar step={CURRENT_STEP} total={TOTAL_STEPS} pct={PROGRESS_PCT} />

        {/* Title + subtitle + counter */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h1
              className="text-[22px] font-bold text-gray-900 leading-tight mb-2"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Key Technical Skills
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              What are your main areas of expertise?
            </p>
          </div>

          {/* Live count badge */}
          {selectedSkills.length > 0 && (
            <span
              className="flex-shrink-0 mt-1 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-100 animate-fade-up"
            >
              {selectedSkills.length} selected
            </span>
          )}
        </div>

        {/* ── Skills list — full width, one per row ── */}
        <div className="flex flex-col gap-2.5 mb-6">
          {SKILLS.map((skill, i) => (
            <div
              key={skill.id}
              className="animate-fade-up"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <SkillRow
                skill={skill}
                isSelected={selectedSkills.includes(skill.id)}
                onToggle={handleToggle}
              />
            </div>
          ))}
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

          {/* Next — bottom right, disabled until ≥1 skill selected */}
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleNext}
            disabled={selectedSkills.length === 0}
            className={selectedSkills.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}
          >
            Next
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </main>
    </div>
  )
}