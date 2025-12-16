import { apiGet, apiPost } from "@/lib/api";

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  features: string[];
  stripe_price_id?: string;
}

export interface Subscription {
  id: number;
  plan: "starter" | "professional" | "enterprise";
  status: "active" | "canceled" | "past_due" | "unpaid" | "incomplete" | "incomplete_expired" | "trialing" | "paused";
  amount: number;
  currency: string;
  current_period_start?: string;
  current_period_end?: string;
  trial_end?: string;
}

export interface SubscriptionResponse {
  has_subscription: boolean;
  subscription: Subscription | null;
}

export interface CheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
}

export interface PortalSessionResponse {
  portal_url: string;
}

/**
 * Récupère les plans d'abonnement disponibles
 */
export async function getPlans(token: string | null): Promise<{ plans: SubscriptionPlan[] }> {
  return apiGet<{ plans: SubscriptionPlan[] }>("/stripe/plans", token);
}

/**
 * Récupère l'abonnement actuel de l'entreprise
 */
export async function getSubscription(token: string | null): Promise<SubscriptionResponse> {
  return apiGet<SubscriptionResponse>("/stripe/subscription", token);
}

/**
 * Crée une session de checkout Stripe
 */
export async function createCheckoutSession(
  plan: "starter" | "professional" | "enterprise" = "starter",
  token: string | null,
  successUrl?: string,
  cancelUrl?: string
): Promise<CheckoutSessionResponse> {
  return apiPost<CheckoutSessionResponse>(
    "/stripe/create-checkout-session",
    {
      plan,
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
    token
  );
}

/**
 * Crée une session pour le portail client Stripe
 */
export async function createPortalSession(
  returnUrl: string,
  token: string | null
): Promise<PortalSessionResponse> {
  return apiPost<PortalSessionResponse>(
    "/stripe/create-portal-session",
    {
      return_url: returnUrl,
    },
    token
  );
}

