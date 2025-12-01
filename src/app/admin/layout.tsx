"use client";

import { ReactNode, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const adminNavItems = [
  { label: "Entreprises", href: "/admin/companies" },
  { label: "Packs", href: "/admin/packs" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!token) {
        router.replace("/login");
      } else if (user?.role !== "super_admin") {
        router.replace("/app/tasks");
      }
    }
  }, [isLoading, token, user, router]);

  if (isLoading || !token || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F97316] mx-auto mb-3"></div>
          <p className="text-sm text-[#64748B]">Chargement de l'espace administrateur...</p>
        </div>
      </div>
    );
  }

  if (user.role !== "super_admin") {
    return null; // Redirection en cours
  }

  return (
    <div className="flex h-screen bg-[#F9FAFB]">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#E5E7EB] bg-white">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="border-b border-[#E5E7EB] px-6 py-5">
            <h1 className="text-xl font-semibold text-[#0F172A]">
              Super Admin
            </h1>
            <p className="text-xs text-[#64748B] mt-1">Local Assistant</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {adminNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-slate-100 text-[#0F172A]"
                      : "text-[#64748B] hover:bg-slate-50 hover:text-[#0F172A]"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User info and toggle */}
          <div className="border-t border-[#E5E7EB] px-6 py-4 space-y-3">
            <p className="text-xs text-[#64748B]">Connecté en tant que</p>
            <p className="text-sm font-medium text-[#0F172A]">
              {user?.full_name || user?.email || "Admin"}
            </p>
            
            {/* Bouton pour basculer vers la vue user */}
            <Link
              href="/app/tasks"
              className="block w-full mt-3 px-3 py-2 rounded-lg text-xs font-medium text-center transition-colors bg-slate-100 text-[#0F172A] hover:bg-slate-200 border border-[#E5E7EB]"
            >
              Vue Owner/User
            </Link>
            
            <button
              onClick={() => {
                // Logout
                localStorage.removeItem("token");
                router.push("/login");
              }}
              className="text-xs text-[#64748B] hover:text-[#0F172A] transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}

