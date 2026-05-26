import React from 'react'
import { JOB_GROUPS } from '../data/formOptions'

/**
 * Grouped <select> for job role selection.
 * Role data lives in src/data/formOptions.js — add groups there, not here.
 *
 * @param {string}   value
 * @param {Function} onChange
 * @param {string}   error
 */
export default function JobSelect({ value, onChange, error }) {
  return (
    <div>
      <select
        value={value}
        onChange={onChange}
        className="field-input cursor-pointer"
      >
        <option value="">Select your job role…</option>
        {JOB_GROUPS.map(({ group, options }) => (
          <optgroup key={group} label={group}>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {error && (
        <p className="mt-1 text-[12px] text-red-500">{error}</p>
      )}
    </div>
  )
}
