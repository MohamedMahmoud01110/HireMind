import React from "react";

/**
 * Simple role selector (student / company)
 */
export default function RoleSelect({ value, onChange, error }) {
  return (
    <div>
      <select
        value={value}
        onChange={onChange}
        className="field-input cursor-pointer"
      >
        <option value="">Select your role…</option>
        <option value="student">Student</option>
        <option value="company">Company</option>
      </select>

      {error && <p className="mt-1 text-[12px] text-red-500">{error}</p>}
    </div>
  );
}
