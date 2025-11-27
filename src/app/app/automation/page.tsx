"use client";

import { useState } from "react";
import { PageTitle } from "@/components/layout/PageTitle";
import { AutomationRuleCard } from "@/components/automation/AutomationRuleCard";

export default function AutomationPage() {
  // TODO: Récupérer les règles depuis le backend
  const [quoteReminderEnabled, setQuoteReminderEnabled] = useState(true);
  const [quoteReminderDays, setQuoteReminderDays] = useState(7);
  const [quoteReminderTemplate, setQuoteReminderTemplate] = useState(
    "Bonjour {client},\n\nNous vous rappelons que le devis {numero} que nous vous avons envoyé le {date} est toujours en attente de votre retour.\n\nN'hésitez pas à nous contacter si vous avez des questions.\n\nCordialement,\n{entreprise}"
  );

  const [invoiceReminderEnabled, setInvoiceReminderEnabled] = useState(true);
  const [invoiceReminderDays, setInvoiceReminderDays] = useState(5);
  const [invoiceReminderTemplate, setInvoiceReminderTemplate] = useState(
    "Bonjour {client},\n\nNous vous rappelons que la facture {numero} d'un montant de {montant} € est en attente de paiement.\n\nDate d'échéance : {echeance}\n\nMerci de procéder au règlement dans les plus brefs délais.\n\nCordialement,\n{entreprise}"
  );

  return (
    <>
      <PageTitle title="Automatisations" />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">
            Relances & automatisations
          </h1>
          <p className="mt-2 text-slate-600">
            Configurez les relances automatiques pour vos devis et factures.
          </p>
        </div>

        <div className="space-y-6">
          <AutomationRuleCard
            title="Relance devis non répondu"
            description="Envoyer automatiquement un email de relance pour les devis non signés"
            enabled={quoteReminderEnabled}
            delayDays={quoteReminderDays}
            emailTemplate={quoteReminderTemplate}
            onToggle={(enabled) => {
              setQuoteReminderEnabled(enabled);
              // TODO: Sauvegarder dans le backend
            }}
            onDelayChange={(days) => {
              setQuoteReminderDays(days);
              // TODO: Sauvegarder dans le backend
            }}
            onTemplateChange={(template) => {
              setQuoteReminderTemplate(template);
              // TODO: Sauvegarder dans le backend
            }}
          />

          <AutomationRuleCard
            title="Relance facture impayée"
            description="Envoyer automatiquement un email de relance pour les factures en retard"
            enabled={invoiceReminderEnabled}
            delayDays={invoiceReminderDays}
            emailTemplate={invoiceReminderTemplate}
            onToggle={(enabled) => {
              setInvoiceReminderEnabled(enabled);
              // TODO: Sauvegarder dans le backend
            }}
            onDelayChange={(days) => {
              setInvoiceReminderDays(days);
              // TODO: Sauvegarder dans le backend
            }}
            onTemplateChange={(template) => {
              setInvoiceReminderTemplate(template);
              // TODO: Sauvegarder dans le backend
            }}
          />
        </div>
      </div>
    </>
  );
}

