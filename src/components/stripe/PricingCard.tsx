"use client";

import { motion } from "framer-motion";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { SubscriptionPlan } from "@/services/stripeService";
import { Check } from "lucide-react";

interface PricingCardProps {
  plan: SubscriptionPlan;
  isPopular?: boolean;
  currentPlan?: string | null;
  onSelect: (planId: string) => void;
  isLoading?: boolean;
}

export function PricingCard({
  plan,
  isPopular = false,
  currentPlan,
  onSelect,
  isLoading = false,
}: PricingCardProps) {
  // Comparer le plan : currentPlan est "starter" ou "professional", plan.id est "starter_monthly" ou "professional_yearly"
  const planName = plan.id.split("_")[0]; // Extraire "starter" ou "professional" de "starter_monthly"
  const isCurrentPlan = currentPlan === planName;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative"
    >
      <Card
        className={`h-full ${
          isPopular
            ? "border-2 border-[#F97316] shadow-lg scale-105"
            : "border border-[#E5E7EB]"
        }`}
      >
        {isPopular && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
            <span className="bg-[#F97316] text-white px-4 py-1 rounded-full text-xs font-semibold">
              Le plus populaire
            </span>
          </div>
        )}

        <CardHeader className="text-center pb-4">
          <h3 className="text-2xl font-bold text-[#0F172A]">{plan.name}</h3>
          {/* Badge essai gratuit */}
          {plan.trial_days && (
            <div className="mt-2 mb-3">
              <span className="inline-block bg-[#F97316]/10 text-[#F97316] px-3 py-1 rounded-full text-xs font-semibold">
                {plan.trial_days} jours gratuits
              </span>
            </div>
          )}
          <div className="mt-4">
            <span className="text-4xl font-bold text-[#0F172A]">
              {plan.price.toFixed(2).replace('.', ',')}€
            </span>
            <span className="text-[#64748B]">/{plan.interval === "month" ? "mois" : "an"}</span>
            {plan.interval === "year" && plan.yearly_price && (
              <div className="mt-2">
                <p className="text-sm text-[#64748B]">
                  Soit <span className="font-semibold text-[#0F172A]">{plan.yearly_price.toFixed(2).replace('.', ',')}€</span> par an
                </p>
                {/* Calcul des économies basé sur le prix mensuel équivalent */}
                {plan.interval === "year" && plan.monthly_equivalent && plan.price && (
                  <p className="text-xs text-[#F97316] mt-1 font-medium">
                    Économisez {((plan.monthly_equivalent - plan.price) * 12).toFixed(2).replace('.', ',')}€/an
                  </p>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Liste des fonctionnalités */}
          <ul className="space-y-3">
            {plan.features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2">
                <Check className="w-5 h-5 text-[#16A34A] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[#64748B]">{feature}</span>
              </li>
            ))}
          </ul>

          {/* Limites pour le plan Essentiel */}
          {plan.limits && plan.limits.quotes_per_month !== -1 && (
            <div className="pt-4 border-t border-[#E5E7EB]">
              <p className="text-xs font-semibold text-[#0F172A] mb-2">Limites incluses :</p>
              <ul className="space-y-1.5 text-xs text-[#64748B]">
                <li className="flex items-center justify-between">
                  <span>Devis par mois</span>
                  <span className="font-medium text-[#0F172A]">{plan.limits.quotes_per_month}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Factures par mois</span>
                  <span className="font-medium text-[#0F172A]">{plan.limits.invoices_per_month}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Clients</span>
                  <span className="font-medium text-[#0F172A]">{plan.limits.clients}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Relances par mois</span>
                  <span className="font-medium text-[#0F172A]">{plan.limits.followups_per_month}</span>
                </li>
              </ul>
            </div>
          )}

          {/* Bouton d'action */}
          <div className="pt-4">
            {isCurrentPlan ? (
              <AnimatedButton
                variant="secondary"
                className="w-full"
                disabled
              >
                Plan actuel
              </AnimatedButton>
            ) : (
              <AnimatedButton
                variant={isPopular ? "primary" : "secondary"}
                className="w-full"
                onClick={() => onSelect(plan.id)}
                loading={isLoading}
              >
                {currentPlan ? "Changer de plan" : "Commencer"}
              </AnimatedButton>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

