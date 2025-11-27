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
  tasks: "tasks",
  inbox: "inbox",
  followups: "relances",
  projects: "projects",
  billing: "billing",
  reporting: "reporting",
  chatbot: "chatbot_internal",
};

const navItems: NavItem[] = [
  { label: "Tâches", href: "/app/tasks", moduleKey: "tasks" },
  { label: "Inbox", href: "/app/inbox", moduleKey: "inbox" },
  { label: "Relances", href: "/app/relances", moduleKey: "followups" },
  { label: "Clients", href: "/app/clients", moduleKey: "clients" },
  { label: "Projets", href: "/app/projects", moduleKey: "projects" },
  { label: "Devis & Factures", href: "/app/billing/quotes", moduleKey: "billing" },
  { label: "Reporting", href: "/app/reporting", moduleKey: "reporting" },
  { label: "Chatbot", href: "/app/chatbot", moduleKey: "chatbot" },
  { label: "Paramètres", href: "/app/settings" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { settings } = useSettings(false); // Ne pas auto-load ici, déjà chargé ailleurs

  const activeModules = settings?.settings.modules;

  // Filtrer les items selon les modules activés
  const visibleItems = navItems.filter((item) => {
    // Si pas de moduleKey, toujours visible
    if (!item.moduleKey) return true;
    
    // Si settings pas encore chargés, afficher tout (fallback)
    if (!activeModules) return true;
    
    // Mapper le moduleKey de la sidebar vers la clé dans settings
    const settingsKey = moduleKeyMapping[item.moduleKey] || item.moduleKey;
    
    // Vérifier si le module est activé
    const moduleConfig = activeModules[settingsKey as keyof typeof activeModules];
    return moduleConfig?.enabled ?? true; // Par défaut activé si pas défini
  });

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-[#1F2933] bg-[#111827] z-30 hidden lg:block">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="border-b border-[#1F2933] px-6 py-5">
          <h1 className="text-xl font-semibold text-slate-200">
            Local Assistant
          </h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors relative",
                  isActive
                    ? "bg-slate-800 text-slate-50 border-l-4 border-[#F97316] pl-2.5"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-50"
                )}
              >
                {item.label}
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

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="border-t border-[#1F2933] px-6 py-4">
      <p className="text-xs text-slate-400">Connecté en tant que</p>
      <p className="text-sm font-medium text-slate-200">
        {user?.full_name || user?.email || "Utilisateur"}
      </p>
      <button
        onClick={handleLogout}
        className="mt-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
      >
        Se déconnecter
      </button>
    </div>
  );
}

