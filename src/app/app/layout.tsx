"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { AppFooter } from "@/components/layout/AppFooter";
import { PageProvider, usePage } from "@/contexts/PageContext";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { FloatingChatWidget } from "@/components/chatbot/FloatingChatWidget";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { title, subtitle, rightContent } = usePage();

  return (
    <div className="flex h-screen bg-[#F9FAFB]">
      <AppSidebar />
      <div className="flex flex-1 flex-col lg:ml-64 overflow-hidden">
        <AppTopBar
          title={title}
          subtitle={subtitle}
          rightContent={rightContent}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F9FAFB] min-h-0">{children}</main>
        <AppFooter />
      </div>
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();
  
  // Charger les settings automatiquement après login (une seule fois)
  useSettings(true);

  useEffect(() => {
    if (!isLoading) {
      if (!token) {
        router.replace("/login");
      } else if (user?.role === "super_admin") {
        // Rediriger les super_admin vers la page admin par défaut
        const currentPath = window.location.pathname;
        if (currentPath === "/app" || currentPath === "/app/") {
          router.replace("/admin/companies");
        }
      }
    }
  }, [isLoading, token, router, user]);

  if (isLoading || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F97316] mx-auto mb-3"></div>
          <p className="text-sm text-[#64748B]">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  return (
    <PageProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
      <FloatingChatWidget />
    </PageProvider>
  );
}

