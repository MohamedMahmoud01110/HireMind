import API from "./axios";

// Create and generate
export const createAndGenerate = (data) =>
  API.post("/ai/create-and-generate", data);

// Generate questions
export const generateQuestions = (data) =>
  API.post("/ai/generate-questions", data);

// Create pre assessment
export const createPreAssessment = (data) =>
  API.post("/ai/create-pre-assessment", data);

// Grade essay
export const gradeEssay = (data) =>
  API.post("/ai/grade-essay", data);