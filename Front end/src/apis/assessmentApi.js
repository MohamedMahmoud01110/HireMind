import API from "./axios";

// Create assessment
export const createAssessment = async (data) => {
  const res = await API.post("/assessments", data);
  return res.data;
};

// Get assessments
export const getAssessments = async () => {
  const res = await API.get("/assessments");
  return res.data;
};

// Get assessment by id
export const getAssessmentById = async (id) => {
  const res = await API.get(`/assessments/${id}`);
  return res.data;
};
