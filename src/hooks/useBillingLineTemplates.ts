import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getBillingLineTemplates, BillingLineTemplate } from "@/services/billingLineTemplatesService";

interface SavedLine {
  id: number;
  description: string;
  unit?: string;
  unitPrice: number;
  taxRate: number;
}

// Cache global pour éviter les requêtes multiples
let cachedLines: SavedLine[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60000; // 1 minute

export function useBillingLineTemplates() {
  const { token } = useAuth();
  const [savedLines, setSavedLines] = useState<SavedLine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadSavedLines = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Vérifier le cache
      const now = Date.now();
      if (cachedLines && (now - cacheTimestamp) < CACHE_DURATION) {
        setSavedLines(cachedLines);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const templates = await getBillingLineTemplates(token);
        const adaptedLines: SavedLine[] = templates.map((template: BillingLineTemplate) => ({
          id: template.id,
          description: template.description,
          unit: template.unit || undefined,
          unitPrice: typeof template.unit_price_ht === 'string' ? parseFloat(template.unit_price_ht) : template.unit_price_ht,
          taxRate: typeof template.tax_rate === 'string' ? parseFloat(template.tax_rate) : template.tax_rate,
        }));
        
        // Mettre à jour le cache
        cachedLines = adaptedLines;
        cacheTimestamp = now;
        
        setSavedLines(adaptedLines);
      } catch (err) {
        console.error("Erreur lors du chargement des lignes sauvegardées:", err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedLines();
  }, [token]);

  // Fonction pour invalider le cache (utile après création/modification)
  const invalidateCache = () => {
    cachedLines = null;
    cacheTimestamp = 0;
  };

  return { savedLines, isLoading, error, invalidateCache };
}

