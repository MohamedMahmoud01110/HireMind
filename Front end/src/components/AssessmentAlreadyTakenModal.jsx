export default function AssessmentAlreadyTakenModal({
  open,
  result,
  onClose,
  onRetake,
  isRetake,
}) {
  if (!open) return null;
  // console.log(result);

  const { score, total, percentage } = result || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-up">
        {/* Icon */}
        {/* <div className="text-4xl mb-3">📊</div> */}

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Assessment Already Completed
        </h2>

        {/* Message */}
        <p className="text-gray-600 text-sm mb-4">
          You have already taken this assessment.
        </p>

        {/* Score box */}
        <div className="bg-gray-50 border rounded-xl p-4 mb-5 text-center">
          <p className="text-sm text-gray-500 mb-2">
            You answered {total} out of 20 questions
          </p>

          <p className="text-2xl font-bold text-gray-900">
            Correct Answers: {score}
          </p>

          <p className="text-sm text-emerald-600 font-semibold mt-1">
            Success Rate: {percentage}%
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            Close
          </button>

          <button
            onClick={onRetake}
            className="flex-1 py-2 rounded-xl bg-[#f97316] text-white hover:bg-[#ea580c] transition"
          >
            {isRetake ? "loading..." : "Retake"}
          </button>
        </div>
      </div>
    </div>
  );
}
