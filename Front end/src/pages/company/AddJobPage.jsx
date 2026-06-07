import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import CompanySidebar from "../../components/dashboard/CompanySidebar";
import FieldLabel from "../../components/FieldLabel";
import TextInput from "../../components/TextInput";
import Button from "../../components/Button";
import { saveCompanyJob } from "../../utils/companyJobsStorage";

const JOB_TYPES = ["Full-time", "Part-time", "Internship", "Remote"];

const INITIAL_FORM = {
  jobName: "",
  description: "",
  requirements: "",
  yearsOfExperience: "",
  jobType: "Full-time",
  location: "",
  salary: "",
};

export default function AddJobPage({ userData = {}, onNavigate, onLogout }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const setField = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.jobName.trim()) e.jobName = "Job name is required";
    if (!form.description.trim()) e.description = "Description is required";
    if (!form.requirements.trim())
      e.requirements = "Requirements are required";
    if (!form.yearsOfExperience.trim()) {
      e.yearsOfExperience = "Years of experience is required";
    } else if (isNaN(Number(form.yearsOfExperience))) {
      e.yearsOfExperience = "Must be a number";
    }
    if (!form.location.trim()) e.location = "Location is required";
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    saveCompanyJob(userData.email, {
      ...form,
      yearsOfExperience: Number(form.yearsOfExperience),
    });

    setSuccess(true);
    setForm(INITIAL_FORM);
    setErrors({});
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <>
      <Helmet>
        <title>HireMind - Add Job</title>
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
          activeKey="add-job"
          onNavigate={onNavigate}
          onLogout={onLogout}
        />

        <main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
          <div className="max-w-2xl mx-auto px-5 lg:px-8 py-8">
            <section className="mb-7">
              <h1
                className="text-[26px] font-bold text-gray-900"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Add New Job
              </h1>
              <p
                className="text-[14px] text-gray-500 mt-1"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Post a new job opening for students to apply
              </p>
            </section>

            {success && (
              <div
                className="mb-5 px-4 py-3 rounded-xl text-[13px] font-semibold text-green-700 bg-green-50 border border-green-200"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Job posted successfully! View it in My Jobs.
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col gap-5"
            >
              <div>
                <FieldLabel htmlFor="jobName">Job Name</FieldLabel>
                <TextInput
                  id="jobName"
                  value={form.jobName}
                  onChange={setField("jobName")}
                  icon="💼"
                  placeholder="e.g. Frontend Developer"
                  error={errors.jobName}
                />
              </div>

              <div>
                <FieldLabel htmlFor="jobType">Job Type</FieldLabel>
                <select
                  id="jobType"
                  value={form.jobType}
                  onChange={setField("jobType")}
                  className="field-input cursor-pointer w-full"
                >
                  {JOB_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel htmlFor="yearsOfExperience">
                  Years of Experience Required
                </FieldLabel>
                <TextInput
                  id="yearsOfExperience"
                  value={form.yearsOfExperience}
                  onChange={setField("yearsOfExperience")}
                  icon="📅"
                  placeholder="e.g. 2"
                  error={errors.yearsOfExperience}
                />
              </div>

              <div>
                <FieldLabel htmlFor="location">Location</FieldLabel>
                <TextInput
                  id="location"
                  value={form.location}
                  onChange={setField("location")}
                  icon="📍"
                  placeholder="e.g. Cairo, Egypt"
                  error={errors.location}
                />
              </div>

              <div>
                <FieldLabel htmlFor="salary" optional>
                  Salary Range
                </FieldLabel>
                <TextInput
                  id="salary"
                  value={form.salary}
                  onChange={setField("salary")}
                  icon="💰"
                  placeholder="e.g. 8,000 - 12,000 EGP/month"
                />
              </div>

              <div>
                <FieldLabel htmlFor="description">Job Description</FieldLabel>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={setField("description")}
                  rows={4}
                  placeholder="Describe the role, responsibilities, and what the candidate will do..."
                  className="field-input w-full resize-none"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                />
                {errors.description && (
                  <p className="mt-1 text-[12px] text-red-500">
                    {errors.description}
                  </p>
                )}
              </div>

              <div>
                <FieldLabel htmlFor="requirements">Requirements</FieldLabel>
                <textarea
                  id="requirements"
                  value={form.requirements}
                  onChange={setField("requirements")}
                  rows={4}
                  placeholder="List required skills, education, and qualifications..."
                  className="field-input w-full resize-none"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                />
                {errors.requirements && (
                  <p className="mt-1 text-[12px] text-red-500">
                    {errors.requirements}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" variant="primary" size="lg">
                  Post Job →
                </Button>
                <button
                  type="button"
                  onClick={() => onNavigate?.("my-jobs")}
                  className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  View My Jobs
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}
