"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createInitialState } from "./seed";
import { loadLocalState, resetLocalState, saveLocalState } from "./store";
import type { AppState } from "./types";

export const APP_QUERY_KEY = ["peopledesk-app-state"] as const;

let hasHydratedLocalState = false;

export function useAppState() {
  const queryClient = useQueryClient();

  const query = useQuery<AppState>({
    queryKey: APP_QUERY_KEY,
    queryFn: async () => loadLocalState(),
    initialData: () => (hasHydratedLocalState ? loadLocalState() : createInitialState()),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!hasHydratedLocalState) {
      hasHydratedLocalState = true;
      queryClient.setQueryData(APP_QUERY_KEY, loadLocalState());
    }
  }, [queryClient]);

  return query;
}

export function useAppMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updater: (draft: AppState) => AppState | void) => {
      const current = structuredClone(loadLocalState());
      const result = updater(current);
      const next = result ?? current;
      return saveLocalState(next);
    },
    onSuccess: (nextState) => {
      hasHydratedLocalState = true;
      queryClient.setQueryData(APP_QUERY_KEY, nextState);
    },
  });
}

export function useResetAppState() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => resetLocalState(),
    onSuccess: (nextState) => {
      hasHydratedLocalState = true;
      queryClient.setQueryData(APP_QUERY_KEY, nextState);
    },
  });
}
