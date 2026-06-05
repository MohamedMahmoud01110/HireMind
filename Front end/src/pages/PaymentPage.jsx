import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Sidebar from "../components/dashboard/Sidebar";
import { Helmet } from "react-helmet-async";
import {
  confirmCheckoutSession,
  createCheckoutSession,
} from "../apis/bookingApi";
import { getProfile } from "../apis/userApi";

/* ═══════════════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════════════ */
const PLANS = [
  {
    id: "single",
    title: "Single Assessment",
    price: "400",
    currency: "EGP",
    period: "one-time",
    badge: null,
    highlight: false,
    features: [
      "Complete skills assessment",
      "CV analysis with score",
      "1 AI interview simulation",
      "Basic performance report",
      "Valid for 30 days",
    ],
    cta: "Get Started",
  },
  {
    id: "premium",
    title: "Premium Package",
    price: "800",
    currency: "EGP",
    period: "per year",
    badge: "Best Value",
    highlight: true,
    features: [
      "Unlimited assessments",
      "Premium CV analysis & optimization",
      "Unlimited AI interview practice",
      "Comprehensive career reports",
      "Personalized learning paths",
      "Career coaching session (1 hour)",
      "Valid for 1 year",
    ],
    cta: "Get Started",
  },
];

const TRUST_BADGES = [
  { icon: "🔒", label: "Secure payment" },
  { icon: "↩️", label: "7-day refund" },
  { icon: "🌍", label: "Used by 2,400+" },
  { icon: "⚡", label: "Instant access" },
];

const FAQ = [
  {
    q: "Can I switch plans later?",
    a: "Yes — you can upgrade to Premium any time. Your remaining Single Assessment days are credited toward the upgrade.",
  },
  {
    q: "What payment methods are accepted?",
    a: "We accept all major credit / debit cards, Fawry, and Vodafone Cash.",
  },
  {
    q: "Is there a refund policy?",
    a: "Yes. If you are not satisfied within 7 days of purchase, contact support for a full refund — no questions asked.",
  },
  {
    q: "Does the Premium plan auto-renew?",
    a: "No. You'll receive a reminder 14 days before expiry and can choose to renew manually.",
  },
];

