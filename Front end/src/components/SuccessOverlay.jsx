import React from "react";
import Button from "./Button";

/**
 * Full-screen success state displayed after a valid form submission.
 *
 * @param {string}   name     - candidate's first name
 * @param {Function} onReset  - callback to go back to the form
 */
export default function SuccessOverlay({ name, onReset }) {
  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center animate-fade-up">
      {/* Check circle */}
      <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-400 flex items-center justify-center text-3xl mb-5">
        ✅
      </div>

      <h2
        className="text-2xl font-bold text-gray-900 mb-2"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        Account Created!
      </h2>

      <p className="text-sm text-gray-500 text-center max-w-xs mb-8">
        Welcome to HireMind, <strong>{name}</strong>. Your journey to landing
        your dream job starts now.
      </p>
      {/* 
      <Button variant="outline" size="md" onClick={onReset}>
        ← Back to form
      </Button> */}
    </div>
  );
}
