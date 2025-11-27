"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";

export function useAuth() {
  const { user, token, isLoading, hydrateFromStorage, clearAuth, setAuth } =
    useAuthStore();

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  return { user, token, isLoading, logout: clearAuth, setAuth };
}