/* ═══════════════════════════════════════════════════════════════
   SHARED PRIMITIVES
═══════════════════════════════════════════════════════════════ */
function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAGE HEADER
═══════════════════════════════════════════════════════════════ */
function PageHeader() {
  return (
    <div className="text-center mb-10">
      {/* Eyebrow */}
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-100 mb-4"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        Simple, transparent pricing
      </span>

      <h1
        className="text-[32px] font-bold text-gray-900 leading-tight tracking-tight mb-3"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        Choose Your Plan
      </h1>

      <p
        className="text-[15px] text-gray-400 max-w-md mx-auto leading-relaxed"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        Select the perfect plan for your needs. Upgrade or cancel any time.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PLAN CARD
═══════════════════════════════════════════════════════════════ */
function PlanCard({ plan, onSelect, loadingPlanId, error }) {
  const [hovered, setHovered] = useState(false);
  const isLoading = loadingPlanId === plan.id;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={[
        "relative flex flex-col rounded-2xl border transition-all duration-300",
        "cursor-default",
        plan.highlight
          ? [
              "border-blue-300 bg-white",
              hovered
                ? "shadow-2xl shadow-blue-100 -translate-y-2"
                : "shadow-lg shadow-blue-50 -translate-y-1",
              "scale-[1.02]",
            ].join(" ")
          : [
              "border-gray-100 bg-white",
              hovered ? "shadow-lg -translate-y-1" : "shadow-sm",
            ].join(" "),
      ].join(" ")}
      style={
        plan.highlight
          ? {
              boxShadow: hovered
                ? "0 20px 60px rgba(37,99,235,0.14)"
                : "0 8px 32px rgba(37,99,235,0.10)",
            }
          : {}
      }
    >
      {/* ── Glow ring on premium ── */}
      {plan.highlight && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background:
              "linear-gradient(135deg,rgba(37,99,235,0.07) 0%,rgba(124,58,237,0.07) 100%)",
          }}
        />
      )}

      {/* ── Badge ── */}
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-white shadow-md"
            style={{
              background: "linear-gradient(90deg,#2563eb,#7c3aed)",
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            ⭐ {plan.badge}
          </span>
        </div>
      )}

      <div className="relative flex flex-col flex-1 px-7 pt-8 pb-7">
        {/* Plan title */}
        <h2
          className="text-[17px] font-bold text-gray-900 mb-1"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {plan.title}
        </h2>

        {/* Price block */}
        <div className="flex items-end gap-1.5 mb-1">
          <span
            className="text-[42px] font-bold leading-none tracking-tight"
            style={{
              fontFamily: "'Manrope', sans-serif",
              color: plan.highlight ? "#2563eb" : "#111827",
            }}
          >
            {plan.price}
          </span>
          <span
            className="text-[16px] font-bold text-gray-400 mb-1.5"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {plan.currency}
          </span>
        </div>
        <p
          className="text-[12px] text-gray-400 mb-7"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          {plan.period}
        </p>

        {/* Divider */}
        <div className="h-px bg-gray-100 mb-6" />

        {/* Features */}
        <ul className="flex flex-col gap-3 flex-1 mb-8">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <CheckIcon />
              <span
                className="text-[13px] text-gray-600 leading-relaxed"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                {feature}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        {plan.highlight ? (
          <button
            onClick={() => onSelect(plan.id)}
            disabled={!!loadingPlanId}
            className={[
              "w-full py-3.5 rounded-xl text-[14px] font-bold text-white",
              "transition-all duration-200",
              loadingPlanId ? "opacity-70 cursor-not-allowed" : "",
              !loadingPlanId && hovered ? "shadow-lg -translate-y-0.5" : "",
            ].join(" ")}
            style={{
              background: "linear-gradient(135deg,#2563eb 0%,#7c3aed 100%)",
              fontFamily: "'Manrope', sans-serif",
            }}
          >
            {isLoading ? "Redirecting to Stripe…" : plan.cta}
          </button>
        ) : (
          <button
            onClick={() => onSelect(plan.id)}
            disabled={!!loadingPlanId}
            className={[
              "w-full py-3.5 rounded-xl text-[14px] font-bold",
              "bg-gray-900 text-white",
              "transition-all duration-200",
              loadingPlanId ? "opacity-70 cursor-not-allowed" : "",
              !loadingPlanId && hovered ? "bg-gray-700 shadow-md -translate-y-0.5" : "",
            ].join(" ")}
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {isLoading ? "Redirecting to Stripe…" : plan.cta}
          </button>
        )}

        {error && (
          <p
            className="text-center text-[11px] text-red-500 mt-3"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {error}
          </p>
        )}

        {/* Reassurance micro-copy */}
        <p
          className="text-center text-[11px] text-gray-300 mt-3"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Secure checkout powered by Stripe
        </p>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TRUST STRIP
