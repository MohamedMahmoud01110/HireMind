export default function FeatureAlreadyTakenModal({
  open,
  title,
  message,
  score,
  scoreLabel = "Your Score",
  extraDetails,
  onClose,
  onRetake,
  isRetakeLoading,
  closeLabel = "Close",
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-up">
        <h2
          className="text-xl font-bold text-gray-900 mb-2"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {title}
        </h2>

        <p
          className="text-gray-600 text-sm mb-4"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {message}
        </p>

        <div className="bg-gray-50 border rounded-xl p-4 mb-5 text-center">
          {extraDetails && (
            <p
              className="text-sm text-gray-500 mb-2"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {extraDetails}
            </p>
          )}

          <p
            className="text-sm text-gray-500 mb-1"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {scoreLabel}
          </p>

          <p
            className="text-3xl font-bold text-gray-900"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {score}%
          </p>

          <p
            className="text-xs text-emerald-600 font-semibold mt-2"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Your first try was free. Retakes require a paid session.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {closeLabel}
          </button>

          <button
            onClick={onRetake}
            disabled={isRetakeLoading}
            className="flex-1 py-2.5 rounded-xl bg-[#f97316] text-white hover:bg-[#ea580c] transition disabled:opacity-60"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {isRetakeLoading ? "Loading…" : "Retake"}
          </button>
        </div>
      </div>
    </div>
  );
}
