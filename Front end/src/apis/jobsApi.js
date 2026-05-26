import API from "./axios";

// Create job
export const createJob = (data) =>
  API.post("/jobs/create", data);

// Get all jobs
export const getJobs = () =>
  API.get("/jobs/all");

// Search jobs
export const searchJobs = (query) =>
  API.get(`/jobs/search?keyword=${query}`);

// Update job
export const updateJob = (id, data) =>
  API.put(`/jobs/${id}`, data);

// Delete job
export const deleteJob = (id) =>
  API.delete(`/jobs/${id}`);