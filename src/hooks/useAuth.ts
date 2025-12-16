"use client";

import { useEffect, useCallback } from "react";
import { useAuthStore, CurrentUser } from "@/store/auth-store";
import { apiGet } from "@/lib/api";
import { logger } from "@/lib/logger";

export function useAuth() {
  const { user, token, isLoading, hydrateFromStorage, clearAuth, setAuth, refreshUser } =
    useAuthStore();

  useEffect(() => {
    logger.log("🔄 useAuth: Hydratation depuis le storage");
    hydrateFromStorage();
  }, [hydrateFromStorage]);
  
  useEffect(() => {
    logger.log("🔍 useAuth: État actuel", { 
      hasUser: !!user, 
      hasToken: !!token, 
      isLoading,
      userEmail: user?.email 
    });
  }, [user, token, isLoading]);

  // Fonction pour rafraîchir les infos utilisateur depuis l'API
  const refreshUserFromAPI = useCallback(async () => {
    if (!token) return;
    
    try {
      const updatedUser = await apiGet<CurrentUser>("/auth/me", token);
      refreshUser(updatedUser);
    } catch (error) {
      console.error("Erreur lors du rafraîchissement des infos utilisateur:", error);
    }
  }, [token, refreshUser]);

  return { user, token, isLoading, logout: clearAuth, setAuth, refreshUserFromAPI };
}

