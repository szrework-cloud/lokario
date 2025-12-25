"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import React from "react";

interface Step {
  target: string;
  title: string;
  content: string | React.ReactNode;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  action?: "navigate" | "click";
  navigateTo?: string;
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

  const initializeTutorial = useCallback(() => {
    console.log("[TUTORIAL] Initializing tutorial...");
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
        target: "[data-tutorial='settings-content-company']",
        title: "📋 Infos entreprise",
        content: (
          <div className="space-y-3">
            <p className="font-medium">Remplissez les informations de base de votre entreprise :</p>
            <ul className="list-disc list-inside space-y-1.5 text-sm">
              <li>Nom de l'entreprise</li>
              <li>Logo (optionnel mais recommandé)</li>
              <li>Email et téléphone</li>
              <li>Adresse complète</li>
              <li>SIRET/SIREN (important pour les factures)</li>
              <li>Numéro de TVA si applicable</li>
            </ul>
            <p className="text-sm text-[#64748B] mt-2">Ces informations apparaîtront sur vos devis et factures.</p>
          </div>
        ),
        placement: "top",
        action: "navigate",
        navigateTo: "/app/settings?tab=company",
      },
      {
        target: "[data-tutorial='settings-content-billing']",
        title: "💼 Facturation",
        content: (
          <div className="space-y-3">
            <p className="font-medium">Personnalisez vos devis et factures :</p>
            <ul className="list-disc list-inside space-y-1.5 text-sm">
              <li><strong>Design :</strong> Choisissez vos couleurs (couleur principale et secondaire)</li>
              <li><strong>Logo :</strong> Ajoutez ou modifiez le logo pour vos documents</li>
              <li><strong>Signature :</strong> Téléchargez votre signature pour les devis</li>
              <li><strong>Numérotation :</strong> Configurez le format de numérotation (ex: DEV-2025-0001)</li>
              <li><strong>Taux de TVA :</strong> Ajoutez les taux de TVA que vous utilisez (20%, 5.5%, etc.)</li>
              <li><strong>Textes :</strong> Personnalisez les mentions légales et conditions</li>
            </ul>
          </div>
        ),
        placement: "top",
        action: "click",
      },
      {
        target: "[data-tutorial='settings-content-modules']",
        title: "🔧 Modules activés",
        content: (
          <div className="space-y-3">
            <p className="font-medium">Activez ou désactivez les fonctionnalités selon vos besoins et votre abonnement :</p>
            <ul className="list-disc list-inside space-y-1.5 text-sm">
              <li><strong>Rendez-vous :</strong> Gérez vos rendez-vous clients</li>
              <li><strong>Inbox :</strong> Centralisez vos messages</li>
              <li><strong>Projets :</strong> Suivez vos projets</li>
              <li><strong>Relances :</strong> Activez les relances automatiques</li>
            </ul>
            <p className="text-sm text-[#64748B] mt-2">Note : Certains modules peuvent être limités selon votre plan d'abonnement.</p>
          </div>
        ),
        placement: "top",
        action: "click",
      },
      {
        target: "[data-tutorial='settings-content-ia']",
        title: "🤖 Intelligence artificielle",
        content: (
          <div className="space-y-3">
            <p className="font-medium">Configurez l'IA pour automatiser vos tâches :</p>
            <ul className="list-disc list-inside space-y-1.5 text-sm">
              <li><strong>Réponses automatiques :</strong> Personnalisez le prompt pour les réponses automatiques aux emails</li>
              <li><strong>Résumés :</strong> Configurez comment l'IA doit résumer vos conversations</li>
              <li><strong>Classification :</strong> L'IA classera automatiquement vos messages</li>
            </ul>
            <p className="text-sm text-[#64748B] mt-2">Ces paramètres aideront l'IA à mieux comprendre votre entreprise.</p>
          </div>
        ),
        placement: "top",
        action: "click",
      },
      {
        target: "[data-tutorial='settings-content-subscription']",
        title: "💳 Abonnement",
        content: (
          <div className="space-y-3">
            <p className="font-medium">Consultez votre abonnement et vos quotas :</p>
            <ul className="list-disc list-inside space-y-1.5 text-sm">
              <li><strong>Plan actuel :</strong> Voir votre plan (Essentiel ou Pro)</li>
              <li><strong>Quotas :</strong> Vérifiez votre utilisation (devis, factures, clients, etc.)</li>
              <li><strong>Gérer :</strong> Cliquez sur "Voir les abonnements" pour changer de plan</li>
            </ul>
            <p className="text-sm text-[#64748B] mt-2">Pendant l'essai gratuit, vous avez accès à toutes les fonctionnalités.</p>
          </div>
        ),
        placement: "top",
        action: "click",
      },
      {
        target: "[data-tutorial='settings-content-integrations']",
        title: "🔗 Intégrations",
        content: (
          <div className="space-y-3">
            <p className="font-medium">Connectez vos outils externes :</p>
            <ul className="list-disc list-inside space-y-1.5 text-sm">
              <li><strong>Email :</strong> Connectez votre boîte email (Gmail, Outlook, etc.) pour centraliser vos messages</li>
              <li><strong>SMS :</strong> Intégrez un service SMS si disponible</li>
              <li><strong>Autres :</strong> D'autres intégrations peuvent être disponibles selon votre plan</li>
            </ul>
            <p className="text-sm text-[#64748B] mt-2">Les intégrations permettent de centraliser toutes vos communications dans Lokario.</p>
          </div>
        ),
        placement: "top",
        action: "click",
      },
      {
        target: "[data-tutorial='settings-content-team']",
        title: "👥 Équipe",
        content: (
          <div className="space-y-3">
            <p className="font-medium">Gérez les membres de votre équipe :</p>
            <ul className="list-disc list-inside space-y-1.5 text-sm">
              <li><strong>Inviter :</strong> Ajoutez des membres à votre entreprise</li>
              <li><strong>Permissions :</strong> Définissez qui peut faire quoi (créer des devis, voir les statistiques, etc.)</li>
              <li><strong>Supprimer :</strong> Retirez des membres si nécessaire</li>
            </ul>
            <p className="text-sm text-[#64748B] mt-2">Tous les membres partagent le même abonnement et les mêmes quotas.</p>
          </div>
        ),
        placement: "top",
        action: "click",
      },
    ];

