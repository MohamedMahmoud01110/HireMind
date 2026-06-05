import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import ExperienceStep from "./pages/ExperienceStep";
import ToolsStep from "./pages/ToolsStep";
import SkillsStep from "./pages/SkillsStep";
import JobRoleStep from "./pages/JobRoleStep";
import DashboardPage from "./pages/DashboardPage";
import CVAnalysisPage from "./pages/CVAnalysisPage";
import AssessmentPage from "./pages/AssessmentPage";
import AIInterviewPage from "./pages/AIInterviewPage";
import MyReportPage from "./pages/MyReportPage";
import PaymentPage from "./pages/PaymentPage";
import SettingsPage from "./pages/SettingsPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";

const NAV_MAP = {
  dashboard: "/dashboard",
  cv: "/cv-analysis",
  assessment: "/assessment",
  interview: "/interview",
  report: "/report",
  payment: "/payment",
  settings: "/settings",
};

function AppRoutes() {
  // ✅ load user from localStorage
  const [userData, setUserData] = useState(() => {
    const saved = localStorage.getItem("userData");
    return saved ? JSON.parse(saved) : null;
  });

  const navigate = useNavigate();

  const goTo = (path) => navigate(path);

  const handleSidebarNav = (key) => {
    const path = NAV_MAP[key];
    if (path) navigate(path);
  };

  useEffect(() => {
    if (userData && userData.email) {
      localStorage.setItem("userData", JSON.stringify(userData));
    }
  }, [userData]);

  const logout = () => {
    setUserData(null);
    localStorage.removeItem("userData");
    localStorage.removeItem("token");
    navigate("/login");
  };

  // ✅ protect routes
  const protect = (component) => {
    return userData?.email ? component : <Navigate to="/login" />;
  };

  const adminProtect = (component) => {
    if (!userData?.email) return <Navigate to="/login" />;
    if (userData?.role !== "admin") return <Navigate to="/dashboard" />;
    return component;
  };

  return (
    <Routes>
      {/* Root */}
      <Route
        path="/"
        element={
          userData?.email ? (
            userData.role === "admin" ? (
              <Navigate to="/admin" />
            ) : (
              <Navigate to="/dashboard" />
            )
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      {/* Signup */}
      <Route
        path="/signup"
        element={
          <SignupPage
            userData={userData}
            setUserData={setUserData}
            goNext={() => goTo("/experience")} // ✅ FIX
          />
        }
      />

      {/* Login */}
      <Route path="/login" element={<LoginPage setUserData={setUserData} />} />

      {/* Steps */}
      <Route
        path="/experience"
        element={protect(
          <ExperienceStep
            userData={userData}
            setUserData={setUserData}
            goNext={() => goTo("/tools")}
            goBack={() => goTo("/signup")}
          />,
        )}
      />

      <Route
        path="/tools"
        element={protect(
          <ToolsStep
            userData={userData}
            setUserData={setUserData}
            goNext={() => goTo("/skills")}
            goBack={() => goTo("/experience")}
          />,
        )}
      />

      <Route
        path="/skills"
        element={protect(
          <SkillsStep
            userData={userData}
            setUserData={setUserData}
            goNext={() => goTo("/dashboard")}
            goBack={() => goTo("/tools")}
          />,
        )}
      />

      {/* <Route
        path="/job-role"
        element={protect(
          <JobRoleStep
            userData={userData}
            setUserData={setUserData}
            goNext={() => goTo("/dashboard")} // ✅ صح
            goBack={() => goTo("/skills")}
          />,
        )}
      /> */}

      {/* Admin */}
      <Route
        path="/admin"
        element={adminProtect(
          <AdminDashboardPage userData={userData} onLogout={logout} />,
        )}
      />

      {/* Main Pages */}
      <Route
        path="/dashboard"
        element={protect(
          <DashboardPage
            userData={userData}
            onLogout={logout}
            onNavigate={handleSidebarNav}
          />,
        )}
      />

      <Route
        path="/cv-analysis"
        element={protect(
          <CVAnalysisPage
            userData={userData}
            onLogout={logout}
            onNavigate={handleSidebarNav}
          />,
        )}
      />

      <Route
        path="/assessment"
        element={protect(
          <AssessmentPage
            userData={userData}
            goNext={() => goTo("/interview")}
            goBack={() => goTo("/dashboard")}
            onLogout={logout}
            onNavigate={handleSidebarNav}
          />,
        )}
      />

      <Route
        path="/interview"
        element={protect(
          <AIInterviewPage
            userData={userData}
            goNext={() => goTo("/report")}
            goBack={() => goTo("/assessment")}
            onLogout={logout}
            onNavigate={handleSidebarNav}
          />,
        )}
      />

      <Route
        path="/report"
        element={protect(
          <MyReportPage
            userData={userData}
            goBack={() => goTo("/dashboard")}
            goPayment={() => goTo("/payment")}
            onLogout={logout}
            onNavigate={handleSidebarNav}
          />,
        )}
      />

      <Route
        path="/payment"
        element={protect(
          <PaymentPage
            userData={userData}
            setUserData={setUserData}
            onLogout={logout}
            goBack={() => goTo("/dashboard")}
            onNavigate={handleSidebarNav}
          />,
        )}
      />

      <Route
        path="/settings"
        element={protect(
          <SettingsPage
            userData={userData}
            onLogout={logout}
            onNavigate={handleSidebarNav}
          />,
        )}
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
