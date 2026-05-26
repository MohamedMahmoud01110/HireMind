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

export const changePassword = async (data) => {
  const res = await API.put("/users/me/change-password", data);
  return res;
};
