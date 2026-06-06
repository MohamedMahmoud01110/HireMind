import API from "./axios";

export const getAvailablePlans = async () => {
  const res = await API.get("/bookings/plans");
  return res.data;
};

export const createCheckoutSession = async (planId) => {
  const res = await API.post("/bookings/checkout-session", { planId });
  return res.data;
};

export const confirmCheckoutSession = async (sessionId) => {
  const res = await API.get(`/bookings/session/${sessionId}/confirm`);
  return res.data;
};

export const getMyBookings = async () => {
  const res = await API.get("/bookings/me");
  return res.data;
};
