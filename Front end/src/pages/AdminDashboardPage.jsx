import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import Logo from "../components/Logo";
import Button from "../components/Button";
import {
  getAllUsers,
  deleteUserById,
  deleteAllUsers,
} from "../apis/userApi";

const JOB_ROLE_OPTIONS = [
  { id: "data-analyst", label: "Data Analyst" },
  { id: "web-developer", label: "Web Developer" },
  { id: "marketing-specialist", label: "Marketing Specialist" },
  { id: "ui-ux-designer", label: "UI/UX Designer" },
  { id: "hr-specialist", label: "HR Specialist" },
  { id: "other", label: "Other" },
];

function formatJobRole(jobRole) {
  if (!jobRole) return "—";
  const match = JOB_ROLE_OPTIONS.find((r) => r.id === jobRole);
  return match ? match.label : jobRole;
}

function StatCard({ label, value, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5">
      <p
        className="text-[13px] font-semibold text-slate-500 uppercase tracking-wide"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        {label}
      </p>
      <p
        className="text-[32px] font-extrabold mt-1"
        style={{
          fontFamily: "'Manrope', sans-serif",
          color: accent || "#0f172a",
        }}
      >
        {value}
      </p>
    </div>
  );
}

export default function AdminDashboardPage({ userData, onLogout }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const [roleFilter, setRoleFilter] = useState("all");
  const [jobRoleFilter, setJobRoleFilter] = useState("all");
  const [assessmentFilter, setAssessmentFilter] = useState("all");
  const [minScore, setMinScore] = useState("");
  const [maxScore, setMaxScore] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getAllUsers();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const jobRoleOptions = useMemo(() => {
    const fromUsers = users.map((u) => u.jobRole).filter(Boolean);
    const knownIds = new Set(JOB_ROLE_OPTIONS.map((r) => r.id));
    const extras = fromUsers
      .filter((id) => !knownIds.has(id))
      .map((id) => ({ id, label: id }));
    return [...JOB_ROLE_OPTIONS, ...extras];
  }, [users]);

  const filteredUsers = useMemo(() => {
    const min = minScore !== "" ? Number(minScore) : null;
    const max = maxScore !== "" ? Number(maxScore) : null;

    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (jobRoleFilter !== "all" && user.jobRole !== jobRoleFilter) return false;

      const hasAssessment = Boolean(user.preAssessment);
      if (assessmentFilter === "completed" && !hasAssessment) return false;
      if (assessmentFilter === "none" && hasAssessment) return false;

      if (min !== null || max !== null) {
        if (!hasAssessment) return false;
        const pct = user.preAssessment.percentage;
        if (min !== null && pct < min) return false;
        if (max !== null && pct > max) return false;
      }

      return true;
    });
  }, [users, roleFilter, jobRoleFilter, assessmentFilter, minScore, maxScore]);

  const stats = useMemo(() => {
    const students = users.filter((u) => u.role === "student").length;
    const companies = users.filter((u) => u.role === "company").length;
    const withScores = users.filter((u) => u.preAssessment).length;
    return { total: users.length, students, companies, withScores };
  }, [users]);

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Delete user "${name || "this user"}"?`)) return;

    try {
      setActionLoading(id);
      await deleteUserById(id);
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteAll = async () => {
    if (
      !window.confirm(
        "Delete ALL users except admins? This cannot be undone.",
      )
    ) {
      return;
    }

    try {
      setActionLoading("all");
      await deleteAllUsers();
      setUsers((prev) => prev.filter((u) => u.role === "admin"));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete users");
    } finally {
      setActionLoading(null);
    }
  };

  const clearFilters = () => {
    setRoleFilter("all");
    setJobRoleFilter("all");
    setAssessmentFilter("all");
    setMinScore("");
    setMaxScore("");
  };

  return (
    <>
      <Helmet>
        <title>HireMind - Admin Dashboard</title>
      </Helmet>
      <div
        className="min-h-screen bg-[#f0f4ff]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(249,115,22,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(249,115,22,0.03) 1px,transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      >
        <header className="bg-white border-b border-slate-100 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-5 lg:px-8 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Logo size="sm" />
              <div>
                <h1
                  className="text-lg font-bold text-slate-900"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  Admin Dashboard
                </h1>
                <p className="text-xs text-slate-500">
                  {userData?.email || "admin"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchUsers}
                disabled={loading}
              >
                Refresh
              </Button>
              <Button variant="ghost" size="sm" onClick={onLogout}>
                Log out
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-5 lg:px-8 py-8 flex flex-col gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total users" value={stats.total} accent="#2563eb" />
            <StatCard label="Students" value={stats.students} accent="#7c3aed" />
            <StatCard label="Companies" value={stats.companies} accent="#f97316" />
            <StatCard
              label="Pre-assessments done"
              value={stats.withScores}
              accent="#059669"
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:p-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-5">
              <div>
                <h2
                  className="text-[16px] font-bold text-slate-900"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  Filters
                </h2>
                <p className="text-[13px] text-slate-500 mt-0.5">
                  Showing {filteredUsers.length} of {users.length} users
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDeleteAll}
                  loading={actionLoading === "all"}
                  disabled={actionLoading !== null}
                  className="!bg-red-600 hover:!bg-red-700"
                >
                  Delete all users
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-600">Role</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
                >
                  <option value="all">All roles</option>
                  <option value="student">Student</option>
                  <option value="company">Company</option>
                  <option value="admin">Admin</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-600">
                  Job role
                </span>
                <select
                  value={jobRoleFilter}
                  onChange={(e) => setJobRoleFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
                >
                  <option value="all">All job roles</option>
                  {jobRoleOptions.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-600">
                  Pre-assessment
                </span>
                <select
                  value={assessmentFilter}
                  onChange={(e) => setAssessmentFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-200"
                >
                  <option value="all">All</option>
                  <option value="completed">Completed</option>
                  <option value="none">Not completed</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-600">
                  Min score %
                </span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={minScore}
                  onChange={(e) => setMinScore(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-600">
                  Max score %
                </span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="100"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200"
                />
              </label>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {error && (
              <div className="px-6 py-4 bg-red-50 text-red-600 text-sm border-b border-red-100">
                {error}
              </div>
            )}

            {loading ? (
              <div className="px-6 py-16 text-center text-slate-500">
                Loading users...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="px-6 py-16 text-center text-slate-500">
                No users match your filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-5 py-3.5 font-semibold text-slate-600">
                        Name
                      </th>
                      <th className="px-5 py-3.5 font-semibold text-slate-600">
                        Email
                      </th>
                      <th className="px-5 py-3.5 font-semibold text-slate-600">
                        Role
                      </th>
                      <th className="px-5 py-3.5 font-semibold text-slate-600">
                        Job role
                      </th>
                      <th className="px-5 py-3.5 font-semibold text-slate-600">
                        Pre-assessment
                      </th>
                      <th className="px-5 py-3.5 font-semibold text-slate-600 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr
                        key={user._id}
                        className="border-b border-slate-50 hover:bg-slate-50/50"
                      >
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {user.name || "—"}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {user.email}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${
                              user.role === "admin"
                                ? "bg-amber-100 text-amber-800"
                                : user.role === "company"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-violet-100 text-violet-800"
                            }`}
                          >
                            {user.role || "—"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {formatJobRole(user.jobRole)}
                        </td>
                        <td className="px-5 py-4">
                          {user.preAssessment ? (
                            <div>
                              <span className="font-semibold text-emerald-700">
                                {user.preAssessment.percentage}%
                              </span>
                              <span className="text-slate-400 text-xs ml-1">
                                ({user.preAssessment.score}/
                                {user.preAssessment.total})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">Not taken</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {user.role !== "admin" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDeleteUser(user._id, user.name)
                              }
                              loading={actionLoading === user._id}
                              disabled={actionLoading !== null}
                              className="!text-red-600 !border-red-200 hover:!bg-red-50"
                            >
                              Delete
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
