"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopBar } from "@/components/layout/AppTopBar";
import { AppFooter } from "@/components/layout/AppFooter";
import { PageProvider, usePage } from "@/contexts/PageContext";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { FloatingChatWidget } from "@/components/chatbot/FloatingChatWidget";
import { TutorialProvider } from "@/components/tutorial/TutorialProvider";
import { logger } from "@/lib/logger";
import { apiGet } from "@/lib/api";

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const { title, subtitle, rightContent } = usePage();

  // Réinitialiser le background du body (au cas où il aurait été modifié par les pages publiques)
  useEffect(() => {
    document.body.style.backgroundColor = "#F9FAFB";
    return () => {
      // Ne pas réinitialiser au démontage pour éviter les conflits
    };
  }, []);

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
  const [isCheckingDeletion, setIsCheckingDeletion] = useState(true);
  
  // Charger les settings automatiquement après login (une seule fois)
  useSettings(true);

  useEffect(() => {
    if (!isLoading && token) {
      logger.log("🔍 Vérification auth dans AppLayout:", { isLoading, hasToken: !!token, hasUser: !!user, userRole: user?.role });
      
      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
      
      // Ne pas vérifier si on est déjà sur la page /restore ou /login
      if (currentPath === "/restore" || currentPath === "/login") {
        setIsCheckingDeletion(false);
        return;
      }

      // Vérifier le statut de suppression et BLOQUER l'accès si nécessaire
      const checkDeletionStatus = async () => {
        try {
          const { apiGet } = await import("@/lib/api");
          logger.log("🔍 AppLayout: Vérification du statut de suppression...");
          const deletionStatus = await apiGet<{ deletion_in_progress: boolean }>("/users/me/deletion-status", token);
          logger.log("📊 AppLayout: Statut reçu:", deletionStatus);
          
          if (deletionStatus && deletionStatus.deletion_in_progress) {
            // BLOQUER l'accès et rediriger vers /restore
            logger.log("🔄 AppLayout: Compte en cours de suppression, BLOQUAGE et redirection vers /restore");
            window.location.replace("/restore");
            return;
          }
          setIsCheckingDeletion(false);
        } catch (error: any) {
          // Si l'endpoint échoue avec 403 ou 500, c'est probablement que le compte est bloqué
          logger.log("⚠️ AppLayout: Erreur lors de la vérification:", error);
          console.error("Détails:", error?.status, error?.message);
          
          if (error?.status === 403 || error?.status === 500 || error?.message?.includes("Account deletion in progress")) {
            // Si erreur 403 ou 500, BLOQUER l'accès et rediriger vers /restore
            // (500 peut arriver si l'endpoint a un problème, mais on assume que c'est un compte en suppression)
            logger.log("🔄 AppLayout: Erreur détectée (403/500), BLOQUAGE et redirection vers /restore");
            window.location.replace("/restore");
            return;
          }
          // Si erreur 401, ne pas rediriger vers login ici, laisser AppLayout gérer
          if (error?.status === 401) {
            logger.log("⚠️ AppLayout: Erreur 401 - session peut-être expirée");
            // Ne pas rediriger automatiquement, laisser le code continuer
            setIsCheckingDeletion(false);
            return;
          }
          // Sinon, continuer normalement (peut être une erreur réseau)
          console.warn("Impossible de vérifier le statut de suppression:", error);
          setIsCheckingDeletion(false);
        }
      };

      if (!token) {
        logger.log("❌ Pas de token, redirection vers /login");
        router.replace("/login");
        setIsCheckingDeletion(false);
      } else if (user?.role === "super_admin") {
        // Rediriger les super_admin vers la page admin par défaut
        if (currentPath === "/app" || currentPath === "/app/") {
          logger.log("🔄 Super admin, redirection vers /admin/companies");
          router.replace("/admin/companies");
        }
        setIsCheckingDeletion(false);
      } else {
        // Vérifier si l'onboarding est complété
        const checkOnboarding = async () => {
          try {
            const onboardingStatus = await apiGet<{ onboarding_completed: boolean }>(
              "/companies/me/onboarding/status",
              token
            );
            
            if (!onboardingStatus.onboarding_completed) {
              logger.log("🔄 Onboarding non complété, redirection vers /onboarding");
              router.replace("/onboarding");
              setIsCheckingDeletion(false);
              return;
            }
          } catch (err) {
            // Si erreur 404, c'est normal (pas encore de données), continuer
            if (err instanceof Error && !err.message.includes("404")) {
              logger.log("⚠️ Erreur lors de la vérification de l'onboarding:", err);
            }
          }
          
          // Vérifier le statut de suppression pour les utilisateurs normaux
          // BLOQUER l'accès jusqu'à ce que la vérification soit terminée
          checkDeletionStatus();
        };
        
        checkOnboarding();
      }
    } else if (!isLoading && !token) {
      setIsCheckingDeletion(false);
    }
  }, [isLoading, token, router, user]);

  if (isLoading || isCheckingDeletion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F97316] mx-auto mb-3"></div>
          <p className="text-sm text-[#64748B]">
            {isCheckingDeletion ? "Vérification du statut de votre compte..." : "Chargement de votre espace..."}
          </p>
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
      <TutorialProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
        <FloatingChatWidget />
      </TutorialProvider>
    </PageProvider>
  );
}

