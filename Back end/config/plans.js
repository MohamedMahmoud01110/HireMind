const PLANS = {
  student_first: {
    id: "student_first",
    name: "Student Session",
    amount: 45000,
    currency: "egp",
    validityDays: 30,
    mode: "payment",
    role: "student",
  },
  student_return: {
    id: "student_return",
    name: "Student Return Session",
    amount: 30000,
    currency: "egp",
    validityDays: 30,
    mode: "payment",
    role: "student",
    discountRange: { min: 250, max: 350 },
  },
  company_monthly: {
    id: "company_monthly",
    name: "Company Monthly Plan",
    amount: 700000,
    currency: "egp",
    validityDays: 30,
    mode: "subscription",
    role: "company",
  },
};

function calculateStudentReturnPrice(userId) {
  const hash = String(userId)
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return 250 + (hash % 101);
}

function getPlan(planId, userId = null) {
  const plan = PLANS[planId];
  if (!plan) return null;

  if (planId === "student_return" && userId) {
    const priceEgp = calculateStudentReturnPrice(userId);
    return {
      ...plan,
      amount: priceEgp * 100,
      displayPrice: priceEgp,
    };
  }

  return { ...plan, displayPrice: plan.amount / 100 };
}

function buildPlansForUser(user) {
  const role = (user.role || "student").toLowerCase();

  if (role === "company") {
    const plan = getPlan("company_monthly");
    return [
      {
        ...plan,
        title: plan.name,
        period: "per month",
        badge: "Business",
        highlight: true,
        features: [
          "Unlimited team assessments",
          "CV analysis for all candidates",
          "AI interview simulations",
          "Full analytics & reports",
          "Monthly billing",
        ],
      },
    ];
  }

  const isReturning =
    (user.subscriptionCount || 0) > 0 ||
    (user.planExpiresAt && new Date(user.planExpiresAt) < new Date() && user.plan !== "free");

  if (isReturning) {
    const plan = getPlan("student_return", user._id || user.id);
    return [
      {
        ...plan,
        title: "Return Session",
        period: "discounted session",
        badge: "Welcome Back",
        highlight: true,
        features: [
          "Retake CV analysis",
          "Retake pre-assessment",
          "Retake AI interview",
          "Updated performance report",
          `Discounted price (${plan.discountRange.min}–${plan.discountRange.max} EGP)`,
          "Valid for 30 days",
        ],
      },
    ];
  }

  const plan = getPlan("student_first");
  return [
    {
      ...plan,
      title: "Student Session",
      period: "one-time",
      badge: null,
      highlight: true,
      features: [
        "First try is free for all features",
        "Retake CV analysis",
        "Retake pre-assessment",
        "Retake AI interview",
        "Full performance report",
        "Valid for 30 days",
      ],
    },
  ];
}

module.exports = {
  PLANS,
  getPlan,
  buildPlansForUser,
  calculateStudentReturnPrice,
};
