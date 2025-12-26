"use client";

import { useState, useEffect } from "react";
import { PageTitle } from "@/components/layout/PageTitle";
import { PageTransition } from "@/components/ui/PageTransition";
import { PricingCard } from "@/components/stripe/PricingCard";
import { usePlans, useSubscription, useCreateCheckoutSession } from "@/hooks/queries/useStripe";
import { Card, CardContent } from "@/components/ui/Card";
import { Loader } from "@/components/ui/Loader";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { useRouter, useSearchParams } from "next/navigation";
import { SubscriptionPlan } from "@/services/stripeService";

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRequired = searchParams?.get("required") === "true";
  const { data: plansData, isLoading: isLoadingPlans } = usePlans();
  const { data: subscriptionData, isLoading: isLoadingSubscription } = useSubscription();
  const createCheckout = useCreateCheckoutSession();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<"month" | "year">("month");
  const [promoCode, setPromoCode] = useState<string>("");

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    setSelectedPlan(plan.id);
    
    const successUrl = `${window.location.origin}/app/settings?success=true`;
    const cancelUrl = `${window.location.origin}/app/pricing?canceled=true`;

    // Extraire le plan et l'interval depuis l'ID (format: "starter_monthly" ou "professional_yearly")
    const planParts = plan.id.split("_");
    const planName = planParts[0] as "starter" | "professional";
    const interval = plan.interval as "month" | "year";

    createCheckout.mutate({
      plan: planName,
      interval,
      successUrl,
      cancelUrl,
      promoCode: promoCode.trim() || undefined,
    });
  };

  const handleManageSubscription = () => {
    router.push("/app/settings?tab=billing");
  };

  if (isLoadingPlans || isLoadingSubscription) {
    return (
      <PageTransition>
        <PageTitle title="Tarifs" />
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader />
        </div>
      </PageTransition>
    );
  }

  const plans = plansData?.plans || [];
  const subscription = subscriptionData?.subscription;
  // Ne considérer comme "plan actuel" que si l'abonnement est actif ET payant (pas en trial gratuit)
  const isPaidActive = subscription && 
    subscription.status === "active" && 
    subscription.amount > 0;
  const currentPlan = isPaidActive ? (subscription?.plan || null) : null;
  const hasSubscription = subscriptionData?.has_subscription || false;
  const isSubscriptionActive = subscription && (subscription.status === "active" || subscription.status === "trialing");
  
  // Filtrer les plans par interval sélectionné
  const filteredPlans = plans.filter(plan => plan.interval === selectedInterval);

  return (
    <PageTransition>
      <PageTitle title="Tarifs" />
      <div className="space-y-8">
        {/* Message si abonnement requis */}
        {isRequired && (
          <Card className="bg-gradient-to-r from-[#F97316]/10 to-[#EA580C]/10 border-[#F97316]/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-[#F97316]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-1">
                    Abonnement requis
                  </h3>
                  <p className="text-sm text-[#64748B]">
                    Un abonnement actif est nécessaire pour accéder à l'application. 
                    Choisissez un plan ci-dessous pour continuer.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* En-tête */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-[#0F172A]">
            Commencez dès aujourd'hui
          </h1>
          <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
            Une solution complète pour gérer votre activité professionnelle. 
            Tous les outils dont vous avez besoin en un seul endroit.
          </p>
        </div>

        {/* Message si abonnement actif */}
        {hasSubscription && subscriptionData?.subscription && (
          <Card className="bg-gradient-to-r from-[#F97316]/10 to-[#EA580C]/10 border-[#F97316]/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-1">
                    Abonnement actif
                  </h3>
                  <p className="text-sm text-[#64748B]">
                    {subscriptionData.subscription.status === "trialing" && subscriptionData.subscription.amount === 0
                      ? "Gratuit - Accès complet pendant l'essai"
                      : subscriptionData.subscription.plan === "starter"
                        ? "Plan Essentiel"
                        : subscriptionData.subscription.plan === "professional"
                          ? "Plan Pro"
                          : `Plan ${subscriptionData.subscription.plan}`}
                    {subscriptionData.subscription.status === "trialing" && subscriptionData.subscription.amount === 0
                      ? ""
                      : subscriptionData.subscription.status === "active"
                        ? " - Actif"
                        : subscriptionData.subscription.status === "past_due"
                          ? " - Paiement en retard"
                          : ""}
                  </p>
                </div>
                <AnimatedButton
                  variant="primary"
                  onClick={handleManageSubscription}
                >
                  Gérer l'abonnement
                </AnimatedButton>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Toggle mensuel/annuel */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className={`text-sm transition-colors ${selectedInterval === "month" ? 'text-[#0F172A] font-medium' : 'text-[#64748B]'}`}>
            Mensuel
          </span>
          <button
            onClick={() => setSelectedInterval(selectedInterval === "month" ? "year" : "month")}
            className={`relative w-14 h-7 rounded-full transition-colors ${selectedInterval === "year" ? 'bg-[#F97316]' : 'bg-[#E5E7EB]'}`}
          >
            <span 
              className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${selectedInterval === "year" ? 'left-8' : 'left-1'}`}
            />
          </button>
          <span className={`text-sm transition-colors ${selectedInterval === "year" ? 'text-[#0F172A] font-medium' : 'text-[#64748B]'}`}>
            Annuel
          </span>
          {selectedInterval === "year" && (
            <span className="bg-[#F97316]/10 text-[#F97316] text-xs font-medium px-2 py-1 rounded-full">
              -20%
            </span>
          )}
        </div>

        {/* Plans disponibles (filtrés par interval) avec code promo à gauche */}
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-[300px_1fr] gap-6 items-start">
            {/* Champ code promo à gauche */}
            <div className="mb-8 md:mb-0">
              <Card>
                <CardContent className="p-4">
                  <label htmlFor="promo-code" className="block text-sm font-medium text-[#0F172A] mb-2">
                    Code promo
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="promo-code"
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      placeholder="Entrez votre code promo"
                      className="flex-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    />
                    {promoCode && (
                      <button
                        onClick={() => setPromoCode("")}
                        className="px-3 py-2 text-sm text-[#64748B] hover:text-[#0F172A]"
                        title="Effacer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Plans disponibles à droite */}
            <div className={`grid gap-6 ${filteredPlans.length === 1 ? 'max-w-md' : 'md:grid-cols-2'}`}>
          {filteredPlans.map((plan) => {
            const planName = plan.id.split("_")[0]; // "starter" ou "professional"
            // Ne considérer comme plan actuel que si c'est un abonnement payant actif
            // Si c'est un essai gratuit (trialing + amount=0), ne pas marquer comme plan actuel
            const isCurrentPlan = isPaidActive && currentPlan === planName;
            
            return (
              <PricingCard
                key={plan.id}
                plan={plan}
                isPopular={plan.id.includes("professional")} // Marquer le plan Pro comme populaire
                currentPlan={isPaidActive ? currentPlan : null}
                onSelect={() => {
                  if (!isCurrentPlan) {
                    handleSelectPlan(plan);
                  }
                }}
                isLoading={selectedPlan === plan.id && createCheckout.isPending}
              />
            );
          })}
            </div>
        </div>

        {/* FAQ ou informations supplémentaires */}
        <div className="mt-12 max-w-3xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold text-[#0F172A] mb-4">
                Questions fréquentes
              </h3>
              <div className="space-y-4 text-sm text-[#64748B]">
                <div>
                  <p className="font-medium text-[#0F172A] mb-1">
                    Y a-t-il une période d'essai ?
                  </p>
                  <p>
                    Oui, l'offre inclut une période d'essai de 14 jours. 
                    Aucune carte bancaire n'est requise pour commencer.
                  </p>
                </div>
                <div>
                  <p className="font-medium text-[#0F172A] mb-1">
                    Que se passe-t-il si j'annule ?
                  </p>
                  <p>
                    Vous pouvez annuler à tout moment. Vous continuerez à avoir accès 
                    jusqu'à la fin de votre période de facturation en cours.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}

