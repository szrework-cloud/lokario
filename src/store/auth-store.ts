import { create } from "zustand";
import { logger } from "@/lib/logger";
import { isTokenExpired } from "@/lib/token-utils";
import {
  saveAuthToken,
  getAuthToken,
  removeAuthToken,
  saveAuthUser,
  getAuthUser,
  removeAuthUser,
  clearAuthStorage,
  migrateFromLocalStorage,
} from "@/lib/auth-storage";

export type UserRole = "super_admin" | "owner" | "user";

export type CurrentUser = {
  id: number;
  email: string;
  full_name?: string | null;
  role: UserRole;
  company_id: number | null;
  is_active: boolean;
  created_at: string;
  can_edit_tasks?: boolean;
  can_delete_tasks?: boolean;
  can_create_tasks?: boolean;
};

type AuthState = {
  user: CurrentUser | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (token: string, user: CurrentUser) => void;
  clearAuth: () => void;
  hydrateFromStorage: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  setAuth: (token, user) => {
    if (typeof window !== "undefined") {
      try {
        saveAuthToken(token);
        saveAuthUser(user);
        logger.log("✅ Auth sauvegardée dans sessionStorage:", { 
          tokenLength: token?.length, 
          userEmail: user?.email 
        });
      } catch (error) {
        console.error("❌ Erreur lors de la sauvegarde:", error);
      }
    }
    set({ token, user, isLoading: false });
    logger.log("✅ Auth mise à jour dans le store:", { hasToken: !!token, hasUser: !!user });
  },
  clearAuth: () => {
    clearAuthStorage();
    set({ token: null, user: null, isLoading: false });
  },
  hydrateFromStorage: () => {
    if (typeof window === "undefined") return;
    
    // Migrer depuis localStorage vers sessionStorage si nécessaire (une seule fois)
    migrateFromLocalStorage();
    
    const token = getAuthToken();
    const user = getAuthUser<CurrentUser>();
    
    logger.log("🔄 Hydratation depuis storage:", { hasToken: !!token, hasUser: !!user });
    
    // Vérifier si le token est expiré
    if (token && isTokenExpired(token)) {
      logger.log("⚠️ Token expiré détecté, nettoyage de l'authentification");
      clearAuthStorage();
      set({ token: null, user: null, isLoading: false });
      return;
    }
    
    if (token && user) {
      logger.log("✅ Utilisateur restauré depuis storage:", user.email);
      set({ token, user, isLoading: false });
    } else {
      logger.log("⚠️ Pas de données d'auth dans storage");
      set({ token: null, user: null, isLoading: false });
    }
  },
  refreshUser: (user: CurrentUser) => {
    saveAuthUser(user);
    set((state) => ({ ...state, user }));
  },
}));

