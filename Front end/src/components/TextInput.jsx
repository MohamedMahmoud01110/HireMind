import React from 'react'

/**
 * Reusable text / email / password input.
 *
 * @param {string}   id          - input id (ties to FieldLabel)
 * @param {string}   type        - 'text' | 'email' | 'password'
 * @param {string}   placeholder
 * @param {string}   value
 * @param {Function} onChange
 * @param {string}   icon        - emoji or character shown on the left
 * @param {string}   error       - validation error message
 * @param {React.ReactNode} rightSlot - optional element rendered on the right (e.g. show/hide toggle)
 */
export default function TextInput({
  id,
  type = 'text',
  placeholder,
  value,
  onChange,
  icon,
  error,
  rightSlot,
}) {
  return (
    <div>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[15px] pointer-events-none select-none">
            {icon}
          </span>
        )}

        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={[
            'field-input',
            icon      ? 'pl-9'  : '',
            rightSlot ? 'pr-16' : '',
          ].join(' ')}
        />

        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightSlot}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-[12px] text-red-500">{error}</p>
      )}
    </div>
  )
}
