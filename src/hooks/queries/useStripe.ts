import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  getPlans,
  getSubscription,
  createCheckoutSession,
  createPortalSession,
  SubscriptionPlan,
  SubscriptionResponse,
  CheckoutSessionResponse,
  PortalSessionResponse,
} from "@/services/stripeService";

/**
 * Hook pour récupérer les plans d'abonnement
 */
export function usePlans() {
  const { token } = useAuth();

  return useQuery<{ plans: SubscriptionPlan[] }>({
    queryKey: ["stripe", "plans"],
    queryFn: () => getPlans(token),
    enabled: !!token,
    staleTime: 1000 * 60 * 60, // 1 heure - les plans changent rarement
  });
}

/**
 * Hook pour récupérer l'abonnement actuel
 */
export function useSubscription() {
  const { token } = useAuth();

  return useQuery<SubscriptionResponse>({
    queryKey: ["stripe", "subscription"],
    queryFn: () => getSubscription(token),
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook pour créer une session de checkout
 */
export function useCreateCheckoutSession() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      plan = "starter",
      interval = "month",
      successUrl,
      cancelUrl,
    }: {
      plan?: "starter" | "professional" | "enterprise";
      interval?: "month" | "year";
      successUrl?: string;
      cancelUrl?: string;
    }) => createCheckoutSession(plan, token, interval, successUrl, cancelUrl),
    onSuccess: (data) => {
      // Rediriger vers Stripe Checkout
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    },
    onError: (error) => {
      console.error("Erreur lors de la création de la session de checkout:", error);
    },
  });
}

/**
 * Hook pour créer une session du portail client
 */
export function useCreatePortalSession() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (returnUrl: string) => createPortalSession(returnUrl, token),
    onSuccess: (data) => {
      // Rediriger vers le portail Stripe
      if (data.portal_url) {
        window.location.href = data.portal_url;
      }
    },
    onError: (error) => {
      console.error("Erreur lors de la création de la session du portail:", error);
    },
  });
}

