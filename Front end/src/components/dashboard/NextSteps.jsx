import React from 'react'

const DEFAULT_STEPS = [
  {
    key:     'interview',
    icon:    '🎙️',
    title:   'Start your first AI Interview',
    desc:    'Practice with our AI interviewer and get instant feedback on your answers.',
    action:  'Start Interview',
    color:   { bg: '#eff6ff', border: '#bfdbfe', text: '#1d4ed8' },
  },
  {
    key:     'cv',
    icon:    '📊',
    title:   'Upload your CV',
    desc:    'Let our AI scan your CV and give you a detailed score with improvement tips.',
    action:  'Upload CV',
    color:   { bg: '#f5f3ff', border: '#ddd6fe', text: '#6d28d9' },
  },
  {
    key:     'assessment',
    icon:    '📝',
    title: 'Complete the PreAssessment',
    desc:    'A short skills pre-assessment helps us tailor your interview practice sessions.',
    action: 'Take PreAssessment',
    color:   { bg: '#ecfdf5', border: '#a7f3d0', text: '#065f46' },
  },
]

export default function NextSteps({ steps = DEFAULT_STEPS, onNavigate }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">

      {/* Header */}
      <div className="mb-5">
        <h3
          className="text-[15px] font-bold text-gray-900 mb-0.5"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Recommended Next Steps
        </h3>
        <p
          className="text-[13px] text-gray-400"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Here's what we suggest to accelerate your interview readiness
        </p>
      </div>

      {/* Step cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {steps.map((step, i) => (
          <div
            key={i}
            className="rounded-xl border px-4 py-4 flex flex-col gap-3 transition-all duration-150 hover:shadow-md hover:-translate-y-0.5"
            style={{ background: step.color.bg, borderColor: step.color.border }}
          >

            {/* Icon + Step */}
            <div className="flex items-center justify-between">
              <span className="text-2xl">{step.icon}</span>
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: step.color.text, fontFamily: "'Manrope', sans-serif" }}
              >
                Step {i + 1}
              </span>
            </div>

            {/* Text */}
            <div>
              <p
                className="text-[13px] font-bold text-gray-900 mb-1 leading-tight"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                {step.title}
              </p>
              <p
                className="text-[12px] text-gray-500 leading-relaxed"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                {step.desc}
              </p>
            </div>

            {/* BUTTON (هنا التعديل المهم 👇) */}
            <button
              onClick={() => onNavigate?.(step.key)}
              className="mt-auto w-full py-2 rounded-lg text-[12px] font-bold transition-all duration-150 hover:opacity-90 active:scale-95"
              style={{
                background: step.color.text,
                color: 'white',
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              {step.action} →
            </button>

          </div>
        ))}
      </div>
    </div>
  )
}