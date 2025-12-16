"use client";

import { useCallback, useEffect, useRef } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";
import {
  useSettingsStore,
  CompanySettings,
  CompanyInfo,
} from "@/store/settings-store";

type GetSettingsResponse = {
  company: CompanyInfo;
  settings: CompanySettings;
};

export function useSettings(autoLoad: boolean = true) {
  const { token, user } = useAuth();
  const {
    company,
    settings,
    isLoading,
    error,
    hasLoaded,
    setSettings,
    setLoading,
    setError,
    reset,
    updateSettingsLocal,
    setHasLoaded,
  } = useSettingsStore();

  // Ref pour éviter les appels simultanés
  const loadingRef = useRef(false);
  const lastCompanyIdRef = useRef<number | null>(null);

  const reloadSettings = useCallback(async () => {
    if (!token || !user?.company_id) {
      reset();
      setHasLoaded(false);
      return;
    }
    
    // Éviter les appels simultanés
    if (loadingRef.current) {
      return;
    }
    
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      // Mode mock si pas de backend
      if (!process.env.NEXT_PUBLIC_API_URL) {
        const mockSettings: GetSettingsResponse = {
          company: {
            id: 1,
            name: "Ma Boutique",
            sector: "Commerce",
            is_active: true,
            created_at: new Date().toISOString(),
          },
          settings: {
            id: 1,
            company_id: 1,
            settings: {
                  modules: {
                    dashboard: { enabled: true },
                    tasks: { enabled: true },
                    inbox: { enabled: true },
                    relances: { enabled: true },
                    clients: { enabled: true },
                    projects: { enabled: true },
                    billing: { enabled: true },
                    reporting: { enabled: true },
                    chatbot_internal: { enabled: true },
                    chatbot_site: { enabled: false },
                    appointments: { enabled: true },
                  },
              ia: {
                ai_relances: true,
                ai_summary: true,
                ai_chatbot_internal: true,
                ai_chatbot_site: false,
              },
              integrations: {
                email_provider: null,
                email_from: null,
              },
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        };
        setSettings(mockSettings);
        return;
      }

      const data = await apiGet<GetSettingsResponse>(
        "/companies/me/settings",
        token
      );
      setSettings(data);
      lastCompanyIdRef.current = user.company_id;
    } catch (err: any) {
      // Si erreur 401 (Unauthorized), ne pas afficher d'erreur car c'est géré par le système d'auth
      if (err.isAuthError || err.status === 401) {
        console.warn("Session expirée lors du chargement des paramètres");
        setHasLoaded(false);
        // Ne pas définir d'erreur pour éviter d'afficher un message d'erreur
        // Le système d'authentification gérera la redirection
      } else {
        setError(err.message || "Erreur lors du chargement des paramètres");
        setHasLoaded(false);
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [token, user?.company_id, setLoading, setError, setSettings, reset, setHasLoaded]);

  // Utiliser des valeurs stables pour éviter les changements d'ordre
  const companyId = user?.company_id ?? null;
  
  useEffect(() => {
    // Si le company_id change, réinitialiser hasLoaded
    if (companyId !== lastCompanyIdRef.current) {
      setHasLoaded(false);
      lastCompanyIdRef.current = companyId;
    }

    // Si pas de token ou company_id, reset et arrêter
    if (!token || !companyId) {
      reset();
      return;
    }

    // Ne charger que si autoLoad est activé, qu'on n'a pas encore chargé, et qu'on n'est pas en train de charger
    if (!autoLoad || hasLoaded || isLoading || loadingRef.current) {
      return;
    }

    // Charger les settings
    void reloadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, token, companyId, hasLoaded, isLoading, reloadSettings]);

  // Recharger les settings quand la fenêtre redevient visible (utilisateur revient sur l'onglet)
  // Cela permet de détecter les changements depuis l'admin sans poller en continu
  useEffect(() => {
    if (!autoLoad || !token || !companyId || !hasLoaded) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !loadingRef.current) {
        void reloadSettings();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, token, companyId, hasLoaded, reloadSettings]);

  const saveSettings = useCallback(
    async (updatedSettings: CompanySettings["settings"]) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        // Utiliser PATCH au lieu de POST
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        
        // En mode développement sans backend, simuler une réponse
        if (!process.env.NEXT_PUBLIC_API_URL) {
          logger.log("[MOCK API] PATCH /companies/me/settings", updatedSettings);
          // Simuler une mise à jour locale
          updateSettingsLocal(updatedSettings);
          return;
        }

        const res = await fetch(
          `${apiUrl}/companies/me/settings`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ settings: updatedSettings }),
          }
        );

        if (!res.ok) {
          let message = "Erreur serveur";
          try {
            const errorBody = await res.json();
            if (errorBody.detail) {
              message = Array.isArray(errorBody.detail)
                ? errorBody.detail[0].msg ?? message
                : errorBody.detail;
            }
          } catch {
            // ignore
          }
          throw new Error(message);
        }

        const resData = await res.json();
        // On met à jour le store avec la réponse (en gardant company)
        if (company) {
          setSettings({ company, settings: resData });
        }
      } catch (err: any) {
        setError(err.message || "Erreur lors de la mise à jour des paramètres");
        throw err; // Re-throw pour que le composant puisse gérer
      } finally {
        setLoading(false);
      }
    },
    [token, company, setLoading, setError, setSettings]
  );

  return {
    company,
    settings,
    isLoading,
    error,
    reloadSettings,
    saveSettings,
    updateSettingsLocal,
  };
}

