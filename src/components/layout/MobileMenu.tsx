"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { useSubscriptionFeatures } from "@/hooks/queries/useSubscriptionFeatures";
import { X } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon?: string;
  moduleKey?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/app/dashboard", moduleKey: "dashboard" },
  { label: "Tâches", href: "/app/tasks", moduleKey: "tasks" },
  { label: "Inbox", href: "/app/inbox", moduleKey: "inbox" },
  { label: "Clients", href: "/app/clients", moduleKey: "clients" },
  { label: "Projets", href: "/app/projects", moduleKey: "projects" },
  { label: "Devis & Factures", href: "/app/billing", moduleKey: "billing" },
  { label: "Relances", href: "/app/relances", moduleKey: "followups" },
  { label: "Rendez-vous", href: "/app/appointments", moduleKey: "appointments" },
  { label: "Paramètres", href: "/app/settings" },
];

const moduleKeyMapping: Record<string, string> = {
  dashboard: "dashboard",
  tasks: "tasks",
  inbox: "inbox",
  clients: "clients",
  projects: "projects",
  billing: "billing",
  followups: "followups",
  appointments: "appointments",
};

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useSettings(false);
  const { data: features } = useSubscriptionFeatures();
  const { user, logout } = useAuth();

  const activeModules = settings?.settings.modules;

  // Filtrer les items selon les modules activés ET les fonctionnalités du plan
  const visibleItems = navItems.filter((item) => {
    // Si pas de moduleKey, toujours visible (ex: Paramètres)
    if (!item.moduleKey) return true;
    
    // Vérifier d'abord les fonctionnalités du plan d'abonnement
    if (item.moduleKey === "appointments" && features && !features.appointments) {
      return false;
    }
    if (item.moduleKey === "inbox" && features && !features.inbox) {
      return false;
    }
    
    // Ensuite vérifier les modules activés dans les settings
    if (!activeModules) return true;
    
    // Mapper le moduleKey de la sidebar vers la clé dans settings
    const settingsKey = moduleKeyMapping[item.moduleKey] || item.moduleKey;
    
    // Vérifier si le module est activé
    const moduleConfig = activeModules[settingsKey as keyof typeof activeModules];
    const isEnabled = moduleConfig?.enabled ?? true;
    
    return isEnabled;
  });

  // Fermer le menu quand on clique sur un lien
  const handleLinkClick = () => {
    onClose();
  };

  // Fermer avec la touche Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Empêcher le scroll du body quand le menu est ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Menu */}
      <aside className="fixed left-0 top-0 h-screen w-80 max-w-[85vw] border-r border-[#1F2933] bg-[#111827] z-50 lg:hidden overflow-y-auto">
        <div className="flex h-full flex-col">
          {/* Header avec bouton fermer */}
          <div className="border-b border-[#1F2933] px-6 py-5 flex items-center justify-between">
            <Link href="/app/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity" onClick={handleLinkClick}>
              <img 
                src="/lokario-logo.png" 
                alt="Lokario" 
                className="h-8 w-8 object-contain flex-shrink-0"
                style={{ minWidth: '32px', minHeight: '32px' }}
              />
              <span className="text-xl font-semibold text-slate-200">
                LOKARIO
              </span>
            </Link>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-50 hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Fermer le menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {visibleItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={cn(
                    "flex items-center rounded-lg px-4 py-3 text-base font-medium transition-all duration-200 relative",
                    isActive
                      ? "bg-slate-800 text-slate-50 border-l-4 border-[#F97316] pl-3"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-50"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="border-t border-[#1F2933] px-6 py-4 space-y-3">
            <p className="text-xs text-slate-400">Connecté en tant que</p>
            <p className="text-sm font-medium text-slate-200">
              {user?.full_name || user?.email || "Utilisateur"}
            </p>
            <button
              onClick={() => {
                logout();
                router.push("/login");
                onClose();
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-400 hover:text-slate-50 hover:bg-slate-800 rounded-lg transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

