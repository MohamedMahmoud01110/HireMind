import { Link } from "react-router-dom";

export default function NoJobRoleState() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-white shadow-xl rounded-3xl p-8 max-w-md w-full text-center border border-slate-200">
        <div className="text-6xl mb-4">🧑‍💼</div>

        <h2 className="text-2xl font-bold text-slate-800 mb-3">
          No Job Role Selected
        </h2>

        <p className="text-slate-500 mb-6 leading-relaxed">
          You need to choose your job role first before taking the assessment.
        </p>

        <Link
          to="/settings"
          className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold transition"
        >
          Go To Settings
        </Link>
      </div>
    </div>
  );
}
