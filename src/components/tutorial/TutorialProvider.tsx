"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";

// Importer React Joyride dynamiquement pour éviter les erreurs SSR
const Joyride = dynamic(() => import("react-joyride"), { ssr: false });

interface Step {
  target: string;
  content: React.ReactNode;
  disableBeacon?: boolean;
  placement?: "top" | "bottom" | "left" | "right" | "center" | "auto";
}

interface TutorialState {
  run: boolean;
  stepIndex: number;
  steps: Step[];
}

interface TutorialProviderProps {
  children: React.ReactNode;
}

export function TutorialProvider({ children }: TutorialProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    run: false,
    stepIndex: 0,
    steps: [],
  });

  // Vérifier si le tutoriel doit être lancé
  useEffect(() => {
    const shouldStartTutorial = localStorage.getItem("should_start_tutorial") === "true";
    const tutorialCompleted = localStorage.getItem("tutorial_completed") === "true";

    if (shouldStartTutorial && !tutorialCompleted && pathname === "/app/dashboard") {
      // Attendre un peu que la page soit chargée
      setTimeout(() => {
        initializeTutorial();
        localStorage.removeItem("should_start_tutorial");
      }, 1000);
    }
  }, [pathname]);

  const initializeTutorial = useCallback(() => {
    const steps: Step[] = [
      {
        target: "[data-tutorial='dashboard-overview']",
        content: (
          <div className="p-2">
            <h3 className="font-semibold text-base mb-2 text-[#0F172A]">Bienvenue sur Lokario ! 👋</h3>
            <p className="text-sm text-[#64748B]">
              Voici votre tableau de bord. Il vous donne une vue d'ensemble de votre activité.
            </p>
          </div>
        ),
        disableBeacon: true,
        placement: "bottom",
      },
      {
        target: "[data-tutorial='inbox-link']",
        content: (
          <div className="p-2">
            <h3 className="font-semibold text-base mb-2 text-[#0F172A]">📥 La Boîte de Réception</h3>
            <p className="text-sm text-[#64748B] mb-2">
              Gérez tous vos messages emails, SMS et WhatsApp au même endroit.
            </p>
            <p className="text-sm text-[#64748B]">
              Cliquez sur "Inbox" dans la sidebar pour y accéder.
            </p>
          </div>
        ),
        disableBeacon: true,
        placement: "right",
      },
      {
        target: "[data-tutorial='billing-link']",
        content: (
          <div className="p-2">
            <h3 className="font-semibold text-base mb-2 text-[#0F172A]">💼 Devis & Factures</h3>
            <p className="text-sm text-[#64748B] mb-2">
              Créez et gérez vos devis et factures facilement.
            </p>
            <p className="text-sm text-[#64748B]">
              Cliquez sur "Devis & Factures" dans la sidebar.
            </p>
          </div>
        ),
        disableBeacon: true,
        placement: "right",
      },
      {
        target: "[data-tutorial='settings-link']",
        content: (
          <div className="p-2">
            <h3 className="font-semibold text-base mb-2 text-[#0F172A]">⚙️ Paramètres</h3>
            <p className="text-sm text-[#64748B] mb-2">
              Personnalisez Lokario selon vos besoins : logo, signature, modules, etc.
            </p>
            <p className="text-sm text-[#64748B]">
              Cliquez sur "Paramètres" dans la sidebar.
            </p>
          </div>
        ),
        disableBeacon: true,
        placement: "right",
      },
    ];

    setTutorialState({
      run: true,
      stepIndex: 0,
      steps,
    });
  }, []);

  const handleJoyrideCallback = (data: any) => {
    const { status, type } = data;

    if (status === "finished" || status === "skipped") {
      localStorage.setItem("tutorial_completed", "true");
      setTutorialState((prev) => ({ ...prev, run: false }));
    }
  };

  const styles = {
    options: {
      primaryColor: "#F97316",
      zIndex: 10000,
    },
    tooltip: {
      borderRadius: 8,
    },
    tooltipContainer: {
      textAlign: "left" as const,
    },
    buttonNext: {
      backgroundColor: "#F97316",
      fontSize: 14,
      padding: "8px 16px",
      borderRadius: 6,
    },
    buttonBack: {
      color: "#64748B",
      fontSize: 14,
      padding: "8px 16px",
      marginRight: 8,
    },
    buttonSkip: {
      color: "#64748B",
      fontSize: 14,
    },
  };

  return (
    <>
      {children}
      {typeof window !== "undefined" && (
        <Joyride
          steps={tutorialState.steps}
          run={tutorialState.run}
          stepIndex={tutorialState.stepIndex}
          continuous
          showProgress
          showSkipButton
          callback={handleJoyrideCallback}
          styles={styles}
          locale={{
            back: "Précédent",
            close: "Fermer",
            last: "Terminer",
            next: "Suivant",
            skip: "Passer",
          }}
        />
      )}
    </>
  );
}

