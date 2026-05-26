import React from "react";
import Sidebar from "../components/dashboard/Sidebar";
import JourneyProgress from "../components/dashboard/JourneyProgress";
import ScoreCard from "../components/dashboard/ScoreCard";
import {
  ActivityCard,
  InsightsCard,
} from "../components/dashboard/ActivityInsights";
import NextSteps from "../components/dashboard/NextSteps";
import { Helmet } from "react-helmet-async";

/* ─── Mock data ─────────────────────────────────────────────── */
const SCORES = [
  { title: "CV Score", icon: "📄", score: 82, color: "blue" },
  { title: "PreAssessment Score", icon: "📝", score: 74, color: "violet" },
  { title: "Interview Score", icon: "🎙️", score: 68, color: "amber" },
  { title: "Overall Score", icon: "🏆", score: 75, color: "emerald" },
];

const COMPLETED_STEPS = ["cv", "assessment", "interview", "report"];

/* ─── Section heading ────────────────────────────────────────── */
function SectionHeading({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h2
        className="text-[16px] font-bold text-gray-900"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className="text-[13px] text-gray-400 mt-0.5"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ─── DashboardPage ──────────────────────────────────────────── */
export default function DashboardPage({ userData = {}, onNavigate, onLogout }) {
  const firstName = userData?.name?.split(" ")[0] || "there";

  return (
    <>
      <Helmet>
        <title>HireMind-Dashboard</title>
      </Helmet>
      <div
        className="flex min-h-screen bg-[#f0f4ff]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(249,115,22,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(249,115,22,0.03) 1px,transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      >
        {/* ── Sidebar ── */}
        <Sidebar
          activeKey="dashboard"
          onNavigate={onNavigate}
          onLogout={onLogout}
        />

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
          <div className="max-w-5xl mx-auto px-5 lg:px-8 py-8 flex flex-col gap-7">
            {/* ── 1. Welcome ── */}
            <section>
              <h1
                className="text-[26px] font-bold text-gray-900 leading-tight"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Welcome back{firstName !== "there" ? `, ${firstName}` : ""} 👋
              </h1>
              <p
                className="text-[14px] text-gray-500 mt-1"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Track your progress and continue improving your skills
              </p>
            </section>

            {/* ── 2. Journey Progress ── */}
            <section>
              <JourneyProgress completed={COMPLETED_STEPS} />
            </section>

            {/* ── 3. Score Cards ── */}
            <section>
              <SectionHeading
                title="Score Overview"
                subtitle="Your performance across all modules"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {SCORES.map((s) => (
                  <ScoreCard key={s.title} {...s} />
                ))}
              </div>
            </section>

            {/* ── 4. Activity & Insights ── */}
            <section>
              <SectionHeading
                title="Activity & Insights"
                subtitle="Your recent sessions and skill breakdown"
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ActivityCard activities={[]} />
                <InsightsCard insights={{}} />
              </div>
            </section>

            {/* ── 5. Next Steps (FIX هنا 👇) */}
            <section>
              <NextSteps onNavigate={onNavigate} />
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
