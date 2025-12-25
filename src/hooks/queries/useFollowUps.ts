import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  getFollowUps,
  getFollowUp,
  getFollowUpStats,
  getWeeklyFollowUps,
  FollowUpItem,
  FollowUpStats,
  WeeklyFollowUpData,
} from "@/services/followupsService";

interface UseFollowUpsParams {
  status?: string;
  type?: string;
  clientId?: number;
  sourceType?: string;
  sourceId?: number;
}

/**
 * Hook pour récupérer la liste des relances avec cache automatique
 */
export function useFollowUps(params: UseFollowUpsParams = {}) {
  const { token } = useAuth();

  return useQuery<FollowUpItem[]>({
    queryKey: ["followups", params],
    queryFn: () => getFollowUps(token, params),
    enabled: !!token,
    staleTime: 1000 * 60 * 1, // 1 minute - les relances changent plus fréquemment
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook pour récupérer une relance spécifique par ID avec cache automatique
 */
export function useFollowUp(followupId: number | undefined) {
  const { token } = useAuth();

  return useQuery<FollowUpItem>({
    queryKey: ["followup", followupId],
    queryFn: () => getFollowUp(followupId!, token),
    enabled: !!token && !!followupId,
    staleTime: 1000 * 60 * 1, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook pour récupérer les statistiques des relances avec cache automatique
 */
export function useFollowUpStats() {
  const { token } = useAuth();

  return useQuery<FollowUpStats>({
    queryKey: ["followups", "stats"],
    queryFn: () => getFollowUpStats(token),
    enabled: !!token,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook pour récupérer les données hebdomadaires des relances avec cache automatique
 */
export function useWeeklyFollowUps() {
  const { token } = useAuth();

  return useQuery<WeeklyFollowUpData[]>({
    queryKey: ["followups", "weekly"],
    queryFn: () => getWeeklyFollowUps(token),
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes - données hebdomadaires changent peu
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

