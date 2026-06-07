import React, { useState } from "react";
import { Link } from "react-router-dom";

import Logo from "../components/Logo";
import FieldLabel from "../components/FieldLabel";
import TextInput from "../components/TextInput";
import PasswordInput from "../components/PasswordInput";
import JobSelect from "../components/JobSelect";
import RoleSelect from "../components/RoleSelect";
import SkillTags from "../components/SkillTags";
import UploadBox from "../components/UploadBox";
import Button from "../components/Button";
import SuccessOverlay from "../components/SuccessOverlay";

import { useSignupForm } from "../hooks/useSignupForm";
import { registerUser } from "../apis/authApi";
import { Helmet } from "react-helmet-async";

export default function SignupPage({ setUserData, goNext }) {
  const {
    form,
    setField,
    skills,
    toggleSkill,
    cvFile,
    setCvFile,
    errors,
    handleSubmit,
    reset,
  } = useSignupForm();
  const [submitted, setSubmitted] = useState(false);
  const firstName = form.name.split(" ")[0] || "there";

  const onSubmit = async (e) => {
    e.preventDefault();
    const isValid = handleSubmit();
    if (!isValid) return;
    const isCompany = form.role === "company";
    const user = {
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role,
      jobRole: isCompany ? "" : form.jobRole || "",
      skills: isCompany ? [] : skills,
      cv: isCompany ? null : cvFile?.name || null,
      companyAddress: isCompany ? form.companyAddress : "",
    };
    try {
      setSubmitted(true);
      const res = await registerUser(user);
      const savedUser = {
        ...res.data.user,
        companyAddress: isCompany ? form.companyAddress : "",
      };
      setUserData?.(savedUser);
      localStorage.setItem("userData", JSON.stringify(savedUser));
      localStorage.setItem("token", res.data.token);

      goNext(form.role);
    } catch (err) {
      console.log(err.response?.data || err.message);
    } finally {
      setSubmitted(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>HireMind-Signup</title>
      </Helmet>
      <div className="auth-bg min-h-screen flex items-center justify-center px-4 py-12">
        {/* Decorative orbs */}
        <div
          style={{
            position: "absolute",
            top: "8%",
            left: "12%",
            width: 350,
            height: 350,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(249,115,22,0.1) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            right: "8%",
            width: 280,
            height: 280,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {submitted && <SuccessOverlay name={firstName} onReset={reset} />}

        <div className="animate-fade-up w-full max-w-[520px] relative z-10">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-2xl px-6 py-3 shadow-lg">
              <Logo size="md" />
            </div>
          </div>

          <div className="auth-card px-8 py-9">
            {/* Header */}
            <div className="text-center mb-7">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
                style={{
                  background: "linear-gradient(135deg,#fff7ed,#fed7aa)",
                }}
              >
                🚀
              </div>
              <h1
                className="text-[24px] font-extrabold text-slate-900 mb-1.5"
                style={{
                  fontFamily: "'Manrope', sans-serif",
                  letterSpacing: "-0.5px",
                }}
              >
                Create Your Account
              </h1>
              <p
                className="text-sm text-slate-500"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Start your AI-powered interview journey today
              </p>
            </div>

            <form onSubmit={onSubmit} className="flex flex-col gap-5">
              <div>
                <FieldLabel htmlFor="name">Full Name</FieldLabel>
                <TextInput
                  id="name"
                  value={form.name}
                  onChange={setField("name")}
                  icon="👤"
                  error={errors.name}
                />
              </div>
              <div>
                <FieldLabel htmlFor="email">Email Address</FieldLabel>
                <TextInput
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={setField("email")}
                  icon="✉️"
                  error={errors.email}
                />
              </div>
              <div>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <PasswordInput
                  id="password"
                  value={form.password}
                  onChange={setField("password")}
                  error={errors.password}
                />
              </div>
              <div>
                <FieldLabel htmlFor="role">Role</FieldLabel>
                <RoleSelect
                  value={form.role}
                  onChange={setField("role")}
                  error={errors.role}
                />
              </div>
              {form.role === "company" ? (
                <div>
                  <FieldLabel htmlFor="companyAddress">
                    Company Address
                  </FieldLabel>
                  <TextInput
                    id="companyAddress"
                    value={form.companyAddress}
                    onChange={setField("companyAddress")}
                    icon="📍"
                    placeholder="e.g. 123 Business St, Cairo, Egypt"
                    error={errors.companyAddress}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <FieldLabel htmlFor="jobRole">Job Role</FieldLabel>
                    <JobSelect
                      value={form.jobRole}
                      onChange={setField("jobRole")}
                      error={errors.jobRole}
                    />
                  </div>
                  <div>
                    <FieldLabel>Skills</FieldLabel>
                    <SkillTags selected={skills} onToggle={toggleSkill} />
                  </div>
                  <div>
                    <FieldLabel optional>Upload CV</FieldLabel>
                    <UploadBox file={cvFile} onFile={setCvFile} />
                  </div>
                </>
              )}
              {errors.general && (
                <p className="text-red-500 text-sm">{errors.general}</p>
              )}
              <Button type="submit" variant="primary" size="lg" fullWidth>
                {submitted ? "Submitting..." : "Create Account →"}
              </Button>

              {/* Divider */}
              <div className="section-divider">
                <span>or</span>
              </div>

              {/* Already have account link */}
              <p
                className="text-center text-[13px] text-slate-500"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                You already have an account?{" "}
                <Link
                  to="/login"
                  className="font-bold hover:underline"
                  style={{ color: "#f97316" }}
                >
                  Log in here
                </Link>
              </p>
            </form>
          </div>

          <p
            className="text-center text-xs text-slate-500 mt-6"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            AI-Powered Interview Preparation Platform
          </p>
        </div>
      </div>
    </>
  );
}
