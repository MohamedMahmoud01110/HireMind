import API from "./axios";

// Create assessment
export const createAssessment = (data) =>
  API.post("/assessments", data);

// Get assessments
export const getAssessments = () =>
  API.get("/assessments");

// Get assessment by id
export const getAssessmentById = (id) =>
  API.get(`/assessments/${id}`);