const PLANS = {
  single: {
    id: "single",
    name: "Single Assessment",
    amount: 40000, // 400 EGP in piasters
    currency: "egp",
    validityDays: 30,
  },
  premium: {
    id: "premium",
    name: "Premium Package",
    amount: 80000, // 800 EGP in piasters
    currency: "egp",
    validityDays: 365,
  },
};

const getPlan = (planId) => PLANS[planId] || null;

module.exports = { PLANS, getPlan };
