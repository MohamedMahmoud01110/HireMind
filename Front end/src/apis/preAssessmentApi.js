import API from "./axios";

export const getPreAssessment = async (jobRole) => {
  const preAssessment = await API.get(`/pre-assessments/${jobRole}`);
  return preAssessment.data;
};
export const getPreAssessmentId = async (jobRole) => {
  const preAssessment = await API.get(`/pre-assessments/${jobRole}`);
  return preAssessment.data._id;
};
