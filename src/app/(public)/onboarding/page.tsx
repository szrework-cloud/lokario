"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiPost, apiGet } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { motion, AnimatePresence } from "framer-motion";

type OnboardingStep = 1 | 2 | 3 | 4;

interface OnboardingStatus {
  onboarding_completed: boolean;
  discovery_source: string | null;
  sector: string | null;
  motivation: string | null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [showCompletionVideo, setShowCompletionVideo] = useState(false);

  // Vérifier le statut de l'onboarding au chargement
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      // Attendre que le token soit chargé
      if (!token) {
        // Ne pas rediriger immédiatement, attendre un peu que le token soit chargé
        return;
      }

      try {
        const status = await apiGet<OnboardingStatus>("/companies/me/onboarding/status", token);
        setOnboardingStatus(status);

        // Si l'onboarding est déjà complété, rediriger vers le dashboard
        if (status.onboarding_completed) {
          router.push("/app/dashboard");
          return;
        }

        // Déterminer l'étape actuelle en fonction des données déjà sauvegardées
        if (status.discovery_source && currentStep === 1) {
          setCurrentStep(2);
        }
        if (status.sector && currentStep <= 2) {
          setCurrentStep(3);
        }
        if (status.motivation && currentStep <= 3) {
          setCurrentStep(4);
        }
      } catch (err: any) {
        console.error("Erreur lors de la vérification du statut:", err);
        // Si l'erreur est 404 ou 500 (colonnes pas encore créées), c'est normal pour un nouveau compte
        // Ne pas afficher d'erreur, simplement continuer avec l'onboarding
        if (err.message && !err.message.includes("404") && !err.message.includes("500") && !err.message.includes("UndefinedColumn")) {
          setError("Erreur lors du chargement. Veuillez réessayer.");
        }
      }
    };

    checkOnboardingStatus();
  }, [token, router]);

  const handleStep1 = async (discoverySource: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      await apiPost("/companies/me/onboarding/step1", { discovery_source: discoverySource }, token);
      setCurrentStep(2);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async (sector: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      await apiPost("/companies/me/onboarding/step2", { sector }, token);
      setCurrentStep(3);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  const handleStep3 = async (motivation: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      await apiPost("/companies/me/onboarding/step3", { motivation }, token);
      setCurrentStep(4);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setLoading(false);
    }
  };

  const handleStep4 = async (plan: "starter" | "professional") => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      await apiPost("/companies/me/onboarding/step4", { plan }, token);
      // Afficher la vidéo de complétion avant de rediriger
      setShowCompletionVideo(true);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la finalisation");
      setLoading(false);
    }
  };

  const handleVideoComplete = () => {
    // Marquer qu'on doit lancer le tutoriel après redirection
    // Utiliser setTimeout pour s'assurer que le localStorage est bien défini avant la navigation
    localStorage.setItem("should_start_tutorial", "true");
    // Déclencher un événement personnalisé pour notifier les autres composants (même onglet)
    window.dispatchEvent(new Event("shouldStartTutorial"));
    // Déclencher aussi l'événement storage pour compatibilité
    window.dispatchEvent(new Event("storage"));
    // Rediriger vers le dashboard après la vidéo
    setTimeout(() => {
      router.push("/app/dashboard");
    }, 100);
  };

  // Afficher un loader si le token est en cours de chargement
  // Ne pas rediriger immédiatement vers login, attendre que useAuth charge le token
  if (!token) {
    // Attendre un peu pour que le token soit chargé depuis localStorage
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F97316] mx-auto mb-3"></div>
          <p className="text-sm text-[#64748B]">Chargement...</p>
        </div>
      </div>
    );
  }

  // Si la vidéo de complétion doit être affichée
  if (showCompletionVideo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F9FAFB] to-[#E5E7EB] flex items-center justify-center p-4">
        <div className="w-full max-w-5xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-lg p-8"
          >
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-bold text-[#0F172A] mb-2">
                Félicitations ! 🎉
              </h2>
              <p className="text-[#64748B]">
                Vous êtes maintenant prêt à utiliser Lokario. Regardez cette vidéo pour découvrir comment démarrer.
              </p>
            </div>
            
            <div className="mb-6">
              <div className="max-w-4xl mx-auto">
                <div className="relative rounded-xl overflow-hidden shadow-lg bg-black/5">
                  <div className="aspect-video w-full">
                    <video
                      src="/videos/onboarding-completion-video.mp4"
                      className="w-full h-full object-cover"
                      controls
                      playsInline
                      preload="metadata"
                      onEnded={handleVideoComplete}
                    >
                      Votre navigateur ne supporte pas la lecture de vidéos.
                    </video>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <AnimatedButton
                variant="primary"
                onClick={handleVideoComplete}
                className="w-full sm:w-auto"
              >
                Commencer à utiliser Lokario
              </AnimatedButton>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F9FAFB] to-[#E5E7EB] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all ${
                  step <= currentStep
                    ? "bg-[#F97316] text-white"
                    : "bg-[#E5E7EB] text-[#64748B]"
                }`}
              >
                {step}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded transition-all ${
                  step < currentStep ? "bg-[#F97316]" : "bg-[#E5E7EB]"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <Step1Component key="step1" onNext={handleStep1} loading={loading} />
          )}
          {currentStep === 2 && (
            <Step2Component key="step2" onNext={handleStep2} loading={loading} />
          )}
          {currentStep === 3 && (
            <Step3Component key="step3" onNext={handleStep3} loading={loading} />
          )}
          {currentStep === 4 && (
            <Step4Component key="step4" onNext={handleStep4} loading={loading} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Étape 1: Découverte
function Step1Component({
  onNext,
  loading,
}: {
  onNext: (value: string) => void;
  loading: boolean;
}) {
  const options = [
    { value: "reseaux_sociaux", label: "Réseaux sociaux" },
    { value: "recommandation", label: "Recommandation" },
    { value: "recherche_google", label: "Recherche Google" },
    { value: "publicite", label: "Publicité" },
    { value: "autre", label: "Autre" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white rounded-2xl shadow-lg p-8"
    >
      <h1 className="text-3xl font-bold text-[#0F172A] mb-4">
        Comment avez-vous découvert Lokario ?
      </h1>
      <p className="text-[#64748B] mb-8">Aidez-nous à mieux vous connaître</p>

      <div className="space-y-3">
        {options.map((option) => (
          <AnimatedButton
            key={option.value}
            variant="secondary"
            className="w-full text-left justify-start py-4 px-6"
            onClick={() => onNext(option.value)}
            disabled={loading}
            loading={loading}
          >
            {option.label}
          </AnimatedButton>
        ))}
      </div>
    </motion.div>
  );
}

// Étape 2: Secteur
function Step2Component({
  onNext,
  loading,
}: {
  onNext: (value: string) => void;
  loading: boolean;
}) {
  const options = [
    { value: "commerce", label: "Commerce" },
    { value: "restauration", label: "Restauration" },
    { value: "services", label: "Services" },
    { value: "artisan_btp", label: "Artisan / BTP" },
    { value: "independant", label: "Indépendant" },
    { value: "autre", label: "Autre" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white rounded-2xl shadow-lg p-8"
    >
      <h1 className="text-3xl font-bold text-[#0F172A] mb-4">
        Dans quel secteur travaillez-vous ?
      </h1>
      <p className="text-[#64748B] mb-8">Sélectionnez votre secteur d'activité</p>

      <div className="space-y-3">
        {options.map((option) => (
          <AnimatedButton
            key={option.value}
            variant="secondary"
            className="w-full text-left justify-start py-4 px-6"
            onClick={() => onNext(option.value)}
            disabled={loading}
            loading={loading}
          >
            {option.label}
          </AnimatedButton>
        ))}
      </div>
    </motion.div>
  );
}

// Étape 3: Motivation
function Step3Component({
  onNext,
  loading,
}: {
  onNext: (value: string) => void;
  loading: boolean;
}) {
  const options = [
    { value: "mieux_organiser", label: "Mieux m'organiser" },
    { value: "centraliser_messages", label: "Centraliser mes messages" },
    { value: "ne_rien_oublier", label: "Ne plus rien oublier" },
    { value: "gagner_temps", label: "Gagner du temps" },
    { value: "tester_ia", label: "Tester l'IA" },
    { value: "autre", label: "Autre" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white rounded-2xl shadow-lg p-8"
    >
      <h1 className="text-3xl font-bold text-[#0F172A] mb-4">
        Quelle est la principale raison pour laquelle vous utilisez Lokario ?
      </h1>
      <p className="text-[#64748B] mb-8">Choisissez ce qui vous motive le plus</p>

      <div className="space-y-3">
        {options.map((option) => (
          <AnimatedButton
            key={option.value}
            variant="secondary"
            className="w-full text-left justify-start py-4 px-6"
            onClick={() => onNext(option.value)}
            disabled={loading}
            loading={loading}
          >
            {option.label}
          </AnimatedButton>
        ))}
      </div>
    </motion.div>
  );
}

// Étape 4: Choix du plan
function Step4Component({
  onNext,
  loading,
}: {
  onNext: (value: "starter" | "professional") => void;
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-white rounded-2xl shadow-lg p-8"
    >
      <h1 className="text-3xl font-bold text-[#0F172A] mb-4">
        Choisissez votre plan
      </h1>
      <p className="text-[#64748B] mb-8">
        14 jours d'essai gratuit. Aucune carte bancaire requise.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Plan Essentiel */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="border-2 border-[#E5E7EB] rounded-xl p-6 cursor-pointer hover:border-[#F97316] transition-colors"
          onClick={() => onNext("starter")}
        >
          <h3 className="text-xl font-bold text-[#0F172A] mb-2">Essentiel</h3>
          <p className="text-3xl font-bold text-[#0F172A] mb-1">19,99€<span className="text-lg text-[#64748B]">/mois</span></p>
          <p className="text-sm text-[#64748B] mb-4">14 jours gratuits</p>
          <ul className="space-y-2 mb-6">
            <li className="flex items-start gap-2 text-sm text-[#64748B]">
              <span className="text-[#16A34A]">✓</span>
              <span><strong>20 devis/mois</strong> (limite mensuelle)</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-[#64748B]">
              <span className="text-[#16A34A]">✓</span>
              <span><strong>20 factures/mois</strong> (limite mensuelle)</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-[#64748B]">
              <span className="text-[#16A34A]">✓</span>
              <span><strong>50 clients</strong> (limite totale)</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-[#64748B]">
              <span className="text-[#16A34A]">✓</span>
              <span><strong>20 relances/mois</strong> (limite mensuelle)</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-[#64748B] mt-3 pt-3 border-t border-[#E5E7EB]">
              <span className="text-[#F97316]">⚠</span>
              <span>Modules non inclus : Rendez-vous, Inbox visible</span>
            </li>
          </ul>
          <AnimatedButton
            variant="secondary"
            className="w-full"
            disabled={loading}
            loading={loading}
            onClick={() => onNext("starter")}
          >
            Choisir Essentiel
          </AnimatedButton>
        </motion.div>

        {/* Plan Pro */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="border-2 border-[#F97316] rounded-xl p-6 cursor-pointer bg-gradient-to-br from-[#F97316]/5 to-transparent relative"
          onClick={() => onNext("professional")}
        >
          <div className="absolute -top-3 right-4 bg-[#F97316] text-white text-xs font-semibold px-3 py-1 rounded-full">
            Populaire
          </div>
          <h3 className="text-xl font-bold text-[#0F172A] mb-2">Pro</h3>
          <p className="text-3xl font-bold text-[#0F172A] mb-1">59,99€<span className="text-lg text-[#64748B]">/mois</span></p>
          <p className="text-sm text-[#64748B] mb-4">14 jours gratuits</p>
          <ul className="space-y-2 mb-6">
            <li className="flex items-start gap-2 text-sm text-[#64748B]">
              <span className="text-[#16A34A]">✓</span>
              <span><strong>Devis illimités</strong> (aucune limite)</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-[#64748B]">
              <span className="text-[#16A34A]">✓</span>
              <span><strong>Factures illimitées</strong> (aucune limite)</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-[#64748B]">
              <span className="text-[#16A34A]">✓</span>
              <span><strong>Clients illimités</strong> (aucune limite)</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-[#64748B]">
              <span className="text-[#16A34A]">✓</span>
              <span><strong>Relances illimitées</strong> (aucune limite)</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-[#64748B]">
              <span className="text-[#16A34A]">✓</span>
              <span><strong>Toutes les fonctionnalités</strong> : Rendez-vous, Inbox, Export Excel, API, etc.</span>
            </li>
          </ul>
          <AnimatedButton
            variant="primary"
            className="w-full"
            disabled={loading}
            loading={loading}
            onClick={() => onNext("professional")}
          >
            Choisir Pro
          </AnimatedButton>
        </motion.div>
      </div>

      <p className="mt-6 text-xs text-center text-[#64748B]">
        Aucune carte bancaire requise. Vous pourrez choisir votre méthode de paiement après les 14 jours d'essai.
      </p>
    </motion.div>
  );
}
