"use client";

import { useCallback } from "react";
import { useSettings } from "./useSettings";

/**
 * Mapping des routes vers les clés de modules dans settings
 */
const routeToModuleKey: Record<string, string> = {
  "/app/tasks": "tasks",
  "/app/inbox": "inbox",
  "/app/relances": "relances",
  "/app/clients": "clients",
  "/app/projects": "projects",
  "/app/billing": "billing",
  "/app/reporting": "reporting",
  "/app/chatbot": "chatbot_internal",
  "/app/appointments": "appointments",
  "/app/dashboard": "dashboard",
};

/**
 * Hook pour vérifier si un module est activé
 */
export function useModuleAccess() {
  const { settings } = useSettings(false);

  /**
   * Vérifie si un module est activé
   * @param moduleKey - Clé du module (ex: "tasks", "projects", "inbox")
   * @returns true si le module est activé, false sinon
   */
  const isModuleEnabled = useCallback((moduleKey: string): boolean => {
    if (!settings?.settings.modules) {
      // Si pas de settings, considérer comme activé (fallback)
      return true;
    }

    const moduleConfig = settings.settings.modules[moduleKey as keyof typeof settings.settings.modules];
    return moduleConfig?.enabled ?? true; // Par défaut activé si pas défini
  }, [settings]);

  /**
   * Vérifie si une route est accessible (module activé)
   * @param route - Route à vérifier (ex: "/app/tasks")
   * @returns true si accessible, false sinon
   */
  const isRouteAccessible = useCallback((route: string): boolean => {
    const moduleKey = routeToModuleKey[route];
    if (!moduleKey) {
      // Si pas de mapping, considérer comme accessible (routes non modulaires)
      return true;
    }
    return isModuleEnabled(moduleKey);
  }, [isModuleEnabled]);

  /**
   * Obtient l'URL sécurisée : si le module n'est pas activé, retourne null
   * @param route - Route à vérifier
   * @returns L'URL si accessible, null sinon
   */
  const getSafeRoute = useCallback((route: string): string | null => {
    return isRouteAccessible(route) ? route : null;
  }, [isRouteAccessible]);

  return {
    isModuleEnabled,
    isRouteAccessible,
    getSafeRoute,
  };
}
