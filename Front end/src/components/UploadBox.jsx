import React, { useRef, useState } from 'react'

const ACCEPTED = '.pdf,.doc,.docx'
const MAX_MB    = 5

/**
 * Drag-and-drop file upload zone.
 *
 * @param {File|null} file     - currently selected file (controlled)
 * @param {Function}  onFile   - called with the File object when a file is chosen
 */
export default function UploadBox({ file, onFile }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  /* ── helpers ── */
  const handleFile = (f) => {
    if (!f) return
    if (f.size > MAX_MB * 1024 * 1024) {
      alert(`File too large. Maximum size is ${MAX_MB} MB.`)
      return
    }
    onFile(f)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleChange = (e) => handleFile(e.target.files[0])

  /* ── render ── */
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload CV"
      className={`upload-zone ${dragging ? 'drag-over' : ''}`}
      onClick={() => inputRef.current.click()}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true)  }}
      onDragLeave={()  => setDragging(false)}
      onDrop={handleDrop}
    >
      {/* Hidden native input */}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
      />

      {file ? (
        /* ── File selected state ── */
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xl">
            📄
          </div>
          <p className="text-[13px] font-semibold text-emerald-700 truncate max-w-[260px]">
            {file.name}
          </p>
          <p className="text-[12px] text-gray-400">
            {(file.size / 1024).toFixed(1)} KB — click to replace
          </p>
        </div>
      ) : (
        /* ── Empty state ── */
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl">
            📎
          </div>
          <div>
            <p className="text-[14px] font-semibold text-gray-700 mb-0.5">
              Drop your CV here, or{' '}
              <span className="text-blue-600">browse</span>
            </p>
            <p className="text-[12px] text-gray-400">
              PDF, DOC, DOCX — max {MAX_MB} MB
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
