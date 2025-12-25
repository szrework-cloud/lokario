import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiGet } from "@/lib/api";

export interface SubscriptionFeatures {
  appointments: boolean;
  inbox: boolean;
  excel_export: boolean;
  custom_branding: boolean;
  api_access: boolean;
  advanced_reports: boolean;
  projects: boolean;
}

/**
 * Hook pour récupérer les fonctionnalités disponibles selon le plan
 */
export function useSubscriptionFeatures() {
  const { token } = useAuth();

  return useQuery<SubscriptionFeatures>({
    queryKey: ["subscription", "features"],
    queryFn: () => apiGet<SubscriptionFeatures>("/subscription/features", token),
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

