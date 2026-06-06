export const FEATURES = {
  CV: "CV",
  PRE_ASSESSMENT: "Pre Assessment",
  INTERVIEW: "Interview",
};

export function hasAttemptedFeature(scores = [], title) {
  return scores.some((s) => s.title === title);
}

export function getFeatureScore(scores = [], title) {
  return scores.find((s) => s.title === title)?.score ?? null;
}

export function hasActivePlan(profile) {
  if (!profile?.plan || profile.plan === "free") return false;
  if (!profile.planExpiresAt) return profile.plan !== "free";
  return new Date(profile.planExpiresAt) > new Date();
}

export function canUseFeature(profile, featureTitle) {
  const scores = profile?.scores || [];

  if (!hasAttemptedFeature(scores, featureTitle)) {
    return { allowed: true, reason: "first_try" };
  }

  if (hasActivePlan(profile)) {
    return { allowed: true, reason: "paid" };
  }

  return { allowed: false, reason: "needs_payment" };
}
