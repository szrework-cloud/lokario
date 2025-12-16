import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getDashboardStats, DashboardStats } from "@/services/dashboardService";
import { getTodayTasks, getRecentTasks, Task } from "@/services/tasksService";

/**
 * Hook pour récupérer les statistiques du dashboard
 */
export function useDashboardStats() {
  const { token } = useAuth();

  return useQuery<DashboardStats>({
    queryKey: ["dashboard", "stats"],
    queryFn: () => getDashboardStats(token),
    enabled: !!token,
    staleTime: 1000 * 60 * 2, // 2 minutes - les stats changent souvent
  });
}

/**
 * Hook pour récupérer les tâches du jour
 */
export function useTodayTasks() {
  const { token } = useAuth();

  return useQuery<Task[]>({
    queryKey: ["tasks", "today"],
    queryFn: () => getTodayTasks(token),
    enabled: !!token,
    staleTime: 1000 * 60 * 1, // 1 minute - les tâches changent souvent
  });
}

/**
 * Hook pour récupérer les tâches récemment créées
 */
export function useRecentTasks(limit: number = 10) {
  const { token } = useAuth();

  return useQuery<Task[]>({
    queryKey: ["tasks", "recent", limit],
    queryFn: () => getRecentTasks(token, limit),
    enabled: !!token,
    staleTime: 1000 * 60 * 1, // 1 minute - les tâches changent souvent
  });
}

