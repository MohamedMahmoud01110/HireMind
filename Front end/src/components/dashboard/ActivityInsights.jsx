import React from 'react'

/* ── RecentActivity ─────────────────────────────────────────── */

/**
 * @param {{ activities: Array<{icon,label,time,badge}> }} props
 */
export function ActivityCard({ activities = [] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-[15px] font-bold text-gray-900"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Recent Activity
        </h3>
        {activities.length > 0 && (
          <button className="text-[12px] font-semibold text-blue-600 hover:underline">
            View all
          </button>
        )}
      </div>

      {activities.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-2xl">
            📭
          </div>
          <p
            className="text-[13px] text-gray-400 text-center"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            No activity yet
          </p>
          <p className="text-[12px] text-gray-300 text-center max-w-[200px]">
            Complete your first interview session to see activity here
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activities.map((a, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
                {a.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-800 truncate" style={{ fontFamily: "'Manrope', sans-serif" }}>{a.label}</p>
                <p className="text-[11px] text-gray-400">{a.time}</p>
              </div>
              {a.badge && (
                <span className="flex-shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                  {a.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── PerformanceInsights ─────────────────────────────────────── */

const INSIGHT_METRICS = [
  { label: 'Communication Skills', key: 'communication' },
  { label: 'Technical Knowledge',  key: 'technical'     },
  { label: 'Problem Solving',      key: 'problem'       },
  { label: 'Overall Rating',       key: 'overall'       },
]

/**
 * @param {{ insights: Record<string, number> }} props
 *   insights — map of metric key → 0–100 score; empty = no data yet
 */
export function InsightsCard({ insights = {} }) {
  const hasData = Object.keys(insights).length > 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-[15px] font-bold text-gray-900"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Performance Insights
        </h3>
        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
          {hasData ? 'Live' : 'Pending'}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {INSIGHT_METRICS.map((m) => {
          const score = insights[m.key] ?? null
          return (
            <div key={m.key}>
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="text-[13px] font-semibold text-gray-700"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  {m.label}
                </span>
                <span className="text-[12px] font-bold text-gray-400">
                  {score !== null ? `${score}%` : '—'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                {score !== null ? (
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-700"
                    style={{ width: `${score}%` }}
                  />
                ) : (
                  /* Skeleton shimmer for empty state */
                  <div className="h-full rounded-full w-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {!hasData && (
        <p
          className="text-[12px] text-gray-300 mt-4 text-center"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Complete an AI interview to unlock your insights
        </p>
      )}
    </div>
  )
}