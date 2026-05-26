import { AnalyzeCvAPI } from "./axios";

export const analyzeCv = async (data) => {
  const res = await AnalyzeCvAPI.post("/analyze-cv", data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res;
};
