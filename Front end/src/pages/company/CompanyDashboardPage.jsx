import React, { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import CompanySidebar from "../../components/dashboard/CompanySidebar";
import {
  getCompanyJobs,
  getCompanyJobStats,
} from "../../utils/companyJobsStorage";

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p
            className="text-[13px] text-slate-500 font-medium"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {label}
          </p>
          <p
            className="text-[28px] font-bold text-slate-900 mt-1"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {value}
          </p>
        </div>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ background: color }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function CompanyDashboardPage({
  userData = {},
  onNavigate,
  onLogout,
}) {
  const companyName = userData?.name?.split(" ")[0] || "there";
  const stats = useMemo(
    () => getCompanyJobStats(userData?.email),
    [userData?.email],
  );
  const recentJobs = useMemo(
    () => getCompanyJobs(userData?.email).slice(0, 3),
    [userData?.email],
  );

  return (
    <>
      <Helmet>
        <title>HireMind - Company Dashboard</title>
      </Helmet>
      <div
        className="flex min-h-screen bg-[#f0f4ff]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(37,99,235,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,0.03) 1px,transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      >
        <CompanySidebar
          activeKey="company-dashboard"
          onNavigate={onNavigate}
          onLogout={onLogout}
        />

        <main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
          <div className="max-w-5xl mx-auto px-5 lg:px-8 py-8 flex flex-col gap-7">
            <section>
              <h1
                className="text-[26px] font-bold text-gray-900 leading-tight"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Welcome, {companyName} 🏢
              </h1>
              <p
                className="text-[14px] text-gray-500 mt-1"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Manage your job postings and track student applications
              </p>
              {userData?.companyAddress && (
                <p
                  className="text-[13px] text-blue-600 mt-2 flex items-center gap-1"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  📍 {userData.companyAddress}
                </p>
              )}
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                label="Total Jobs Posted"
                value={stats.totalJobs}
                icon="💼"
                color="#eff6ff"
              />
              <StatCard
                label="Total Student Applicants"
                value={stats.totalApplicants}
                icon="🎓"
                color="#f0fdf4"
              />
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-[16px] font-bold text-gray-900"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  Recent Job Postings
                </h2>
                <button
                  type="button"
                  onClick={() => onNavigate?.("add-job")}
                  className="text-[13px] font-semibold text-blue-600 hover:underline"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  + Add New Job
                </button>
              </div>

              {recentJobs.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
                  <p className="text-4xl mb-3">📋</p>
                  <p
                    className="text-[14px] text-slate-500"
                    style={{ fontFamily: "'Manrope', sans-serif" }}
                  >
                    No jobs posted yet. Add your first job to start receiving
                    applications.
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate?.("add-job")}
                    className="mt-4 px-5 py-2.5 rounded-xl text-white text-[13px] font-semibold"
                    style={{
                      background:
                        "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
                      fontFamily: "'Manrope', sans-serif",
                    }}
                  >
                    Add Your First Job
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {recentJobs.map((job) => (
                    <div
                      key={job.id}
                      className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <h3
                          className="text-[15px] font-bold text-slate-900 truncate"
                          style={{ fontFamily: "'Manrope', sans-serif" }}
                        >
                          {job.jobName}
                        </h3>
                        <p
                          className="text-[12px] text-slate-400 mt-0.5"
                          style={{ fontFamily: "'Manrope', sans-serif" }}
                        >
                          {job.jobType} · {job.yearsOfExperience} yrs exp ·{" "}
                          {job.location}
                        </p>
                      </div>
                      <div className="flex-shrink-0 text-center">
                        <p
                          className="text-[20px] font-bold text-blue-600"
                          style={{ fontFamily: "'Manrope', sans-serif" }}
                        >
                          {job.applicantsCount}
                        </p>
                        <p
                          className="text-[11px] text-slate-400"
                          style={{ fontFamily: "'Manrope', sans-serif" }}
                        >
                          applicants
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
