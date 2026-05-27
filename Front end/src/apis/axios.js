import axios from "axios";

const API = axios.create({
  // baseURL: "http://localhost:5000/api",
  baseURL: "https://hiremind-production.up.railway.app/api",
});

export const AnalyzeCvAPI = axios.create({
  baseURL: "http://127.0.0.1:8000",
});
export const InterviewAPI = axios.create({
  baseURL: "http://127.0.0.1:3000",
});
// Add token automatically
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");

  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  return req;
});

export default API;
