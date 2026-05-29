import API from "./axios";

// Get profile
export const getProfile = async () => {
  const res = await API.get("/users/me");
  return res;
};
// Update profile
export const updateProfile = async (data) => {
  const res = await API.put("/users/me", data);
  return res;
};
export const getJobRole = async () => {
  const res = await API.get("/users/me/job-role");
  return res;
};
export const changePassword = async (data) => {
  const res = await API.put("/users/me/change-password", data);
  return res;
};

export const getAllUsers = async () => {
  const res = await API.get("/users");
  return res.data;
};

export const deleteUserById = async () => {
  const res = await API.delete(`/users/me`);
  return res.data;
};

export const deleteAllUsers = async () => {
  const res = await API.delete("/users");
  return res.data;
};
