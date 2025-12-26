import { apiGet, apiPost } from "@/lib/api";

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string; // "month" ou "year"
  features: string[];
  stripe_price_id?: string;
  trial_days?: number; // Nombre de jours d'essai gratuit
  yearly_price?: number; // Prix total annuel (pour les plans annuels)
  monthly_equivalent?: number; // Prix mensuel équivalent (pour les plans annuels)
  limits?: {
    quotes_per_month: number; // -1 = illimité
    invoices_per_month: number; // -1 = illimité
    clients: number; // -1 = illimité
    followups_per_month: number; // -1 = illimité
  };
}

export interface Subscription {
  id: number;
  plan: "starter" | "professional" | "enterprise";
  status: "active" | "canceled" | "past_due" | "unpaid" | "incomplete" | "incomplete_expired" | "trialing" | "paused";
  amount: number;
  currency: string;
  current_period_start?: string;
  current_period_end?: string;
  trial_start?: string;
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
 * Récupère l'abonnement d'une entreprise spécifique (admin uniquement)
 */
export async function getCompanySubscription(
  companyId: number,
  token: string | null
): Promise<SubscriptionResponse> {
  return apiGet<SubscriptionResponse>(`/stripe/subscription/${companyId}`, token);
}

export interface SubscriptionHistoryItem {
  id: string;
  plan: string;
  period: string;
  period_start?: string | null;
  period_end?: string | null;
  amount: number;
  currency: string;
  status: string;
  invoice_number: string;
  invoice_date?: string | null;
  invoice_pdf_url?: string | null;
}

export interface SubscriptionHistoryResponse {
  history: SubscriptionHistoryItem[];
}

/**
 * Récupère l'historique des abonnements d'une entreprise (admin uniquement)
 */
export async function getCompanySubscriptionHistory(
  companyId: number,
  token: string | null
): Promise<SubscriptionHistoryResponse> {
  return apiGet<SubscriptionHistoryResponse>(`/stripe/subscription/${companyId}/history`, token);
}

/**
 * Crée une session de checkout Stripe
 */
export async function createCheckoutSession(
  plan: "starter" | "professional" | "enterprise" = "starter",
  token: string | null,
  interval: "month" | "year" = "month",
  successUrl?: string,
  cancelUrl?: string,
  promoCode?: string
): Promise<CheckoutSessionResponse> {
  return apiPost<CheckoutSessionResponse>(
    "/stripe/create-checkout-session",
    {
      plan,
      interval,
      success_url: successUrl,
      cancel_url: cancelUrl,
      promo_code: promoCode || undefined,
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

