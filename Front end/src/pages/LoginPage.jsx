import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import Logo from "../components/Logo";
import FieldLabel from "../components/FieldLabel";
import TextInput from "../components/TextInput";
import PasswordInput from "../components/PasswordInput";
import Button from "../components/Button";
import { loginUser } from "../apis/authApi";
import { Helmet } from "react-helmet-async";

function validate({ email, password }) {
  const errors = {};

  // ── الإيميل ──
  if (!email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.com$/.test(email)) {
    errors.email = "Email must be a valid .com address";
  }

  // ── الباسورد ──
  if (!password) {
    errors.password = "Password is required";
  }

  return errors;
}

export default function LoginPage({ setUserData }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const setField = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errs = validate(form);

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    try {
      setErrors({});
      setLoading(true);

      const res = await loginUser(form);

      const user = res.data.user;

      setUserData?.(user);
      localStorage.setItem("token", res.data.token);
      setLoading(false);

      if (user.role === "admin") {
        navigate("/admin");
      } else if (user.role === "company") {
        const saved = localStorage.getItem("userData");
        let merged = user;
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (
              parsed.email === user.email &&
              parsed.companyAddress
            ) {
              merged = { ...user, companyAddress: parsed.companyAddress };
            }
          } catch {
            /* keep merged as user */
          }
        }
        setUserData?.(merged);
        navigate("/company/dashboard");
      } else if (!user.role) {
        navigate("/experience");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setLoading(false);

      console.log(err.response?.data || err.message);

      setErrors({
        general: err.response?.data?.message || "Login failed",
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>HireMind-Login</title>
      </Helmet>
      <div className="auth-bg min-h-screen flex items-center justify-center px-4 py-12">
        {/* Decorative orbs */}
        <div
          style={{
            position: "absolute",
            top: "10%",
            right: "15%",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(249,115,22,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "15%",
            left: "10%",
            width: 250,
            height: 250,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div className="animate-fade-up w-full max-w-[440px] relative z-10">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-2xl px-6 py-3 shadow-lg">
              <Logo size="md" />
            </div>
          </div>

          <div className="auth-card px-8 py-9">
            {/* Header */}
            <div className="text-center mb-8">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4"
                style={{
                  background: "linear-gradient(135deg,#fff7ed,#fed7aa)",
                }}
              >
                🔐
              </div>
              <h1
                className="text-[24px] font-extrabold text-slate-900 mb-1.5"
                style={{
                  fontFamily: "'Manrope', sans-serif",
                  letterSpacing: "-0.5px",
                }}
              >
                Welcome Back
              </h1>
              <p
                className="text-sm text-slate-500"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Log in to continue your interview prep
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <FieldLabel htmlFor="login-email">Email Address</FieldLabel>
                <TextInput
                  id="login-email"
                  type="email"
                  value={form.email}
                  onChange={setField("email")}
                  icon="✉️"
                  error={errors.email}
                />
              </div>
              <div>
                <FieldLabel htmlFor="login-password">Password</FieldLabel>
                <PasswordInput
                  id="login-password"
                  value={form.password}
                  onChange={setField("password")}
                  error={errors.password}
                />
              </div>
              {errors.general && (
                <p className="text-red-500 text-sm">{errors.general}</p>
              )}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                disabled={loading}
              >
                Log In →
              </Button>

              <div className="section-divider">
                <span>or</span>
              </div>

              <p
                className="text-center text-[13px] text-slate-500"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="font-bold hover:underline"
                  style={{ color: "#f97316" }}
                >
                  Create one free
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
