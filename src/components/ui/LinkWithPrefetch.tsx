"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ReactNode } from "react";

interface LinkWithPrefetchProps {
  href: string;
  children: ReactNode;
  prefetchKey?: string[];
  prefetchFn?: () => Promise<any>;
  className?: string;
}

/**
 * Composant Link qui précharge les données au survol
 * pour une navigation plus fluide
 */
export function LinkWithPrefetch({
  href,
  children,
  prefetchKey,
  prefetchFn,
  className,
}: LinkWithPrefetchProps) {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    if (prefetchKey && prefetchFn) {
      // Précharger les données de la page au survol
      queryClient.prefetchQuery({
        queryKey: prefetchKey,
        queryFn: prefetchFn,
        staleTime: 1000 * 60 * 5, // 5 minutes
      });
    }
  };

  return (
    <Link href={href} onMouseEnter={handleMouseEnter} className={className}>
      {children}
    </Link>
  );
}

