import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getQuotes } from "@/services/quotesService";
import { Quote } from "@/components/billing/types";

interface UseQuotesParams {
  status?: string;
  client_id?: number;
  search?: string;
  skip?: number;
  limit?: number;
}

/**
 * Hook pour récupérer la liste des devis avec cache automatique
 * Compatible avec le code existant - remplace les useEffect avec getQuotes
 */
export function useQuotes(params: UseQuotesParams = {}) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["quotes", params],
    queryFn: () => getQuotes(token || "", params),
    enabled: !!token,
    staleTime: 1000 * 60 * 2, // 2 minutes - les devis changent peu fréquemment
    gcTime: 1000 * 60 * 5, // 5 minutes (ancien cacheTime)
  });
}

