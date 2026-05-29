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
import { useUserScores } from "../hooks/useUserProfile";
import Loading from "../components/Loading";

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

export default function DashboardPage({ userData = {}, onNavigate, onLogout }) {
  const firstName = userData?.name?.split(" ")[0] || "there";
  const { scores, userScores, scoresLoading } = useUserScores();

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
        <Sidebar
          activeKey="dashboard"
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
                Welcome back{firstName !== "there" ? `, ${firstName}` : ""} 👋
              </h1>
              <p
                className="text-[14px] text-gray-500 mt-1"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Track your progress and continue improving your skills
              </p>
            </section>

            <section>
              {scoresLoading ? (
                <Loading />
              ) : (
                <JourneyProgress userScores={userScores} />
              )}
            </section>

            <section>
              <SectionHeading
                title="Score Overview"
                subtitle="Your performance across all modules"
              />
              {scoresLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-5 h-[180px] animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {scores.map((s) => (
                    <ScoreCard key={s.title} {...s} />
                  ))}
                </div>
              )}
            </section>

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

            <section>
              <NextSteps onNavigate={onNavigate} />
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
