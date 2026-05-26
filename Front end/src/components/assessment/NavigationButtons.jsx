import React from 'react'

/**
 * @param {number}   currentIndex
 * @param {number}   total
 * @param {boolean}  canProceed    - true when an answer is selected
 * @param {boolean}  disabled      - block all clicks during transition
 * @param {Function} onPrev
 * @param {Function} onNext
 * @param {Function} onSubmit
 */
export default function NavigationButtons({
  currentIndex,
  total,
  canProceed,
  disabled,
  onPrev,
  onNext,
  onSubmit,
}) {
  const isFirst = currentIndex === 0
  const isLast  = currentIndex === total - 1

  return (
    <div className="flex items-center justify-between">

      {/* ── Previous (hidden on question 1) ── */}
      <div>
        {!isFirst && (
          <button
            onClick={onPrev}
            disabled={disabled}
            className={[
              'flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200',
              'text-[13px] font-semibold text-gray-600 bg-white transition-all duration-150',
              disabled
                ? 'opacity-40 cursor-not-allowed'
                : 'hover:bg-gray-50 hover:border-gray-300 hover:text-gray-900',
            ].join(' ')}
            style={{ fontFamily: "'Sora', sans-serif" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>
        )}
      </div>

      {/* ── Next or Submit ── */}
      <button
        onClick={isLast ? onSubmit : onNext}
        disabled={!canProceed || disabled}
        className={[
          'flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-150',
          !canProceed || disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : isLast
              ? 'bg-emerald-600 text-white hover:bg-emerald-500 hover:-translate-y-px hover:shadow-md active:translate-y-0'
              : 'bg-gray-900 text-white hover:bg-gray-700 hover:-translate-y-px hover:shadow-md active:translate-y-0',
        ].join(' ')}
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        {isLast ? (
          <>
            Submit Assessment
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </>
        ) : (
          <>
            Next Question
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </>
        )}
      </button>
    </div>
  )
}