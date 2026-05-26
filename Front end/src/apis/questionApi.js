import API from "./axios";

// Add question
export const addQuestion = (data) => API.post("/questions", data);

// Get questions
export const getQuestions = (assessmentId) =>
  API.get(`/questions/${assessmentId}`);
