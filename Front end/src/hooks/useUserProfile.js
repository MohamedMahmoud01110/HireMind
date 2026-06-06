import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clearUserScore, getProfile, updateProfile } from "../apis/userApi";

export const PROFILE_QUERY_KEY = ["profile"];

export const BASE_SCORE_ITEMS = [
  { title: "CV", icon: "📄", score: 0, color: "blue" },
  { title: "Pre Assessment", icon: "📝", score: 0, color: "violet" },
  { title: "Interview", icon: "🎙️", score: 0, color: "amber" },
  { title: "Overall", icon: "🏆", score: 0, color: "emerald" },
];

export function getScoreByTitle(userScores, title) {
  return userScores.find((s) => s.title === title)?.score ?? 0;
}

export function buildDisplayScores(userScores = []) {
  const scores = BASE_SCORE_ITEMS.map((item) => ({
    ...item,
    score: getScoreByTitle(userScores, item.title),
  }));

  const cv = getScoreByTitle(userScores, "CV");
  const preAssessment = getScoreByTitle(userScores, "Pre Assessment");
  const interview = getScoreByTitle(userScores, "Interview");
  const overallScore = Math.round((cv + preAssessment + interview) / 3);

  return scores.map((s) =>
    s.title === "Overall" ? { ...s, score: overallScore } : s,
  );
}

export function mergeScoreIntoProfile(profile, scorePayload) {
  if (!profile) return profile;

  const scores = Array.isArray(profile.scores) ? [...profile.scores] : [];
  const index = scores.findIndex((s) => s.title === scorePayload.title);
  const nextEntry = {
    title: scorePayload.title,
    score: scorePayload.score,
  };

  if (index >= 0) {
    scores[index] = { ...scores[index], ...nextEntry };
  } else {
    scores.push(nextEntry);
  }

  return { ...profile, scores };
}

export async function refetchUserProfile(queryClient) {
  await queryClient.refetchQueries({
    queryKey: PROFILE_QUERY_KEY,
    type: "all",
  });
}

export function useUserProfile(options = {}) {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: getProfile,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useUserScores() {
  const query = useUserProfile();

  // console.log("query", query);
  // console.log("data", query.data);
  // console.log("error", query.error);
  // console.log("isLoading", query.isLoading);
  const userScores = query.data?.scores || [];
  const scoresVersion = `${query.dataUpdatedAt}:${JSON.stringify(userScores)}`;

  const scores = useMemo(() => buildDisplayScores(userScores), [scoresVersion]);

  return {
    ...query,
    profile: query.data,
    userScores,
    scores,
    scoresVersion,
    scoresLoading: query.isLoading || query.isFetching,
  };
}

export function useUpdateUserScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (score) => updateProfile({ score }),
    onMutate: async (score) => {
      await queryClient.cancelQueries({ queryKey: PROFILE_QUERY_KEY });

      const previousProfile = queryClient.getQueryData(PROFILE_QUERY_KEY);

      if (previousProfile) {
        queryClient.setQueryData(
          PROFILE_QUERY_KEY,
          mergeScoreIntoProfile(previousProfile, score),
        );
      }

      return { previousProfile };
    },
    onError: (_error, _score, context) => {
      if (context?.previousProfile) {
        queryClient.setQueryData(PROFILE_QUERY_KEY, context.previousProfile);
      }
    },
    onSuccess: (updatedUser, score) => {
      queryClient.setQueryData(
        PROFILE_QUERY_KEY,
        mergeScoreIntoProfile(updatedUser, score),
      );
    },
    onSettled: async () => {
      await refetchUserProfile(queryClient);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, updatedUser);
    },
    onSettled: async () => {
      await refetchUserProfile(queryClient);
    },
  });
}

export function useClearUserScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearUserScore,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, updatedUser);
    },
    onSettled: async () => {
      await refetchUserProfile(queryClient);
    },
  });
}
