import API from "./axios";

export const getScores = async () => {
  const res = await API.get("/");
};
