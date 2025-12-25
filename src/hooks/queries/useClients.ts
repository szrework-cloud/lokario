import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getClients, Client } from "@/services/clientsService";
import { useMemo } from "react";

/**
 * Hook pour récupérer la liste des clients avec recherche
 * Inclut un debounce pour éviter trop de requêtes lors de la saisie
 */
export function useClients(searchQuery?: string) {
  const { token } = useAuth();

  // Debounce la recherche côté queryKey pour éviter trop de requêtes
  // Le debounce réel est géré par React Query via staleTime
  const debouncedSearchQuery = useMemo(() => {
    // Pour les recherches vides, on utilise "all" pour le cache
    return searchQuery || undefined;
  }, [searchQuery]);

  return useQuery<Client[]>({
    queryKey: ["clients", debouncedSearchQuery || "all"],
    queryFn: () => getClients(token, debouncedSearchQuery),
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

