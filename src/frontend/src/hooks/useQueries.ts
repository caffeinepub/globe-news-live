import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NewsItem } from "../backend.d";
import { useActor } from "./useActor";

export function useGetNews() {
  const { actor, isFetching } = useActor();
  return useQuery<NewsItem[]>({
    queryKey: ["news"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getNews();
    },
    enabled: !!actor && !isFetching,
    staleTime: 1000 * 60 * 5,
  });
}

export function useGetLastUpdated() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["lastUpdated"],
    queryFn: async () => {
      if (!actor) return BigInt(0);
      return actor.getLastUpdated();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useRefreshNews() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) return;
      await actor.refreshNews();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      queryClient.invalidateQueries({ queryKey: ["lastUpdated"] });
    },
  });
}
