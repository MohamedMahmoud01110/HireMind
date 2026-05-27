import API from "./axios";
import { getPreAssessmentId } from "./preAssessmentApi";

// ─────────────────────────────────────────────
// Add Question
// ─────────────────────────────────────────────
export const addQuestion = async (data) => {
  const res = await API.post("/questions", data);
  return res.data;
};

// ─────────────────────────────────────────────
// Get Questions
// ─────────────────────────────────────────────
export const getQuestionsByPreAssessmentId = async (jobRole) => {
  const preAssessmentId = await getPreAssessmentId(jobRole);

  const res = await API.get(`/pre-assessments/${preAssessmentId}/questions`);

  return res.data;
};

// ─────────────────────────────────────────────
// Submit Assessment Answers
// ─────────────────────────────────────────────
export const submitPreAssessmentAnswers = async (jobRole, answers) => {
  const preAssessmentId = await getPreAssessmentId(jobRole);

  const res = await API.post(`/pre-assessments/${preAssessmentId}/submit`, {
    answers,
  });

  return res.data;
};

// ─────────────────────────────────────────────
// Get Assessment Result
// ─────────────────────────────────────────────
export const getPreAssessmentResult = async (jobRole) => {
  try {
    const preAssessmentId = await getPreAssessmentId(jobRole);

    const res = await API.get(`/pre-assessments/${preAssessmentId}/result`);
    return res.data;
  } catch (error) {
    if (error.response?.status === 404) {
      return null; // user didn't take assessment yet
    }

    throw error;
  }
};

// ─────────────────────────────────────────────
// Delete Assessment Result (Retake)
// ─────────────────────────────────────────────
export const deletePreAssessmentResult = async (jobRole) => {
  const preAssessmentId = await getPreAssessmentId(jobRole);

  const res = await API.delete(`/pre-assessments/${preAssessmentId}/result`);

  return res.data;
};
