import API from "./axios";

// Apply for job
export const applyJob = (data) =>
  API.post("/applications/apply", data);

// Get my applications
export const getMyApplications = () =>
  API.get("/applications/my-applications");

// Get applicants for job
export const getApplicants = (jobId) =>
  API.get(`/applications/${jobId}`);