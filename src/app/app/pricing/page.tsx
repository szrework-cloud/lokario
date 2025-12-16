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

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRequired = searchParams?.get("required") === "true";
  const { data: plansData, isLoading: isLoadingPlans } = usePlans();
  const { data: subscriptionData, isLoading: isLoadingSubscription } = useSubscription();
  const createCheckout = useCreateCheckoutSession();

  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelectPlan = async (planId: string) => {
    setSelectedPlan(planId);
    
    const successUrl = `${window.location.origin}/app/settings?success=true`;
    const cancelUrl = `${window.location.origin}/app/pricing?canceled=true`;

    createCheckout.mutate({
      plan: "starter", // Un seul plan disponible
      successUrl,
      cancelUrl,
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
  const currentPlan = subscriptionData?.subscription?.plan || null;
  const hasSubscription = subscriptionData?.has_subscription || false;

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
                    Plan {subscriptionData.subscription.plan} - 
                    {subscriptionData.subscription.status === "active" && " Actif"}
                    {subscriptionData.subscription.status === "trialing" && " En période d'essai"}
                    {subscriptionData.subscription.status === "past_due" && " Paiement en retard"}
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

        {/* Plan unique */}
        <div className="max-w-md mx-auto">
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              isPopular={true}
              currentPlan={currentPlan}
              onSelect={handleSelectPlan}
              isLoading={selectedPlan === plan.id && createCheckout.isPending}
            />
          ))}
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

