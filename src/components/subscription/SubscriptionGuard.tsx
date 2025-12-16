"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSubscription } from "@/hooks/queries/useStripe";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Loader } from "@/components/ui/Loader";
import { PageTransition } from "@/components/ui/PageTransition";

/**
 * Composant qui vérifie que l'utilisateur a un abonnement actif
 * Bloque l'accès si l'abonnement n'est pas valide
 */
export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { data: subscriptionData, isLoading } = useSubscription();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  // Pages qui sont toujours accessibles même sans abonnement
  const allowedPaths = [
    "/app/settings",
    "/app/pricing",
  ];

  // Les super_admin ont toujours accès
  if (user?.role === "super_admin") {
    return <>{children}</>;
  }

  useEffect(() => {
    if (isLoading) return;

    setIsChecking(false);

    // Vérifier si on est sur une page autorisée
    const isAllowedPath = allowedPaths.some(path => pathname?.startsWith(path));
    if (isAllowedPath) {
      return; // Autoriser l'accès
    }

    // Vérifier l'abonnement
    const hasSubscription = subscriptionData?.has_subscription || false;
    const subscription = subscriptionData?.subscription;
    
    if (!hasSubscription || !subscription) {
      // Pas d'abonnement - rediriger vers pricing
      router.push("/app/pricing?required=true");
      return;
    }

    // Vérifier le statut de l'abonnement
    const validStatuses = ["active", "trialing"];
    if (!validStatuses.includes(subscription.status)) {
      // Abonnement non valide - rediriger vers pricing
      router.push("/app/pricing?required=true");
      return;
    }
  }, [subscriptionData, isLoading, pathname, router]);

  // Afficher un loader pendant la vérification
  if (isChecking || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader text="Vérification de l'abonnement..." />
      </div>
    );
  }

  // Vérifier si on est sur une page autorisée
  const isAllowedPath = allowedPaths.some(path => pathname?.startsWith(path));
  if (isAllowedPath) {
    return <>{children}</>;
  }

  // Vérifier l'abonnement
  const hasSubscription = subscriptionData?.has_subscription || false;
  const subscription = subscriptionData?.subscription;
  
  if (!hasSubscription || !subscription) {
    return <SubscriptionRequiredScreen />;
  }

  // Vérifier le statut de l'abonnement
  const validStatuses = ["active", "trialing"];
  if (!validStatuses.includes(subscription.status)) {
    return <SubscriptionRequiredScreen status={subscription.status} />;
  }

  // Abonnement valide - autoriser l'accès
  return <>{children}</>;
}

/**
 * Écran affiché quand un abonnement est requis
 */
function SubscriptionRequiredScreen({ status }: { status?: string }) {
  const router = useRouter();

  const getStatusMessage = () => {
    if (status === "past_due") {
      return "Votre paiement est en retard. Veuillez mettre à jour votre méthode de paiement pour continuer à utiliser l'application.";
    }
    if (status === "canceled") {
      return "Votre abonnement a été annulé. Réabonnez-vous pour continuer à utiliser l'application.";
    }
    if (status === "incomplete" || status === "incomplete_expired") {
      return "Votre abonnement n'est pas complet. Veuillez finaliser votre paiement pour continuer.";
    }
    return "Un abonnement actif est requis pour accéder à l'application.";
  };

  return (
    <PageTransition>
      <div className="flex items-center justify-center min-h-screen bg-[#F9FAFB] p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <h1 className="text-2xl font-bold text-[#0F172A] mb-2">
              Abonnement requis
            </h1>
            <p className="text-sm text-[#64748B]">
              {getStatusMessage()}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3">
              <AnimatedButton
                variant="primary"
                onClick={() => router.push("/app/pricing")}
                className="w-full"
              >
                Voir les offres
              </AnimatedButton>
              {(status === "past_due" || status === "incomplete") && (
                <AnimatedButton
                  variant="secondary"
                  onClick={() => router.push("/app/settings?tab=subscription")}
                  className="w-full"
                >
                  Gérer mon abonnement
                </AnimatedButton>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}

