import React from 'react'

/**
 * Consistent form label with an optional "(Optional)" annotation.
 *
 * @param {string}  htmlFor  - ties to the input id via <label htmlFor>
 * @param {boolean} optional - shows a muted "(Optional)" suffix
 */
export default function FieldLabel({ htmlFor, optional, children }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[13px] font-semibold text-gray-900 mb-1.5"
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      {children}
      {optional && (
        <span className="ml-1 text-[12px] font-normal text-gray-400">
          (Optional)
        </span>
      )}
    </label>
  )
}
