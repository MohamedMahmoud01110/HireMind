import React, { useState } from "react";
import Sidebar from "../components/dashboard/Sidebar";
import CompanySidebar from "../components/dashboard/CompanySidebar";
import { changePassword, deleteUserById, updateProfile } from "../apis/userApi";
import { Helmet } from "react-helmet-async";
import DeleteAccountModal from "../components/deleteAccountModal";
import { deletePreAssessmentResult } from "../apis/preAssessmentQuestionsApi";
import { useNavigate } from "react-router-dom";

/* ─── Data ───────────────────────────────────────────────────── */
const JOB_ROLES = [
  "Data Analyst",
  "Business Intelligence Analyst",
  "Data Scientist",
  "Data Engineer",
  "Machine Learning Engineer",
  "Business Analyst",
  "Product Manager",
  "Product Owner",
  "Project Manager",
  "Financial Analyst",
  "Software Developer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "QA Engineer",
  "UI/UX Designer",
  "Digital Marketing Analyst",
  "Other",
];

/* ═══════════════════════════════════════════════════════════════
   PRIMITIVES
═══════════════════════════════════════════════════════════════ */

function Card({ children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-6">
      {children}
    </div>
  );
}

function CardHeader({ icon, title, description }) {
  return (
    <div className="flex items-start gap-3 mb-6 pb-5 border-b border-gray-100">
      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
        {icon}
      </div>
      <div>
        <h2
          className="text-[15px] font-bold text-gray-900"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {title}
        </h2>
        <p
          className="text-[12px] text-gray-400 mt-0.5"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

function Label({ htmlFor, children }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-widest"
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      {children}
    </label>
  );
}

function Input({ id, type = "text", value, onChange, placeholder, disabled }) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={[
        "w-full px-4 py-2.5 rounded-xl border text-[13px] outline-none transition-all duration-150",
        disabled
          ? "bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed"
          : "bg-white border-gray-200 text-gray-900 placeholder-gray-300",
        !disabled
          ? "hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
          : "",
      ].join(" ")}
      style={{ fontFamily: "'Manrope', sans-serif" }}
    />
  );
}

function Select({ id, value, onChange, options }) {
  return (
    <select
      id={id}
      value={value}
      onChange={onChange}
      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-900 outline-none cursor-pointer transition-all duration-150 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      <option value="">Select your role…</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function Textarea({ id, value, onChange, placeholder }) {
  return (
    <textarea
      id={id}
      rows={3}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] text-gray-900 placeholder-gray-300 outline-none resize-none transition-all duration-150 hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
      style={{ fontFamily: "'Manrope', sans-serif" }}
    />
  );
}

function SaveButton({ onClick, loading, saved, label = "Save Changes" }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={[
        "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold",
        "transition-all duration-200 focus:outline-none",
        loading
          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
          : saved
            ? "bg-emerald-600 text-white"
            : "bg-gray-900 text-white hover:bg-gray-700 hover:-translate-y-px hover:shadow-md active:translate-y-0",
      ].join(" ")}
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      {loading ? (
        <>
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
          Saving…
        </>
      ) : saved ? (
        <>
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          Saved!
        </>
      ) : (
        label
      )}
    </button>
  );
}

function ErrorMessage({ text }) {
  if (!text) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
      <svg
        className="w-4 h-4 text-red-400 flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <p
        className="text-[12px] text-red-600 font-semibold"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        {text}
      </p>
    </div>
  );
}

