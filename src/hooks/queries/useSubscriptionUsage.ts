import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiGet } from "@/lib/api";

export interface SubscriptionUsage {
  plan: string;
  limits: {
    quotes_per_month: number;
    invoices_per_month: number;
    clients: number;
    followups_per_month: number;
  };
  usage: {
    quotes_this_month: number;
    invoices_this_month: number;
    clients_total: number;
    followups_this_month: number;
  };
}

/**
 * Hook pour récupérer les quotas et l'utilisation de l'abonnement
 */
export function useSubscriptionUsage() {
  const { token } = useAuth();

  return useQuery<SubscriptionUsage>({
    queryKey: ["subscription", "usage"],
    queryFn: () => apiGet<SubscriptionUsage>("/stripe/subscription/usage", token),
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

