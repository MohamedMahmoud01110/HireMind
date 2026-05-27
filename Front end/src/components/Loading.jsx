import React from "react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-10">
      {/* Spinner */}
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>

        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 animate-spin"></div>
      </div>

      {/* Text */}
      <p
        className="text-sm font-semibold text-gray-500 tracking-wide"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        Loading...
      </p>
    </div>
  );
}
