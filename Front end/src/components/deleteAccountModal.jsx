export default function DeleteAccountModal({
  open,
  onClose,
  onConfirm,
  loading,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={loading ? null : onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        {/* Icon */}
        <div className="text-3xl mb-3">⚠️</div>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Delete Account
        </h2>

        {/* Message */}
        <p className="text-sm text-gray-600 mb-5">
          Are you sure you want to delete your account? This action cannot be undone.
        </p>

        {/* Warning box */}
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-5">
          <p className="text-sm text-red-600 font-semibold">
            ⚠️ All your data will be permanently removed
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}