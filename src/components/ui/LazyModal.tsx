"use client";

import { ComponentType, lazy, Suspense } from "react";
import { Skeleton } from "./Skeleton";

/**
 * HOC pour créer un modal lazy-loaded
 * Réduit le bundle initial en chargeant le modal uniquement quand nécessaire
 */
export function createLazyModal<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFn);

  return function LazyModal(props: React.ComponentProps<T>) {
    return (
      <Suspense
        fallback={
          fallback || (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <Skeleton variant="rectangular" height={400} />
              </div>
            </div>
          )
        }
      >
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * Exemple d'utilisation :
 * 
 * const CreateQuoteModal = createLazyModal(
 *   () => import("@/components/billing/CreateQuoteModal").then(m => ({ default: m.CreateQuoteModal }))
 * );
 * 
 * // Utilisation normale
 * <CreateQuoteModal isOpen={isOpen} onClose={onClose} onSubmit={handleSubmit} />
 */

