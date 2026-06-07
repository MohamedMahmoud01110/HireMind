import React, { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import CompanySidebar from "../../components/dashboard/CompanySidebar";
import {
  getCompanyJobs,
  deleteCompanyJob,
} from "../../utils/companyJobsStorage";

function JobCard({ job, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className="text-[16px] font-bold text-slate-900"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {job.jobName}
            </h3>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: "#eff6ff",
                color: "#2563eb",
                fontFamily: "'Manrope', sans-serif",
              }}
            >
              {job.jobType}
            </span>
          </div>
          <p
            className="text-[12px] text-slate-400 mt-1"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {job.yearsOfExperience} yrs experience · {job.location}
            {job.salary ? ` · ${job.salary}` : ""}
          </p>
          <p
            className="text-[12px] text-slate-400 mt-0.5"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Posted {new Date(job.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex-shrink-0 text-center bg-blue-50 rounded-xl px-4 py-3">
          <p
            className="text-[24px] font-bold text-blue-600"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {job.applicantsCount}
          </p>
          <p
            className="text-[11px] text-blue-400 font-medium"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            students applied
          </p>
        </div>
      </div>

      <div className="px-5 pb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[12px] font-semibold text-blue-600 hover:underline"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {expanded ? "Hide details" : "View details"}
        </button>
        <button
          type="button"
          onClick={() => onDelete(job.id)}
          className="text-[12px] font-semibold text-red-400 hover:underline ml-auto"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Delete
        </button>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-50 pt-4 flex flex-col gap-3">
          <div>
            <p
              className="text-[12px] font-bold text-slate-500 uppercase tracking-wide mb-1"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Description
            </p>
            <p
              className="text-[13px] text-slate-600 leading-relaxed"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {job.description}
            </p>
          </div>
          <div>
            <p
              className="text-[12px] font-bold text-slate-500 uppercase tracking-wide mb-1"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              Requirements
            </p>
            <p
              className="text-[13px] text-slate-600 leading-relaxed whitespace-pre-line"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {job.requirements}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CompanyJobsPage({
  userData = {},
  onNavigate,
  onLogout,
}) {
  const [jobs, setJobs] = useState(() => getCompanyJobs(userData?.email));

  const refresh = useCallback(() => {
    setJobs(getCompanyJobs(userData?.email));
  }, [userData?.email]);

  const handleDelete = (jobId) => {
    deleteCompanyJob(userData.email, jobId);
    refresh();
  };

  return (
    <>
      <Helmet>
        <title>HireMind - My Jobs</title>
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
          activeKey="my-jobs"
          onNavigate={onNavigate}
          onLogout={onLogout}
        />

        <main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
          <div className="max-w-3xl mx-auto px-5 lg:px-8 py-8 flex flex-col gap-6">
            <section className="flex items-start justify-between gap-4">
              <div>
                <h1
                  className="text-[26px] font-bold text-gray-900"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  My Jobs
                </h1>
                <p
                  className="text-[14px] text-gray-500 mt-1"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  {jobs.length} job{jobs.length !== 1 ? "s" : ""} posted ·{" "}
                  {jobs.reduce((s, j) => s + (j.applicantsCount || 0), 0)}{" "}
                  total applicants
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.("add-job")}
                className="flex-shrink-0 px-4 py-2.5 rounded-xl text-white text-[13px] font-semibold"
                style={{
                  background:
                    "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
                  fontFamily: "'Manrope', sans-serif",
                }}
              >
                + Add Job
              </button>
            </section>

            {jobs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center">
                <p className="text-4xl mb-3">📋</p>
                <p
                  className="text-[14px] text-slate-500 mb-4"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  You haven't posted any jobs yet.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate?.("add-job")}
                  className="px-5 py-2.5 rounded-xl text-white text-[13px] font-semibold"
                  style={{
                    background:
                      "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)",
                    fontFamily: "'Manrope', sans-serif",
                  }}
                >
                  Post Your First Job
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
