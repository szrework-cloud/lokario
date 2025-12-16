import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getClients, Client } from "@/services/clientsService";

/**
 * Hook pour récupérer la liste des clients avec recherche
 */
export function useClients(searchQuery?: string) {
  const { token } = useAuth();

  return useQuery<Client[]>({
    queryKey: ["clients", searchQuery || "all"],
    queryFn: () => getClients(token, searchQuery),
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

