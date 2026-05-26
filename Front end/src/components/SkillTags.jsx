import React from 'react'
import { SKILLS } from '../data/formOptions'

/**
 * Multi-select pill/tag input for skills.
 * Clicking a tag toggles its selected state.
 *
 * @param {string[]} selected  - array of currently selected skill strings
 * @param {Function} onToggle  - called with the skill string that was clicked
 */
export default function SkillTags({ selected, onToggle }) {
  return (
    <div>
      {/* Selection count */}
      {selected.length > 0 && (
        <p className="mb-2 text-[12px] font-semibold text-blue-600">
          {selected.length} skill{selected.length > 1 ? 's' : ''} selected
        </p>
      )}

      {/* Pill grid */}
      <div className="flex flex-wrap gap-2">
        {SKILLS.map((skill) => {
          const isSelected = selected.includes(skill)
          return (
            <button
              key={skill}
              type="button"
              onClick={() => onToggle(skill)}
              className={`skill-tag ${isSelected ? 'selected' : ''}`}
            >
              {isSelected && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {skill}
            </button>
          )
        })}
      </div>
    </div>
  )
}
