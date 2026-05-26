import API from "./axios";

// Submit answer
export const submitAnswer = (data) =>
  API.post("/candidate-answers", data);

// Get my answers
export const getMyAnswers = () =>
  API.get("/candidate-answers/me");

// Get answers by assessment
export const getAnswersByAssessment = (assessmentId) =>
  API.get(`/candidate-answers/${assessmentId}`);