import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getClient, Client } from "@/services/clientsService";

/**
 * Hook pour récupérer un client spécifique par ID avec cache automatique
 */
export function useClient(clientId: number | undefined) {
  const { token } = useAuth();

  return useQuery<Client>({
    queryKey: ["client", clientId],
    queryFn: () => getClient(clientId!, token || ""),
    enabled: !!token && !!clientId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