═══════════════════════════════════════════════════════════════ */
function TrustStrip() {
  return (
    <div className="flex flex-wrap justify-center gap-6 py-6">
      {TRUST_BADGES.map(({ icon, label }) => (
        <div
          key={label}
          className="flex items-center gap-2"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          <span className="text-base">{icon}</span>
          <span className="text-[12px] font-semibold text-gray-400">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   COMPARISON TABLE (simple)
═══════════════════════════════════════════════════════════════ */
const COMPARISON_ROWS = [
  { label: "Assessments", single: "1", premium: "Unlimited" },
  { label: "CV Analysis", single: "Basic", premium: "Premium" },
  { label: "AI Interview", single: "1 session", premium: "Unlimited" },
  { label: "Career Reports", single: "Basic", premium: "Full" },
  { label: "Learning Paths", single: "—", premium: "✓" },
  { label: "Coaching Session", single: "—", premium: "1 hour" },
  { label: "Validity", single: "30 days", premium: "1 year" },
];

function ComparisonTable() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-100 px-6 py-3">
        <span
          className="text-[12px] font-bold text-gray-400 uppercase tracking-widest"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Feature
        </span>
        <span
          className="text-[12px] font-bold text-gray-600 text-center uppercase tracking-widest"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Single
        </span>
        <span
          className="text-[12px] font-bold text-blue-600 text-center uppercase tracking-widest"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Premium
        </span>
      </div>

      {/* Rows */}
      {COMPARISON_ROWS.map((row, i) => (
        <div
          key={row.label}
          className={[
            "grid grid-cols-3 px-6 py-3.5 items-center",
            i % 2 === 0 ? "bg-white" : "bg-gray-50/50",
            i < COMPARISON_ROWS.length - 1 ? "border-b border-gray-100" : "",
          ].join(" ")}
        >
          <span
            className="text-[13px] font-semibold text-gray-700"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {row.label}
          </span>
          <span
            className="text-[13px] text-gray-400 text-center"
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {row.single}
          </span>
          <span
            className={[
              "text-[13px] font-semibold text-center",
              row.premium === "—" ? "text-gray-300" : "text-blue-600",
            ].join(" ")}
            style={{ fontFamily: "'Manrope', sans-serif" }}
          >
            {row.premium}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FAQ ACCORDION
═══════════════════════════════════════════════════════════════ */
function FAQSection() {
  const [open, setOpen] = useState(null);

  return (
    <div className="flex flex-col gap-3">
      <h2
        className="text-[20px] font-bold text-gray-900 text-center mb-2"
        style={{ fontFamily: "'Manrope', sans-serif" }}
      >
        Frequently Asked Questions
      </h2>

      {FAQ.map((item, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-6 py-4 text-left focus:outline-none"
          >
            <span
              className="text-[14px] font-semibold text-gray-800"
              style={{ fontFamily: "'Manrope', sans-serif" }}
            >
              {item.q}
            </span>
            <svg
              className={`w-4 h-4 text-gray-400 flex-shrink-0 ml-4 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {open === i && (
            <div className="px-6 pb-5 border-t border-gray-50">
              <p
                className="text-[13px] text-gray-500 leading-relaxed pt-3"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                {item.a}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SUCCESS MODAL
═══════════════════════════════════════════════════════════════ */
function SuccessModal({ planTitle, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Dialog */}
      <div className="relative bg-white rounded-2xl border border-gray-100 shadow-2xl px-8 py-8 max-w-sm w-full text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h3
          className="text-[20px] font-bold text-gray-900 mb-2"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          You're all set!
        </h3>
        <p
          className="text-[13px] text-gray-500 leading-relaxed mb-6"
          style={{ fontFamily: "'Manrope', sans-serif" }}
        >
          Thanks for choosing{" "}
          <strong className="text-gray-800">{planTitle}</strong>. Your access
          has been activated — start practising right away!
        </p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl text-[14px] font-bold text-white transition-all hover:-translate-y-0.5 hover:shadow-md"
          style={{
            background: "linear-gradient(135deg,#2563eb,#7c3aed)",
            fontFamily: "'Manrope', sans-serif",
          }}
        >
          Go to Dashboard →
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PAYMENT PAGE — default export
   Props:
     userData  {object}
     onLogout  {Function}
     goBack    {Function}  → back to dashboard
═══════════════════════════════════════════════════════════════ */
export default function PaymentPage({
  userData = {},
  setUserData,
  onLogout,
  goBack,
  onNavigate,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loadingPlanId, setLoadingPlanId] = useState(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const success = searchParams.get("success");
    const sessionId = searchParams.get("session_id");
    const canceled = searchParams.get("canceled");

    if (canceled === "true") {
      setCheckoutError("Payment was cancelled. You can try again when ready.");
      setSearchParams({}, { replace: true });
      return;
    }

    if (success !== "true" || !sessionId) return;

    let cancelled = false;

    const confirmPayment = async () => {
      setConfirming(true);
      try {
        const result = await confirmCheckoutSession(sessionId);
        const plan =
          PLANS.find((p) => p.id === result.plan) ||
          PLANS.find((p) => p.title === result.planName);
        if (!cancelled) {
          if (plan) setSelectedPlan(plan);
          try {
            const profile = await getProfile();
            setUserData?.(profile);
          } catch {
            /* profile refresh is best-effort */
          }
        }
      } catch (err) {
        if (!cancelled) {
          setCheckoutError(
            err.response?.data?.message ||
              "Payment received but confirmation failed. Contact support if access is missing.",
          );
        }
      } finally {
        if (!cancelled) {
          setConfirming(false);
          setSearchParams({}, { replace: true });
        }
      }
    };

    confirmPayment();

    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams]);

  const handleSelect = async (planId) => {
    setCheckoutError("");
    setLoadingPlanId(planId);

    try {
      const { url } = await createCheckoutSession(planId);
      if (url) {
        window.location.href = url;
        return;
      }
      throw new Error("Stripe checkout URL was not returned.");
    } catch (err) {
      setCheckoutError(
        err.response?.data?.message ||
          err.message ||
          "Could not start checkout. Please try again.",
      );
      setLoadingPlanId(null);
    }
  };

  return (
    <>
      <Helmet>
        <title>HireMind-Payment</title>
      </Helmet>
      <div
        className="flex min-h-screen bg-[#f0f4ff]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(37,99,235,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,0.03) 1px,transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      >
        {/* ── Success modal ── */}
        {selectedPlan && (
          <SuccessModal
            planTitle={selectedPlan.title}
            onClose={() => {
              setSelectedPlan(null);
              goBack?.();
            }}
          />
        )}

        {/* ── Sidebar ── */}
        <Sidebar
          activeKey="payment"
          onNavigate={onNavigate}
          onLogout={onLogout}
        />

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 overflow-y-auto pt-14 lg:pt-0">
          <div className="max-w-4xl mx-auto px-5 lg:px-8 py-12 flex flex-col gap-12">
            {/* Header */}
            <PageHeader />

            {checkoutError && !loadingPlanId && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700 text-center">
                {checkoutError}
              </div>
            )}

            {confirming && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-[13px] text-blue-700 text-center">
                Confirming your payment…
              </div>
            )}

            {/* Plan cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {PLANS.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onSelect={handleSelect}
                  loadingPlanId={loadingPlanId}
                  error={loadingPlanId === plan.id ? checkoutError : ""}
                />
              ))}
            </div>

            {/* Trust strip */}
            <TrustStrip />

            {/* Comparison table */}
            <div>
              <h2
                className="text-[20px] font-bold text-gray-900 text-center mb-6"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Plan Comparison
              </h2>
              <ComparisonTable />
            </div>

            {/* FAQ */}
            <FAQSection />

            {/* Footer CTA strip */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-7 text-center">
              <p
                className="text-[15px] font-bold text-gray-900 mb-1"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Still not sure?
              </p>
              <p
                className="text-[13px] text-gray-400 mb-5"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                Start with a Single Assessment and upgrade any time — no
                pressure.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => goBack?.()}
                  className="px-6 py-2.5 rounded-xl border border-gray-200 bg-white text-[13px] font-bold text-gray-600 hover:bg-gray-50 transition-all"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  ← Back to Dashboard
                </button>
                <button
                  onClick={() => onNavigate?.("interview")}
                  className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-[13px] font-bold hover:-translate-y-px hover:shadow-md transition-all"
                  style={{ fontFamily: "'Manrope', sans-serif" }}
                >
                  Try Single Assessment →
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
