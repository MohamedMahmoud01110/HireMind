import React from 'react'

export default function Logo({ size = 'md' }) {
  const sizes = {
    sm: { height: 28 },
    md: { height: 38 },
    lg: { height: 50 },
  }
  const { height } = sizes[size]

  return (
    <div className="inline-flex items-center">
      <img
        src="/hiremind-logo.jpeg"
        alt="HireMind"
        style={{ height, width: 'auto', objectFit: 'contain' }}
      />
    </div>
  )
}
