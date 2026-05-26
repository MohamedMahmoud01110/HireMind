import React, { useState } from 'react'
import TextInput from './TextInput'

/**
 * Password field with a show / hide toggle button.
 * Wraps <TextInput> and injects a rightSlot.
 */
export default function PasswordInput({ id, placeholder, value, onChange, error }) {
  const [visible, setVisible] = useState(false)

  const toggle = (
    <button
      type="button"
      onClick={() => setVisible((v) => !v)}
      className="text-[12px] font-semibold text-gray-400 hover:text-blue-600 transition-colors"
    >
      {visible ? 'Hide' : 'Show'}
    </button>
  )

  return (
    <TextInput
      id={id}
      type={visible ? 'text' : 'password'}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      icon="🔒"
      error={error}
      rightSlot={toggle}
    />
  )
}
