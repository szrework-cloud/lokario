"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";

interface NavItem {
  label: string;
  href: string;
  icon?: string;
  moduleKey?: string; // Pour masquer/afficher selon modules activés
}

// Mapping des moduleKey de la sidebar vers les clés dans settings.modules
const moduleKeyMapping: Record<string, string> = {
  dashboard: "dashboard",
  tasks: "tasks",
  inbox: "inbox",
  followups: "relances",
  clients: "clients",
  projects: "projects",
  billing: "billing",
  appointments: "appointments",
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/app/dashboard", moduleKey: "dashboard" },
  { label: "Tâches", href: "/app/tasks", moduleKey: "tasks" },
  { label: "Inbox", href: "/app/inbox", moduleKey: "inbox" },
  { label: "Relances", href: "/app/relances", moduleKey: "followups" },
  { label: "Clients", href: "/app/clients", moduleKey: "clients" },
  { label: "Projets", href: "/app/projects", moduleKey: "projects" },
  { label: "Devis & Factures", href: "/app/billing/quotes", moduleKey: "billing" },
  { label: "Rendez-vous", href: "/app/appointments", moduleKey: "appointments" },
  { label: "Paramètres", href: "/app/settings" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { settings } = useSettings(false); // Ne pas auto-load ici, déjà chargé ailleurs

  const activeModules = settings?.settings.modules;

  // Filtrer les items selon les modules activés
  const visibleItems = navItems.filter((item) => {
    // Si pas de moduleKey, toujours visible (ex: Paramètres)
    if (!item.moduleKey) return true;
    
    // Si settings pas encore chargés, afficher tout (fallback)
    if (!activeModules) return true;
    
    // Mapper le moduleKey de la sidebar vers la clé dans settings
    const settingsKey = moduleKeyMapping[item.moduleKey] || item.moduleKey;
    
    // Vérifier si le module est activé
    const moduleConfig = activeModules[settingsKey as keyof typeof activeModules];
    const isEnabled = moduleConfig?.enabled ?? true; // Par défaut activé si pas défini
    
    return isEnabled;
  });

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-[#1F2933] bg-[#111827] z-30 hidden lg:block">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="border-b border-[#1F2933] px-6 py-5">
          <Link href="/app/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
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
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 relative group",
                  isActive
                    ? "bg-slate-800 text-slate-50 border-l-4 border-[#F97316] pl-2.5"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-50 hover:translate-x-1"
                )}
              >
                <span className="relative z-10">{item.label}</span>
                {isActive && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#F97316] rounded-r-full animate-slide-down" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <UserInfo />
      </div>
    </aside>
  );
}

function UserInfo() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Vérifier si on est en mode admin ou user
  const isAdminView = pathname.startsWith("/admin");
  const isUserView = pathname.startsWith("/app");
  const isSuperAdmin = user?.role === "super_admin";

  const handleToggleView = () => {
    if (isAdminView) {
      // Passer à la vue user
      router.push("/app/tasks");
    } else if (isUserView) {
      // Passer à la vue admin
      router.push("/admin/companies");
    }
  };

  return (
    <div className="border-t border-[#1F2933] px-6 py-4 space-y-3">
      <p className="text-xs text-slate-400">Connecté en tant que</p>
      <p className="text-sm font-medium text-slate-200">
        {user?.full_name || user?.email || "Utilisateur"}
      </p>
      
      {/* Bouton de bascule Admin/User pour super_admin */}
      {isSuperAdmin && (
        <button
          onClick={handleToggleView}
          className="w-full mt-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
        >
          {isAdminView ? "Vue Owner/User" : "Vue Admin"}
        </button>
      )}
      
      <button
        onClick={handleLogout}
        className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        Se déconnecter
      </button>
    </div>
  );
}

