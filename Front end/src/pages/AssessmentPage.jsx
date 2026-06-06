import React, { useState, useEffect, useCallback, useRef } from "react";
import Sidebar from "../components/dashboard/Sidebar";
import AssessmentHeader from "../components/assessment/AssessmentHeader";
import QuestionCard from "../components/assessment/QuestionCard";
import NavigationButtons from "../components/assessment/NavigationButtons";
import { getJobRole } from "../apis/userApi";
import {
  useClearUserScore,
  useUpdateUserScore,
  useUserProfile,
} from "../hooks/useUserProfile";
import {
  ASSESSMENT_QUESTIONS,
  TOTAL_TIME_SECONDS,
} from "../data/assessmentQuestions";
import { Helmet } from "react-helmet-async";
import { getPreAssessment } from "../apis/preAssessmentApi";
import {
  deletePreAssessmentResult,
  getPreAssessmentResult,
  getQuestionsByPreAssessmentId,
  submitPreAssessmentAnswers,
} from "../apis/preAssessmentQuestionsApi";
import Loading from "../components/Loading";
import FeatureAlreadyTakenModal from "../components/FeatureAlreadyTakenModal";
import { useNavigate } from "react-router-dom";
import {
  FEATURES,
  getFeatureScore,
  hasActivePlan,
  hasAttemptedFeature,
} from "../utils/featureAccess";
import NoJobRoleState from "../components/NoJobRoleState";
import { useQueryClient } from "@tanstack/react-query";

const LS_KEY = "hiremind_assessment_answers";

