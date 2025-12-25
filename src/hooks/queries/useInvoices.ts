import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { getInvoices } from "@/services/invoicesService";
import { Invoice } from "@/components/billing/types";

interface UseInvoicesParams {
  status?: string;
  client_id?: number;
  search?: string;
  skip?: number;
  limit?: number;
}

/**
 * Hook pour récupérer la liste des factures avec cache automatique
 * Compatible avec le code existant - remplace les useEffect avec getInvoices
 */
export function useInvoices(params: UseInvoicesParams = {}) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["invoices", params],
    queryFn: () => getInvoices(token || "", params),
    enabled: !!token,
    staleTime: 1000 * 60 * 2, // 2 minutes - les factures changent peu fréquemment
    gcTime: 1000 * 60 * 5, // 5 minutes (ancien cacheTime)
  });
}

