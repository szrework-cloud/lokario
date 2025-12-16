"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Temps de cache par défaut (5 minutes)
            staleTime: 1000 * 60 * 5,
            // Temps avant de garbage collecter les données inutilisées (10 minutes)
            gcTime: 1000 * 60 * 10,
            // Retry automatique en cas d'erreur
            retry: 2,
            // Revalidation automatique quand la fenêtre reprend le focus
            refetchOnWindowFocus: true,
            // Revalidation automatique quand la connexion revient
            refetchOnReconnect: true,
            // Pas de revalidation au montage si les données sont fraîches
            refetchOnMount: false,
          },
          mutations: {
            // Retry automatique pour les mutations
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

