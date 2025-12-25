"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

interface Step {
  target: string;
  title: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
}

interface TutorialState {
  isRunning: boolean;
  currentStep: number;
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
    isRunning: false,
    currentStep: 0,
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
        title: "Bienvenue sur Lokario ! 👋",
        content: "Voici votre tableau de bord. Il vous donne une vue d'ensemble de votre activité.",
        placement: "bottom",
      },
      {
        target: "[data-tutorial='inbox-link']",
        title: "📥 La Boîte de Réception",
        content: "Gérez tous vos messages emails, SMS et WhatsApp au même endroit. Cliquez sur 'Inbox' dans la sidebar pour y accéder.",
        placement: "right",
      },
      {
        target: "[data-tutorial='billing-link']",
        title: "💼 Devis & Factures",
        content: "Créez et gérez vos devis et factures facilement. Cliquez sur 'Devis & Factures' dans la sidebar.",
        placement: "right",
      },
      {
        target: "[data-tutorial='settings-link']",
        title: "⚙️ Paramètres",
        content: "Personnalisez Lokario selon vos besoins : logo, signature, modules, etc. Cliquez sur 'Paramètres' dans la sidebar.",
        placement: "right",
      },
    ];

    setTutorialState({
      isRunning: true,
      currentStep: 0,
      steps,
    });
  }, []);

  const handleNext = () => {
    if (tutorialState.currentStep < tutorialState.steps.length - 1) {
      setTutorialState((prev) => ({
        ...prev,
        currentStep: prev.currentStep + 1,
      }));
    } else {
      handleFinish();
    }
  };

  const handlePrevious = () => {
    if (tutorialState.currentStep > 0) {
      setTutorialState((prev) => ({
        ...prev,
        currentStep: prev.currentStep - 1,
      }));
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = () => {
    localStorage.setItem("tutorial_completed", "true");
    setTutorialState({
      isRunning: false,
      currentStep: 0,
      steps: [],
    });
  };

  // Calculer la position du tooltip
  const getTooltipPosition = (target: string) => {
    if (typeof window === "undefined") return { top: 0, left: 0 };
    
    const element = document.querySelector(target);
    if (!element) return { top: 0, left: 0 };

    const rect = element.getBoundingClientRect();
    const step = tutorialState.steps[tutorialState.currentStep];
    const placement = step?.placement || "bottom";

    let top = 0;
    let left = 0;

    switch (placement) {
      case "bottom":
        top = rect.bottom + window.scrollY + 16;
        left = rect.left + window.scrollX + rect.width / 2;
        break;
      case "top":
        top = rect.top + window.scrollY - 16;
        left = rect.left + window.scrollX + rect.width / 2;
        break;
      case "right":
        top = rect.top + window.scrollY + rect.height / 2;
        left = rect.right + window.scrollX + 16;
        break;
      case "left":
        top = rect.top + window.scrollY + rect.height / 2;
        left = rect.left + window.scrollX - 16;
        break;
    }

    return { top, left, elementRect: rect };
  };

  const currentStep = tutorialState.steps[tutorialState.currentStep];
  const position = tutorialState.isRunning && currentStep
    ? getTooltipPosition(currentStep.target)
    : null;

  return (
    <>
      {children}
      
      {/* Overlay sombre */}
      {tutorialState.isRunning && (
        <div
          className="fixed inset-0 bg-black/50 z-[9998] transition-opacity"
          style={{ pointerEvents: "none" }}
        />
      )}

      {/* Highlight de l'élément cible */}
      {tutorialState.isRunning && currentStep && position && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: `${position.elementRect.top}px`,
            left: `${position.elementRect.left}px`,
            width: `${position.elementRect.width}px`,
            height: `${position.elementRect.height}px`,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 0 4px #F97316",
            borderRadius: "8px",
            transition: "all 0.3s ease",
          }}
        />
      )}

      {/* Tooltip du tutoriel */}
      {tutorialState.isRunning && currentStep && position && (
        <div
          className="fixed z-[10000] bg-white rounded-lg shadow-2xl max-w-sm p-6"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: `translate(${position.transformX}, ${position.transformY})`,
          }}
        >
          {/* Indicateur de progression */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-[#64748B]">
              Étape {tutorialState.currentStep + 1} sur {tutorialState.steps.length}
            </span>
            <button
              onClick={handleSkip}
              className="text-xs text-[#64748B] hover:text-[#0F172A] transition-colors"
            >
              Passer
            </button>
          </div>

          {/* Titre */}
          <h3 className="font-semibold text-base mb-2 text-[#0F172A]">
            {currentStep.title}
          </h3>

          {/* Contenu */}
          <p className="text-sm text-[#64748B] mb-6">
            {currentStep.content}
          </p>

          {/* Boutons de navigation */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handlePrevious}
              disabled={tutorialState.currentStep === 0}
              className="px-4 py-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Précédent
            </button>
            <button
              onClick={handleNext}
              className="px-4 py-2 text-sm font-medium text-white bg-[#F97316] hover:bg-[#EA580C] rounded-lg transition-colors"
            >
              {tutorialState.currentStep === tutorialState.steps.length - 1 ? "Terminer" : "Suivant"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
