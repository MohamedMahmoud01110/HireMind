import { InterviewAPI } from "./axios";

export const interview = async (data) => {
  const res = await InterviewAPI.post("/interview", data);
  return res;
};
