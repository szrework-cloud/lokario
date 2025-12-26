"use client";

import { useSubscription } from "@/hooks/queries/useStripe";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

export function SubscriptionStatusBadge() {
  const { data: subscriptionData, isLoading } = useSubscription();
  const router = useRouter();

  const { daysRemaining, planName, status } = useMemo(() => {
    if (!subscriptionData?.subscription) {
      return { daysRemaining: null, planName: null, status: null };
    }

    const subscription = subscriptionData.subscription;
    const plan = subscription.plan;
    
    // Déterminer le nom du plan
    let displayPlanName = "";
    // Si c'est un essai gratuit (trialing avec amount = 0), afficher "Gratuit"
    if (subscription.status === "trialing" && subscription.amount === 0) {
      displayPlanName = "Gratuit";
    } else if (plan === "starter") {
      displayPlanName = "Essentiel";
    } else if (plan === "professional") {
      displayPlanName = "Pro";
    } else if (plan === "enterprise") {
      displayPlanName = "Enterprise";
    }

    // Calculer les jours restants si on est en période d'essai
    let daysRemaining: number | null = null;
    if (subscription.status === "trialing" && subscription.trial_end) {
      const trialEnd = new Date(subscription.trial_end);
      const now = new Date();
      
      // Normaliser les dates à minuit pour calculer les jours calendaires
      const trialEndMidnight = new Date(trialEnd.getFullYear(), trialEnd.getMonth(), trialEnd.getDate());
      const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      // Calculer la différence en jours calendaires
      const diffTime = trialEndMidnight.getTime() - nowMidnight.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      daysRemaining = Math.max(0, diffDays); // Ne pas afficher de nombre négatif
    }

    return {
      daysRemaining,
      planName: displayPlanName,
      status: subscription.status,
    };
  }, [subscriptionData]);

  if (isLoading) {
    return null;
  }

  // Si abonnement actif, afficher seulement le plan (sans jours restants ni statut d'essai)
  // Un abonnement "active" signifie qu'il a été payé, donc on ne montre plus les jours restants
  if (subscriptionData?.subscription && status === "active" && planName) {
    return (
      <div
        onClick={() => router.push("/app/pricing")}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#F0F9FF] border border-[#BFDBFE] cursor-pointer hover:bg-[#E0F2FE] transition-colors"
      >
        <span className="text-xs font-medium text-[#0F172A]">{planName}</span>
      </div>
    );
  }

  // Si l'essai est expiré
  if (status === "incomplete_expired") {
    return (
      <div
        onClick={() => router.push("/app/pricing")}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
      >
        <span className="text-xs font-medium text-red-700">Essai expiré</span>
        <span className="text-xs text-red-600">→ S'abonner</span>
      </div>
    );
  }

  // Si on est en période d'essai GRATUITE (trialing sans avoir payé), afficher les jours restants
  // Seulement si le montant est 0 (essai gratuit initial)
  const subscription = subscriptionData?.subscription;
  const isFreeTrial = subscription && subscription.amount === 0 && status === "trialing";
  
  if (isFreeTrial && daysRemaining !== null && planName) {
    return (
      <div
        onClick={() => router.push("/app/pricing")}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FEF3C7] border border-[#FCD34D] cursor-pointer hover:bg-[#FDE68A] transition-colors"
      >
        <span className="text-xs font-semibold text-[#92400E]">
          {daysRemaining === 0 ? "Dernier jour" : `${daysRemaining}j restants`}
        </span>
        <span className="text-xs text-[#78350F]">• {planName}</span>
      </div>
    );
  }

  return null;
}

