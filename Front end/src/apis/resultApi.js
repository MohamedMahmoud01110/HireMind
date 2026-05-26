import API from "./axios";

// Calculate result
export const calculateResult = (data) =>
  API.post("/results/calculate", data);

// Student results
export const getStudentResults = () =>
  API.get("/results/student");

// Assessment results
export const getAssessmentResults = (assessmentId) =>
  API.get(`/results/assessment/${assessmentId}`);