/* ═══════════════════════════════════════════════════════════════
   QuestionDotNav — clickable mini dots showing answered status
═══════════════════════════════════════════════════════════════ */
function QuestionDotNav({ questions, total, current, answers, onJump }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
      <p
        className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        Questions
      </p>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: total }, (_, i) => {
          const questionId = questions[i]?._id;
          // const isAnswered =
          //   answers[questionId] !== undefined && answers[questionId] !== null;
          const isAnswered = Boolean(answers[questionId]);
          const isCurrent = i === current;
          return (
            <button
              key={i}
              onClick={() => onJump(i)}
              title={`Question ${i + 1}`}
              className={[
                "w-8 h-8 rounded-lg text-[12px] font-bold transition-all duration-150 flex-shrink-0",
                isCurrent
                  ? "bg-blue-600 text-white shadow-sm scale-110"
                  : isAnswered
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : "bg-gray-100 text-gray-400 hover:bg-gray-200",
              ].join(" ")}
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 flex-wrap">
        {[
          { color: "bg-blue-600", label: "Current" },
          {
            color: "bg-emerald-100 border border-emerald-200",
            label: "Answered",
          },
          { color: "bg-gray-100", label: "Pending" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${color}`} />
            <span
              className="text-[11px] text-gray-400"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SubmitConfirmModal
═══════════════════════════════════════════════════════════════ */
function SubmitConfirmModal({
  answeredCount,
  total,
  onConfirm,
  onCancel,
  isSubmitted,
}) {
  const unanswered = total - answeredCount;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative bg-white rounded-2xl border border-gray-100 shadow-xl px-8 py-7 max-w-sm w-full animate-fade-up">
        <div className="text-3xl mb-4">📋</div>
        <h3
          className="text-[18px] font-bold text-gray-900 mb-2"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Submit PreAssessment?
        </h3>
        <p
          className="text-[13px] text-gray-500 leading-relaxed mb-2"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          You've answered{" "}
          <strong className="text-gray-800">{answeredCount}</strong> of{" "}
          <strong className="text-gray-800">{total}</strong> questions.
        </p>
        {unanswered > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
            <span className="text-base">⚠️</span>
            <p
              className="text-[12px] text-amber-700 font-semibold"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {unanswered} question{unanswered > 1 ? "s" : ""} left unanswered
            </p>
          </div>
        )}
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-all"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            Keep Going
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-[13px] font-bold hover:bg-emerald-500 transition-all"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {isSubmitted ? "Submitting..." : "Submit Now"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TimeUpBanner — shown for 1s before auto-submitting
═══════════════════════════════════════════════════════════════ */
function TimeUpBanner() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl px-10 py-8 flex flex-col items-center gap-3 animate-fade-up shadow-2xl">
        <div className="text-5xl">⏰</div>
        <h2
          className="text-[22px] font-bold text-gray-900"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Time's Up!
        </h2>
        <p
          className="text-[13px] text-gray-500"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Submitting your assessment…
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AssessmentPage
═══════════════════════════════════════════════════════════════ */
/**
 * Props:
 *   userData    {object}   — shared app state
 *   goNext      {Function} — navigates to the AI Interview page
 *   goBack      {Function} — navigates back (optional)
 *   onLogout    {Function} — sidebar logout handler
 */
export default function AssessmentPage({
  userData = {},
  goNext,
  goBack,
  onLogout,
  onNavigate,
}) {
  // const questions = ASSESSMENT_QUESTIONS;
  const LABELS = ["A", "B", "C", "D"];
  /* ── Core state ── */
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isRetake, setIsRetake] = useState(false);
  const [jobRole, setJobRole] = useState("");
  const [preAssessmentQuestions, setPreAssessmentQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const hasResult = Boolean(result);
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY));

      if (!saved || typeof saved !== "object") return {};
      return saved;
    } catch {
      return {};
    }
  });
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME_SECONDS);
  const [transitioning, setTransitioning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();
  const { profile } = useUserProfile();
  const updateScore = useUpdateUserScore();
  const clearScore = useClearUserScore();
  const [timeUp, setTimeUp] = useState(false);
  const timerRef = useRef(null);
  const questions = preAssessmentQuestions || [];
  const total = questions?.length || 0;

  //
  /* ── Derived values ── */
  const currentQuestion = questions[currentIndex];
  const selectedAnswer = answers[currentQuestion?._id] ?? null;
  const answeredCount = Object.keys(answers).length;
  // fetch user job role
  useEffect(() => {
    const fetchRole = async () => {
      const role = await getJobRole();
      const jobRole = role.data.jobRole;
      setJobRole(jobRole);

      // console.log(jobRole);
    };

    fetchRole();
  }, []);

  // filter answers based on current questions
  useEffect(() => {
    if (!questions.length) return;

    setAnswers((prev) => {
      const validIds = new Set(questions.map((q) => q._id));

      const filtered = {};

      Object.entries(prev).forEach(([key, value]) => {
        if (validIds.has(key)) {
          filtered[key] = value;
        }
      });

      return filtered;
    });
  }, [questions]);
  // fetch questions based on  pre assessment id that based on job role

  useEffect(() => {
    if (!jobRole) return;

    const normalizeTitle = (str) =>
      str
        .toLowerCase()
        .split(" ")
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

    const fetchData = async () => {
      try {
        setIsLoading(true);

        // 1 check if user already took assessment
        const resultRes = await getPreAssessmentResult(jobRole);
        // console.log(resultRes);
        if (resultRes) {
          setResult(resultRes);
          return;
        }
        // 2 if not taken → fetch questions
        const questionsRes = await getQuestionsByPreAssessmentId(
          normalizeTitle(jobRole),
        );
        // console.log(questionsRes);

        const questions = questionsRes || [];

        const shuffled = [...questions].sort(() => 0.5 - Math.random());
        setPreAssessmentQuestions(shuffled.slice(0, 20));
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [jobRole]);

  useEffect(() => {
    if (result || isLoading || !jobRole || !profile) return;

    if (hasAttemptedFeature(profile.scores, FEATURES.PRE_ASSESSMENT)) {
      const percentage = getFeatureScore(profile.scores, FEATURES.PRE_ASSESSMENT) ?? 0;
      setResult({
        percentage,
        score: Math.round((percentage / 100) * 20),
        total: 20,
      });
    }
  }, [profile, jobRole, result, isLoading]);

  /* ── Persist answers to localStorage ── */
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(answers));
    } catch {}
  }, [answers]);

  /* ── Countdown timer ── */
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setTimeUp(true);
          // Auto-submit after 1.5s banner display
          setTimeout(() => {
            localStorage.removeItem(LS_KEY);
            goNext?.();
          }, 1500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [goNext]);

  /* ── Keyboard navigation ── */
  useEffect(() => {
    const handler = (e) => {
      if (showConfirm || transitioning || timeUp) return;
      if (e.key === "ArrowRight" && answers[currentQuestion?._id] !== undefined)
        handleNext();
      if (e.key === "ArrowLeft" && currentIndex > 0) handlePrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIndex, answers, showConfirm, transitioning, timeUp]);

  /* ── Handlers ── */
  const handleSelect = (optionIndex) => {
    // const selectedOption = currentQuestion.options[optionIndex];
    // const answerLetter = selectedOption.charAt(0);
    const answerLetter = LABELS[optionIndex];
    setAnswers((prev) => ({ ...prev, [currentQuestion._id]: answerLetter }));
  };

  const handleNext = useCallback(() => {
    if (answers[currentQuestion?._id] === undefined) return;

    if (currentIndex === total - 1) {
      setShowConfirm(true);
      return;
    }

    setTransitioning(true);

    setTimeout(() => {
      setCurrentIndex((i) => i + 1);
      setTransitioning(false);
    }, 120);
  }, [currentIndex, answers, total, currentQuestion]);

  const handlePrev = useCallback(() => {
    if (currentIndex === 0) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrentIndex((i) => i - 1);
      setTransitioning(false);
    }, 120);
  }, [currentIndex]);

  const handleJump = (index) => {
    if (index === currentIndex) return;
    setTransitioning(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setTransitioning(false);
    }, 120);
  };

  const handleConfirmSubmit = async () => {
    try {
      setIsSubmitted(true);
      clearInterval(timerRef.current);

      const res = await submitPreAssessmentAnswers(jobRole, answers);
      setResult(res);
      await updateScore.mutateAsync({
        title: "Pre Assessment",
        score: Math.round((res.score / 20) * 100),
      });
      localStorage.removeItem(LS_KEY);
    } catch (error) {
      console.log(error.response?.data);
    } finally {
      setIsSubmitted(false);
    }
  };

  const handleRetake = async () => {
    if (!hasActivePlan(profile)) {
      navigate("/payment");
      return;
    }

    try {
      setIsRetake(true);

      await clearScore.mutateAsync(FEATURES.PRE_ASSESSMENT);
      await deletePreAssessmentResult(jobRole);
      await queryClient.invalidateQueries({
        queryKey: ["preAssessmentResult"],
      });
      setResult(null);
      setShowConfirm(false);

      const normalizeTitle = (str) =>
        str
          .toLowerCase()
          .split(" ")
          .filter(Boolean)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

      const questionsRes = await getQuestionsByPreAssessmentId(
        normalizeTitle(jobRole),
      );

      const questions = questionsRes || [];

      const shuffled = [...questions].sort(() => 0.5 - Math.random());

      setPreAssessmentQuestions(shuffled.slice(0, 20));

      setCurrentIndex(0);
      setAnswers({});

      localStorage.removeItem(LS_KEY);
    } catch (error) {
      console.error(error);
    } finally {
      setIsRetake(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>HireMind-PreAssessment</title>
      </Helmet>
      <div
        className="flex min-h-screen bg-[#f0f4ff]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(37,99,235,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,0.03) 1px,transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      >
        {/* ───────── Overlays ───────── */}

        {timeUp && <TimeUpBanner />}

        {showConfirm && (
          <SubmitConfirmModal
            answeredCount={answeredCount}
            total={total}
            isSubmitted={isSubmitted}
            onConfirm={handleConfirmSubmit}
            onCancel={() => setShowConfirm(false)}
          />
        )}

        {/* ───────── Sidebar ───────── */}

        <aside className="shrink-0">
          <Sidebar
            activeKey="assessment"
            onNavigate={onNavigate}
            onLogout={onLogout}
          />
        </aside>

        {/* ───────── Main Content ───────── */}

        <main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
          <section className="max-w-3xl mx-auto px-5 lg:px-8 py-8 flex flex-col gap-5">
            {!jobRole ? (
              <NoJobRoleState />
            ) : isLoading ? (
              <div className="flex min-h-[60vh] items-center justify-center">
                <Loading />
              </div>
            ) : hasResult ? (
              /* Already Taken State */
              <div className="flex min-h-[60vh] items-center justify-center">
                <FeatureAlreadyTakenModal
                  open={hasResult}
                  title="Pre-Assessment Already Completed"
                  message="You have already taken this pre-assessment."
                  score={
                    result?.percentage ??
                    getFeatureScore(profile?.scores, FEATURES.PRE_ASSESSMENT) ??
                    0
                  }
                  extraDetails={
                    result
                      ? `You answered ${result.total ?? 20} questions and got ${result.score ?? 0} correct.`
                      : null
                  }
                  onClose={() => navigate("/dashboard")}
                  onRetake={handleRetake}
                  isRetakeLoading={isRetake}
                />
              </div>
            ) : (
              <>
                {/* Header */}
                <AssessmentHeader
                  currentIndex={currentIndex}
                  total={total}
                  timeLeft={timeLeft}
                />

                {/* Progress Dots */}
                <QuestionDotNav
                  total={total}
                  current={currentIndex}
                  answers={answers}
                  onJump={handleJump}
                  questions={questions}
                />

                {/* Question Card */}
                <div
                  className="transition-opacity duration-150"
                  style={{ opacity: transitioning ? 0 : 1 }}
                >
                  {currentQuestion && (
                    <QuestionCard
                      questionData={currentQuestion}
                      selectedAnswer={selectedAnswer}
                      onSelect={handleSelect}
                      questionIndex={currentIndex}
                    />
                  )}
                </div>

                {/* Navigation */}
                <NavigationButtons
                  currentIndex={currentIndex}
                  total={total}
                  canProceed={selectedAnswer !== null}
                  disabled={transitioning || timeUp}
                  onPrev={handlePrev}
                  onNext={handleNext}
                  onSubmit={() => setShowConfirm(true)}
                />
              </>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
