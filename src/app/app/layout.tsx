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
import { logger } from "@/lib/logger";

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
  const { user, token, isLoading, logout } = useAuth();
  
  // Charger les settings automatiquement après login (une seule fois)
  useSettings(true);

  useEffect(() => {
    if (!isLoading && token) {
      logger.log("🔍 Vérification auth dans AppLayout:", { isLoading, hasToken: !!token, hasUser: !!user, userRole: user?.role });
      
      // Vérifier le statut de suppression
      const checkDeletionStatus = async () => {
        try {
          const { apiGet } = await import("@/lib/api");
          const deletionStatus = await apiGet<{ deletion_in_progress: boolean }>("/users/me/deletion-status", token);
          
          if (deletionStatus.deletion_in_progress) {
            // Rediriger vers la page de restauration
            logger.log("🔄 Compte en cours de suppression, redirection vers /restore");
            router.replace("/restore");
            return;
          }
        } catch (error) {
          // Si l'endpoint échoue, continuer normalement (peut être une erreur réseau)
          console.warn("Impossible de vérifier le statut de suppression:", error);
        }
      };

      if (!token) {
        logger.log("❌ Pas de token, redirection vers /login");
        router.replace("/login");
      } else if (user?.role === "super_admin") {
        // Rediriger les super_admin vers la page admin par défaut
        const currentPath = window.location.pathname;
        if (currentPath === "/app" || currentPath === "/app/") {
          logger.log("🔄 Super admin, redirection vers /admin/companies");
          router.replace("/admin/companies");
        }
      } else {
        // Vérifier le statut de suppression pour les utilisateurs normaux
        // Ne pas vérifier si on est déjà sur la page /restore
        const currentPath = window.location.pathname;
        if (currentPath !== "/restore") {
          checkDeletionStatus();
        }
        logger.log("✅ Authentification valide, accès autorisé");
      }
    }
  }, [isLoading, token, router, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F97316] mx-auto mb-3"></div>
          <p className="text-sm text-[#64748B]">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    logger.log("❌ Pas de token, affichage du loader de redirection");
    // Ne pas afficher de contenu si pas de token, la redirection va se faire
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F97316] mx-auto mb-3"></div>
          <p className="text-sm text-[#64748B]">Redirection vers la connexion...</p>
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

