import { useQueryClient as useTanStackQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";

/**
 * Hook personnalisé qui retourne le QueryClient avec le token d'authentification
 * pour faciliter l'accès dans les composants
 */
export function useQueryClient() {
  const queryClient = useTanStackQueryClient();
  const { token } = useAuth();
  
  return {
    queryClient,
    token,
  };
}

