import React from 'react'
import Logo   from '../components/Logo'
import Button from '../components/Button'

/* ─────────────────────────────────────────────────────────────
   Data
───────────────────────────────────────────────────────────── */
const TOOLS = [
  { id: 'python',           label: 'Python',           icon: '🐍' },
  { id: 'javascript',       label: 'JavaScript',       icon: '🟨' },
  { id: 'react',            label: 'React',            icon: '⚛️'  },
  { id: 'angular',          label: 'Angular',          icon: '🅰️'  },
  { id: 'vuejs',            label: 'Vue.js',           icon: '💚' },
  { id: 'nodejs',           label: 'Node.js',          icon: '🟩' },
  { id: 'sql',              label: 'SQL',              icon: '🗄️'  },
  { id: 'mongodb',          label: 'MongoDB',          icon: '🍃' },
  { id: 'postgresql',       label: 'PostgreSQL',       icon: '🐘' },
  { id: 'docker',           label: 'Docker',           icon: '🐳' },
  { id: 'kubernetes',       label: 'Kubernetes',       icon: '☸️'  },
  { id: 'aws',              label: 'AWS',              icon: '☁️'  },
  { id: 'azure',            label: 'Azure',            icon: '🔷' },
  { id: 'git',              label: 'Git',              icon: '🌿' },
  { id: 'figma',            label: 'Figma',            icon: '🎨' },
  { id: 'adobe-xd',         label: 'Adobe XD',         icon: '🖌️'  },
  { id: 'photoshop',        label: 'Photoshop',        icon: '🖼️'  },
  { id: 'google-analytics', label: 'Google Analytics', icon: '📊' },
]

const TOTAL_STEPS  = 4
const CURRENT_STEP = 2
const PROGRESS_PCT = Math.round((CURRENT_STEP / TOTAL_STEPS) * 100) // 50

/* ─────────────────────────────────────────────────────────────
   ProgressBar — shared pattern with ExperienceStep
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
        {/* Fill */}
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   ToolPill — multi-select pill button (3 per row)
───────────────────────────────────────────────────────────── */
function ToolPill({ tool, isSelected, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(tool.id)}
      aria-pressed={isSelected}
      className={[
        'flex items-center gap-2.5 w-full px-3.5 py-3 rounded-xl border-[1.5px]',
        'text-[13px] font-semibold transition-all duration-150 focus:outline-none',
        isSelected
          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
      ].join(' ')}
    >
      {/* Icon */}
      <span
        className={[
          'w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 transition-colors duration-150',
          isSelected ? 'bg-blue-100' : 'bg-gray-100',
        ].join(' ')}
      >
        {tool.icon}
      </span>

      {/* Label — truncate on very small screens */}
      <span
        className="truncate"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        {tool.label}
      </span>

      {/* Checkmark — only when selected */}
      {isSelected && (
        <svg
          className="ml-auto w-[15px] h-[15px] flex-shrink-0"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
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
  )
}

/* ─────────────────────────────────────────────────────────────
   ToolsStep

   Props:
     userData    {object}   — shared multi-step form state
     setUserData {Function} — updates shared state
     goNext      {Function} — advances to next step
     goBack      {Function} — returns to previous step
───────────────────────────────────────────────────────────── */
export default function ToolsStep({ userData = {}, setUserData, goNext, goBack }) {
  // tools is an array of selected tool ids
  const selectedTools = userData.tools ?? []

  const handleToggle = (id) => {
    setUserData((prev) => {
      const current = prev.tools ?? []
      const next    = current.includes(id)
        ? current.filter((t) => t !== id)   // deselect
        : [...current, id]                  // select
      return { ...prev, tools: next }
    })
  }

  const handleSelectAll = () => {
    const allIds = TOOLS.map((t) => t.id)
    const allSelected = allIds.every((id) => selectedTools.includes(id))
    setUserData((prev) => ({
      ...prev,
      tools: allSelected ? [] : allIds,
    }))
  }

  const handleNext = () => {
    if (selectedTools.length === 0) return
    goNext()
  }

  const allSelected = TOOLS.every((t) => selectedTools.includes(t.id))

  return (
    <div className="min-h-screen py-8 px-4">

      {/* ── Top bar ── */}
      <header className="max-w-[620px] mx-auto flex items-center justify-between mb-8 animate-fade-up">
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
        className="card max-w-[620px] mx-auto px-8 py-8 animate-fade-up delay-50"
        aria-label="Tools and technologies step"
      >
        {/* Progress */}
        <ProgressBar step={CURRENT_STEP} total={TOTAL_STEPS} pct={PROGRESS_PCT} />

        {/* Title + subtitle + select-all toggle */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1
              className="text-[22px] font-bold text-gray-900 leading-tight mb-2"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Tools You Use
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Select all the tools and technologies you're familiar with
            </p>
          </div>

          {/* Select / Deselect all */}
          <button
            type="button"
            onClick={handleSelectAll}
            className="flex-shrink-0 text-[12px] font-semibold text-blue-600 hover:text-blue-800 transition-colors mt-1 whitespace-nowrap"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>

        {/* ── Tools grid — 3 per row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-3">
          {TOOLS.map((tool) => (
            <ToolPill
              key={tool.id}
              tool={tool}
              isSelected={selectedTools.includes(tool.id)}
              onToggle={handleToggle}
            />
          ))}
        </div>

        {/* Selection count badge */}
        <div className="mb-6 min-h-[20px]">
          {selectedTools.length > 0 && (
            <p className="text-[12px] font-semibold text-blue-600 animate-fade-up">
              {selectedTools.length} tool{selectedTools.length > 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        {/* ── Footer nav ── */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">

          {/* Back button — left */}
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

          {/* Next button — right, disabled until ≥1 tool selected */}
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleNext}
            disabled={selectedTools.length === 0}
            className={selectedTools.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}
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