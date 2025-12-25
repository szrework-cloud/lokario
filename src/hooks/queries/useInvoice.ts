import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getInvoice, Invoice } from "@/services/invoicesService";

/**
 * Hook pour récupérer une facture spécifique par ID avec cache automatique
 */
export function useInvoice(invoiceId: number | undefined) {
  const { token } = useAuth();

  return useQuery<Invoice>({
    queryKey: ["invoice", invoiceId],
    queryFn: () => getInvoice(token || "", invoiceId!),
    enabled: !!token && !!invoiceId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  });
}