    console.log("[TUTORIAL] Setting tutorial state:", { stepsCount: steps.length });
    setTutorialState({
      isRunning: true,
      currentStep: 0,
      steps,
    });
    console.log("[TUTORIAL] Tutorial state set");
  }, []);

  // Vérifier si le tutoriel doit être lancé
  useEffect(() => {
    let retryCount = 0;
    const MAX_RETRIES = 25; // 5 secondes max (25 * 200ms)
    let timeoutId: NodeJS.Timeout | null = null;

    const checkAndStartTutorial = () => {
      const shouldStartTutorial = localStorage.getItem("should_start_tutorial") === "true";
      const tutorialCompleted = localStorage.getItem("tutorial_completed") === "true";

      // Vérifier aussi le pathname depuis window.location au cas où usePathname n'est pas encore à jour
      const currentPath = typeof window !== "undefined" ? window.location.pathname : pathname;
      const isOnDashboard = pathname === "/app/dashboard" || currentPath === "/app/dashboard";

      console.log("[TUTORIAL] Checking tutorial start:", {
        shouldStartTutorial: shouldStartTutorial ? "TRUE" : "FALSE",
        tutorialCompleted: tutorialCompleted ? "TRUE" : "FALSE",
        pathname: `"${pathname}"`,
        currentPath: `"${currentPath}"`,
        isOnDashboard: isOnDashboard ? "TRUE" : "FALSE",
      });

      if (shouldStartTutorial && !tutorialCompleted && isOnDashboard) {
        // Vérifier que le premier élément cible existe avant de démarrer
        const checkElementExists = () => {
          const firstElement = document.querySelector("[data-tutorial='dashboard-overview']");
          console.log("[TUTORIAL] Checking element exists:", {
            found: !!firstElement,
            retryCount,
            maxRetries: MAX_RETRIES,
            selector: "[data-tutorial='dashboard-overview']",
          });

          if (firstElement) {
            // L'élément existe, démarrer le tutoriel
            console.log("[TUTORIAL] Element found! Starting tutorial...");
            setTimeout(() => {
              initializeTutorial();
              localStorage.removeItem("should_start_tutorial");
              console.log("[TUTORIAL] Tutorial started successfully");
            }, 300);
          } else if (retryCount < MAX_RETRIES) {
            // Réessayer après un court délai
            retryCount++;
            timeoutId = setTimeout(checkElementExists, 200);
          } else {
            console.warn("[TUTORIAL] Max retries reached, element not found");
            console.warn("[TUTORIAL] Available elements with data-tutorial:", 
              Array.from(document.querySelectorAll("[data-tutorial]")).map(el => ({
                attribute: el.getAttribute("data-tutorial"),
                tagName: el.tagName,
                className: el.className,
              }))
            );
          }
        };

        // Commencer à vérifier après un délai initial pour laisser le DOM se charger
        setTimeout(checkElementExists, 800);
      } else {
        const reason = !shouldStartTutorial ? "should_start_tutorial not set" :
                      tutorialCompleted ? "tutorial already completed" :
                      !isOnDashboard ? "not on dashboard" : "unknown";
        console.log("[TUTORIAL] Conditions not met:", {
          shouldStartTutorial: shouldStartTutorial ? "TRUE" : "FALSE",
          tutorialCompleted: tutorialCompleted ? "TRUE" : "FALSE",
          isOnDashboard: isOnDashboard ? "TRUE" : "FALSE",
          pathname: `"${pathname}"`,
          currentPath: `"${currentPath}"`,
          reason: reason
        });
        console.log("[TUTORIAL] Full localStorage:", {
          should_start_tutorial: localStorage.getItem("should_start_tutorial"),
          tutorial_completed: localStorage.getItem("tutorial_completed"),
        });
      }
    };

    // Vérifier immédiatement
    checkAndStartTutorial();

    // Écouter les changements de storage au cas où il serait défini après le montage
    const handleStorageChange = (e?: Event) => {
      console.log("[TUTORIAL] Storage change event:", e?.type);
      retryCount = 0; // Réinitialiser le compteur de retry
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      // Attendre un peu après l'événement pour que le pathname soit à jour
      setTimeout(() => {
        checkAndStartTutorial();
      }, 100);
    };

    // Écouter les événements storage (entre onglets) et un événement personnalisé (même onglet)
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("shouldStartTutorial", handleStorageChange);

    // Vérifier aussi après plusieurs délais pour gérer les cas où localStorage est défini juste avant la navigation
    const initialTimeoutId1 = setTimeout(() => {
      console.log("[TUTORIAL] First timeout check (500ms)");
      checkAndStartTutorial();
    }, 500);

    const initialTimeoutId2 = setTimeout(() => {
      console.log("[TUTORIAL] Second timeout check (1500ms)");
      checkAndStartTutorial();
    }, 1500);

    const initialTimeoutId3 = setTimeout(() => {
      console.log("[TUTORIAL] Third timeout check (3000ms)");
      checkAndStartTutorial();
    }, 3000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("shouldStartTutorial", handleStorageChange);
      if (timeoutId) clearTimeout(timeoutId);
      clearTimeout(initialTimeoutId1);
      clearTimeout(initialTimeoutId2);
      clearTimeout(initialTimeoutId3);
    };
  }, [pathname, initializeTutorial]);

  const handleNext = () => {
    const currentStepData = tutorialState.steps[tutorialState.currentStep];
    
    // Si l'étape a une action "navigate", naviguer d'abord
    if (currentStepData?.action === "navigate" && currentStepData.navigateTo) {
      router.push(currentStepData.navigateTo);
      // Attendre un peu que la navigation se termine avant de passer à l'étape suivante
      setTimeout(() => {
        if (tutorialState.currentStep < tutorialState.steps.length - 1) {
          setTutorialState((prev) => ({
            ...prev,
            currentStep: prev.currentStep + 1,
          }));
        } else {
          handleFinish();
        }
      }, 500);
      return;
    }

    // Si l'étape a une action "click", cliquer sur l'élément cible
    if (currentStepData?.action === "click") {
      // Si on cible le contenu d'une section des paramètres, cliquer d'abord sur l'onglet correspondant
      if (currentStepData.target.includes("settings-content-")) {
        const tabId = currentStepData.target.replace("[data-tutorial='settings-content-", "").replace("']", "");
        const tabButton = document.querySelector(`[data-tutorial='settings-tab-${tabId}']`) as HTMLElement;
        if (tabButton) {
          tabButton.click();
          // Attendre que l'onglet s'ouvre avant de passer à l'étape suivante
          setTimeout(() => {
            if (tutorialState.currentStep < tutorialState.steps.length - 1) {
              setTutorialState((prev) => ({
                ...prev,
                currentStep: prev.currentStep + 1,
              }));
            } else {
              handleFinish();
            }
          }, 500);
          return;
        }
      }
      
      const element = document.querySelector(currentStepData.target) as HTMLElement;
      if (element) {
        element.click();
        // Attendre un peu que le clic se propage avant de passer à l'étape suivante
        setTimeout(() => {
          if (tutorialState.currentStep < tutorialState.steps.length - 1) {
            setTutorialState((prev) => ({
              ...prev,
              currentStep: prev.currentStep + 1,
            }));
          } else {
            handleFinish();
          }
        }, 300);
        return;
      }
    }

    // Comportement par défaut
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

  const [position, setPosition] = useState<{
    top: number;
    left: number;
    transformX: string;
    transformY: string;
    elementRect: DOMRect;
  } | null>(null);

  // Calculer la position du tooltip
  const getTooltipPosition = useCallback((target: string) => {
    if (typeof window === "undefined") return null;
    
    const element = document.querySelector(target);
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    const step = tutorialState.steps[tutorialState.currentStep];
    const placement = step?.placement || "bottom";

    let top = 0;
    let left = 0;
    let transformX = "0";
    let transformY = "0";

    switch (placement) {
      case "bottom":
        top = rect.bottom + 16;
        left = rect.left + rect.width / 2;
        transformX = "-50%";
        break;
      case "top":
        top = rect.top - 16;
        left = rect.left + rect.width / 2;
        transformX = "-50%";
        transformY = "-100%";
        break;
      case "right":
        top = rect.top + rect.height / 2;
        left = rect.right + 16;
        transformY = "-50%";
        break;
      case "left":
        top = rect.top + rect.height / 2;
        left = rect.left - 16;
        transformX = "-100%";
        transformY = "-50%";
        break;
    }

    return { top, left, transformX, transformY, elementRect: rect };
  }, [tutorialState.steps, tutorialState.currentStep]);

  // Recalculer la position quand l'étape change
  useEffect(() => {
    if (tutorialState.isRunning && tutorialState.steps.length > 0) {
      const currentStep = tutorialState.steps[tutorialState.currentStep];
      if (currentStep) {
        // Attendre un peu pour que le DOM soit à jour, puis chercher l'élément
        const findElement = () => {
          const pos = getTooltipPosition(currentStep.target);
          if (pos) {
            setPosition(pos);
          } else {
            // Si l'élément n'est pas trouvé, réessayer après un court délai
            setTimeout(() => {
              const retryPos = getTooltipPosition(currentStep.target);
              if (retryPos) {
                setPosition(retryPos);
              }
            }, 100);
          }
        };

        // Utiliser requestAnimationFrame pour s'assurer que le DOM est à jour
        requestAnimationFrame(() => {
          setTimeout(findElement, 50);
        });
      }
    } else {
      setPosition(null);
    }
  }, [tutorialState.isRunning, tutorialState.currentStep, tutorialState.steps, getTooltipPosition, pathname]);

  const currentStep = tutorialState.steps[tutorialState.currentStep];

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
          <div className="text-sm text-[#64748B] mb-6">
            {typeof currentStep.content === "string" ? (
              <p className="whitespace-pre-line">{currentStep.content}</p>
            ) : (
              currentStep.content
            )}
          </div>

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