function Hint({ children }) {
  return (
    <p
      className="mt-1 text-[11px] text-gray-400"
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      {children}
    </p>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 1 — PERSONAL INFORMATION
═══════════════════════════════════════════════════════════════ */
function PersonalInfoCard({ userData }) {
  const [form, setForm] = useState({
    name: userData?.name ?? "",
    email: userData?.email ?? "user@example.com",
    jobRole: userData?.jobRole ?? "",
    bio: userData?.bio ?? "",
  });
  // console.log(form);

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (key) => (e) => {
    setSaved(false);
    setForm((p) => ({ ...p, [key]: e.target.value }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const res = await updateProfile(form);
      // console.log("user updates successfully ", res);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
    setSaved(true);
  };

  return (
    <Card>
      <CardHeader
        icon="👤"
        title="Personal Information"
        description="Update your public profile details"
      />

      <div className="flex flex-col gap-5">
        {/* Row 1: Name + Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. Sara El-Masri"
            />
          </div>
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" value={form.email} disabled />
            <Hint>Email cannot be changed. Contact support if needed.</Hint>
          </div>
        </div>

        {/* Row 2: Job Role */}
        <div>
          <Label htmlFor="jobRole">Job Role</Label>
          <Select
            id="jobRole"
            value={form.jobRole}
            onChange={set("jobRole")}
            options={JOB_ROLES}
          />
        </div>

        {/* Row 3: Bio */}
        <div>
          <Label htmlFor="bio">Short Bio</Label>
          <Textarea
            id="bio"
            value={form.bio}
            onChange={set("bio")}
            placeholder="A short sentence about your background and goals…"
          />
        </div>

        {/* Save */}
        <div className="flex justify-end pt-1">
          <SaveButton onClick={handleSave} loading={loading} saved={saved} />
        </div>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SECTION 2 — CHANGE PASSWORD
═══════════════════════════════════════════════════════════════ */
function ChangePasswordCard() {
  const [fields, setFields] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (e) => {
    setError("");
    setSaved(false);
    setFields((p) => ({ ...p, [key]: e.target.value }));
  };

  const validate = () => {
    if (!fields.oldPassword) return "Please enter your current password.";
    if (!fields.newPassword) return "Please enter a new password.";
    if (fields.newPassword.length < 6)
      return "New password must be at least 6 characters.";
    if (fields.newPassword !== fields.confirmPassword)
      return "Passwords do not match.";
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) {
      setError(err);
      console.log(err);
      return;
    }
    try {
      setLoading(true);
      const res = await changePassword(fields);
      // console.log("password changed successfully ");
      setLoading(false);
      setSaved(true);
      setFields({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader
        icon="🔐"
        title="Change Password"
        description="Choose a strong password you haven't used before"
      />

      <div className="flex flex-col gap-5">
        {/* Current password */}
        <div>
          <Label htmlFor="currentPw">Current Password</Label>
          <Input
            id="currentPw"
            type="password"
            value={fields.oldPassword}
            onChange={set("oldPassword")}
            placeholder="Enter your current password"
          />
        </div>

        {/* New + Confirm in a row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <Label htmlFor="newPw">New Password</Label>
            <Input
              id="newPw"
              type="password"
              value={fields.newPassword}
              onChange={set("newPassword")}
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <Label htmlFor="confirmPw">Confirm New Password</Label>
            <Input
              id="confirmPw"
              type="password"
              value={fields.confirmPassword}
              onChange={set("confirmPassword")}
              placeholder="Re-enter new password"
            />
          </div>
        </div>

        {/* Validation rules hint */}
        <div className="flex items-start gap-4 flex-wrap">
          {[
            { ok: fields.newPassword.length >= 6, text: "Min. 6 characters" },
            {
              ok:
                fields.newPassword === fields.confirmPassword &&
                fields.newPassword !== "",
              text: "Passwords match",
            },
          ].map(({ ok, text }) => (
            <div key={text} className="flex items-center gap-1.5">
              <svg
                className={`w-3.5 h-3.5 flex-shrink-0 transition-colors ${ok ? "text-emerald-500" : "text-gray-300"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span
                className={`text-[11px] font-semibold transition-colors ${ok ? "text-emerald-600" : "text-gray-400"}`}
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                {text}
              </span>
            </div>
          ))}
        </div>

        {/* Error */}
        <ErrorMessage text={error} />

        {/* Save */}
        <div className="flex justify-end">
          <SaveButton
            onClick={handleSave}
            loading={loading}
            saved={saved}
            label="Update Password"
          />
        </div>
      </div>
    </Card>
  );
}
// function DangerZoneCard() {
//   const [loading, setLoading] = useState(false);

//   const handleDelete = async () => {
//     const confirmDelete = window.confirm(
//       "Are you sure you want to delete your account? This action cannot be undone.",
//     );

//     if (!confirmDelete) return;

//     try {
//       setLoading(true);

//       await deleteAccount(); // API call

//       // logout or redirect
//       window.location.href = "/login";
//     } catch (err) {
//       console.log(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Card>
//       <CardHeader
//         icon="⚠️"
//         title="Danger Zone"
//         description="Irreversible actions for your account"
//       />

//       <div className="flex items-center justify-between">
//         <div>
//           <p className="text-sm font-semibold text-gray-900">
//             Delete your account
//           </p>
//           <p className="text-xs text-gray-400 mt-1">
//             Once deleted, your data cannot be recovered.
//           </p>
//         </div>

//         <button
//           onClick={handleDelete}
//           disabled={loading}
//           className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition disabled:opacity-50"
//         >
//           {loading ? "Deleting..." : "Delete"}
//         </button>
//       </div>
//     </Card>
//   );
// }
/* ═══════════════════════════════════════════════════════════════
   SETTINGS PAGE — default export
   Props:
     userData   {object}
     onLogout   {Function}
     onNavigate {Function}
═══════════════════════════════════════════════════════════════ */
export default function SettingsPage({
  userData = {},
  onLogout,
  onNavigate,
  isCompany = false,
}) {
  const [activeNav, setActiveNav] = useState("settings");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const jobRole = userData.jobRole;
  const navigate = useNavigate();

  const handleNav = (key) => {
    setActiveNav(key);
    onNavigate?.(key);
  };
  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      await deleteUserById(req.user.id);
      await deletePreAssessmentResult(jobRole);
      localStorage.removeItem("userData");
      localStorage.removeItem("token");
      navigate("/login");
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <Helmet>
        <title>HireMind-Settings</title>
      </Helmet>
      <div
        className="flex min-h-screen bg-[#f0f4ff]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(37,99,235,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,0.03) 1px,transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      >
        {isCompany ? (
          <CompanySidebar
            activeKey={activeNav}
            onNavigate={handleNav}
            onLogout={onLogout}
          />
        ) : (
          <Sidebar
            activeKey={activeNav}
            onNavigate={handleNav}
            onLogout={onLogout}
          />
        )}

        <main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
          <div className="max-w-2xl mx-auto px-5 lg:px-8 py-8 flex flex-col gap-6">
            {/* Page header */}
            <div>
              <h1
                className="text-[26px] font-bold text-gray-900 leading-tight"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Settings
              </h1>
              <p
                className="text-[14px] text-gray-400 mt-1"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Manage your account information
              </p>
            </div>

            <PersonalInfoCard userData={userData} />
            <ChangePasswordCard />
            <DeleteAccountModal
              open={open}
              onClose={() => setOpen(false)}
              loading={loading}
              onConfirm={handleDeleteAccount}
            />
          </div>
        </main>
      </div>
    </>
  );
}
