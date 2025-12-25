import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getQuote, Quote } from "@/services/quotesService";

/**
 * Hook pour récupérer un devis spécifique par ID avec cache automatique
 */
export function useQuote(quoteId: number | undefined) {
  const { token } = useAuth();

  return useQuery<Quote>({
    queryKey: ["quote", quoteId],
    queryFn: () => getQuote(token || "", quoteId!),
    enabled: !!token && !!quoteId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

