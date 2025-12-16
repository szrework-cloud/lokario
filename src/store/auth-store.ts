import { create } from "zustand";
import { logger } from "@/lib/logger";

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
        localStorage.setItem("auth_token", token);
        localStorage.setItem("auth_user", JSON.stringify(user));
        logger.log("✅ Auth sauvegardée dans localStorage:", { 
          tokenLength: token?.length, 
          userEmail: user?.email 
        });
      } catch (error) {
        console.error("❌ Erreur lors de la sauvegarde dans localStorage:", error);
      }
    }
    set({ token, user, isLoading: false });
    logger.log("✅ Auth mise à jour dans le store:", { hasToken: !!token, hasUser: !!user });
  },
  clearAuth: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    }
    set({ token: null, user: null, isLoading: false });
  },
  hydrateFromStorage: () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("auth_token");
    const userRaw = localStorage.getItem("auth_user");
    logger.log("🔄 Hydratation depuis localStorage:", { hasToken: !!token, hasUser: !!userRaw });
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as CurrentUser;
        logger.log("✅ Utilisateur restauré depuis localStorage:", user.email);
        set({ token, user, isLoading: false });
      } catch (error) {
        console.error("❌ Erreur lors du parsing de l'utilisateur:", error);
        set({ token: null, user: null, isLoading: false });
      }
    } else {
      logger.log("⚠️ Pas de données d'auth dans localStorage");
      set({ token: null, user: null, isLoading: false });
    }
  },
  refreshUser: (user: CurrentUser) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_user", JSON.stringify(user));
    }
    set((state) => ({ ...state, user }));
  },
}));

