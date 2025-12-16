"use client";

import Link from "next/link";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { ReactNode } from "react";

interface ModuleLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  fallback?: ReactNode; // Contenu à afficher si le module n'est pas activé
  showTooltip?: boolean; // Afficher un tooltip si désactivé
}

/**
 * Composant Link qui vérifie si le module est activé avant de créer le lien
 * Si le module n'est pas activé, affiche le fallback ou désactive le lien
 */
export function ModuleLink({
  href,
  children,
  className = "",
  onClick,
  fallback,
  showTooltip = false,
}: ModuleLinkProps) {
  const { isRouteAccessible, getSafeRoute } = useModuleAccess();
  const safeRoute = getSafeRoute(href);
  const isAccessible = isRouteAccessible(href);

  // Si le module n'est pas activé
  if (!isAccessible) {
    // Si un fallback est fourni, l'afficher
    if (fallback) {
      return <>{fallback}</>;
    }

    // Sinon, afficher le contenu mais désactivé
    return (
      <span
        className={`${className} opacity-50 cursor-not-allowed`}
        title={showTooltip ? "Ce module n'est pas activé" : undefined}
      >
        {children}
      </span>
    );
  }

  // Module activé : lien normal
  return (
    <Link href={safeRoute || href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
