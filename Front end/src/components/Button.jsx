import React from 'react'

export default function Button({
  children,
  variant   = 'primary',
  size      = 'md',
  fullWidth = false,
  loading   = false,
  type      = 'button',
  onClick,
  className = '',
  ...rest
}) {
  const base = [
    'inline-flex items-center justify-center gap-2 font-bold',
    'transition-all duration-200 cursor-pointer focus:outline-none',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ]

  const variants = {
    primary: [
      'text-white rounded-xl',
      'hover:-translate-y-0.5 active:translate-y-0',
    ],
    ghost:   ['bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl'],
    outline: ['bg-white text-slate-900 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl'],
    accent:  ['bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-0.5 hover:shadow-md rounded-xl'],
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-[15px]',
  }

  const isPrimary = !variant || variant === 'primary'

  const classes = [
    ...base,
    ...(variants[variant] || variants.primary),
    sizes[size],
    fullWidth ? 'w-full' : '',
    className,
  ].join(' ')

  const style = isPrimary
    ? {
        fontFamily: "'Manrope', sans-serif",
        background: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
        boxShadow: '0 4px 16px rgba(249,115,22,0.35)',
      }
    : { fontFamily: "'Manrope', sans-serif" }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      className={classes}
      style={style}
      {...rest}
    >
      {loading ? (
        <>
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          Please wait…
        </>
      ) : children}
    </button>
  )
}
