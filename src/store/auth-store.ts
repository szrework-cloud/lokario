import { create } from "zustand";

export type UserRole = "super_admin" | "owner" | "user";

export type CurrentUser = {
  id: number;
  email: string;
  full_name?: string | null;
  role: UserRole;
  company_id: number | null;
  is_active: boolean;
  created_at: string;
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
      localStorage.setItem("auth_token", token);
      localStorage.setItem("auth_user", JSON.stringify(user));
    }
    set({ token, user, isLoading: false });
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
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as CurrentUser;
        set({ token, user, isLoading: false });
      } catch {
        set({ token: null, user: null, isLoading: false });
      }
    } else {
      set({ token: null, user: null, isLoading: false });
    }
  },
}));

