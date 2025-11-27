"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageTitle } from "@/components/layout/PageTitle";
import { Quote, QuoteStatus } from "@/components/billing/types";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tag } from "@/components/ui/Tag";
import { getQuoteStatusColor, formatAmount } from "@/components/billing/utils";
import Link from "next/link";

export default function QuotesPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all">("all");

  // TODO: Récupérer depuis le backend
  const mockQuotes: Quote[] = [
    {
      id: 1,
      number: "DEV-2025-023",
      client_id: 1,
      client_name: "Boulangerie Soleil",
      status: "envoyé",
      lines: [
        {
          id: 1,
          description: "Prestation de service",
          quantity: 1,
          unitPrice: 1250,
          taxRate: 20,
        },
      ],
      subtotal: 1250,
      tax: 250,
      total: 1500,
      created_at: "2025-01-15T10:00:00",
      sent_at: "2025-01-15T14:30:00",
      timeline: [
        {
          id: 1,
          timestamp: "2025-01-15T10:00:00",
          action: "Devis créé",
          user: "Jean Dupont",
        },
        {
          id: 2,
          timestamp: "2025-01-15T14:30:00",
          action: "Devis envoyé",
          user: "Jean Dupont",
        },
      ],
      history: [
        {
          id: 1,
          timestamp: "2025-01-15T10:00:00",
          action: "Devis créé",
          user: "Jean Dupont",
        },
        {
          id: 2,
          timestamp: "2025-01-15T14:30:00",
          action: "Statut changé",
          description: "De 'brouillon' à 'envoyé'",
          user: "Jean Dupont",
        },
      ],
    },
    {
      id: 2,
      number: "DEV-2025-024",
      client_id: 2,
      client_name: "Mme Dupont",
      status: "envoyé",
      lines: [
        {
          id: 1,
          description: "Service beauté",
          quantity: 1,
          unitPrice: 450,
          taxRate: 20,
        },
      ],
      subtotal: 450,
      tax: 90,
      total: 540,
      created_at: "2025-01-16T09:00:00",
      sent_at: "2025-01-16T10:00:00",
      timeline: [
        {
          id: 1,
          timestamp: "2025-01-16T09:00:00",
          action: "Devis créé",
          user: "Marie Martin",
        },
        {
          id: 2,
          timestamp: "2025-01-16T10:00:00",
          action: "Devis envoyé",
          user: "Marie Martin",
        },
      ],
      history: [
        {
          id: 1,
          timestamp: "2025-01-16T09:00:00",
          action: "Devis créé",
          user: "Marie Martin",
        },
        {
          id: 2,
          timestamp: "2025-01-16T10:00:00",
          action: "Statut changé",
          description: "De 'brouillon' à 'envoyé'",
          user: "Marie Martin",
        },
      ],
    },
    {
      id: 3,
      number: "DEV-2025-020",
      client_id: 3,
      client_name: "M. Martin",
      status: "accepté",
      lines: [
        {
          id: 1,
          description: "Rénovation complète",
          quantity: 1,
          unitPrice: 3200,
          taxRate: 20,
        },
      ],
      subtotal: 3200,
      tax: 640,
      total: 3840,
      created_at: "2025-01-10T08:00:00",
      sent_at: "2025-01-10T09:00:00",
      accepted_at: "2025-01-12T15:00:00",
      timeline: [
        {
          id: 1,
          timestamp: "2025-01-10T08:00:00",
          action: "Devis créé",
          user: "Jean Dupont",
        },
        {
          id: 2,
          timestamp: "2025-01-10T09:00:00",
          action: "Devis envoyé",
          user: "Jean Dupont",
        },
        {
          id: 3,
          timestamp: "2025-01-12T15:00:00",
          action: "Devis accepté",
          user: "M. Martin",
        },
      ],
      history: [
        {
          id: 1,
          timestamp: "2025-01-10T08:00:00",
          action: "Devis créé",
          user: "Jean Dupont",
        },
        {
          id: 2,
          timestamp: "2025-01-10T09:00:00",
          action: "Statut changé",
          description: "De 'brouillon' à 'envoyé'",
          user: "Jean Dupont",
        },
        {
          id: 3,
          timestamp: "2025-01-12T15:00:00",
          action: "Statut changé",
          description: "De 'envoyé' à 'accepté'",
          user: "M. Martin",
        },
      ],
    },
  ];

  const filteredQuotes = useMemo(() => {
    if (statusFilter === "all") return mockQuotes;
    return mockQuotes.filter((q) => q.status === statusFilter);
  }, [statusFilter, mockQuotes]);

  const statusLabels: Record<QuoteStatus | "all", string> = {
    all: "Tous",
    brouillon: "Brouillon",
    envoyé: "Envoyé",
    accepté: "Accepté",
    refusé: "Refusé",
  };

  return (
    <>
      <PageTitle title="Devis" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A]">Devis</h1>
            <p className="mt-2 text-slate-600">
              Gérez tous vos devis et suivez leur statut
            </p>
          </div>
          <button
            onClick={() => router.push("/app/billing/quotes/new")}
            className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
          >
            + Créer un devis
          </button>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(statusLabels) as Array<QuoteStatus | "all">).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-[#F97316] text-white"
                    : "bg-white border border-[#E5E7EB] text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#0F172A]"
                }`}
              >
                {statusLabels[status]} (
                {status === "all"
                  ? mockQuotes.length
                  : mockQuotes.filter((q) => q.status === status).length}
                )
              </button>
            )
          )}
        </div>

        {/* Tableau */}
        {filteredQuotes.length === 0 ? (
          <Card>
            <EmptyState
              title="Aucun devis"
              description={
                statusFilter === "all"
                  ? "Créez votre premier devis pour commencer."
                  : `Aucun devis avec le statut "${statusLabels[statusFilter]}".`
              }
              action={
                statusFilter === "all" && (
                  <button
                    onClick={() => router.push("/app/billing/quotes/new")}
                    className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
                  >
                    Créer un devis
                  </button>
                )
              }
              icon="📄"
            />
          </Card>
        ) : (
          <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-[#F9FAFB]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                      Numéro
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                      Montant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filteredQuotes.map((quote) => (
                    <tr
                      key={quote.id}
                      className="hover:bg-[#F9FAFB] cursor-pointer"
                      onClick={() =>
                        router.push(`/app/billing/quotes/${quote.id}`)
                      }
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0F172A]">
                        {quote.number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#0F172A]">
                        <Link
                          href={`/app/clients?client=${encodeURIComponent(quote.client_name)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-[#F97316]"
                        >
                          {quote.client_name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0F172A]">
                        {formatAmount(quote.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748B]">
                        {new Date(quote.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getQuoteStatusColor(
                            quote.status
                          )}`}
                        >
                          {statusLabels[quote.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() =>
                              router.push(`/app/billing/quotes/${quote.id}`)
                            }
                            className="text-[#64748B] hover:text-[#0F172A] font-medium"
                          >
                            Voir
                          </button>
                          <span className="text-[#E5E7EB]">|</span>
                          <button
                            onClick={() => {
                              // TODO: Générer PDF
                              console.log("Download PDF:", quote.number);
                            }}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            PDF
                          </button>
                          {quote.status === "envoyé" && (
                            <>
                              <span className="text-[#E5E7EB]">|</span>
                              <button
                                onClick={() => {
                                  // TODO: Ouvrir relance IA
                                  router.push(
                                    `/app/relances?quote=${quote.id}`
                                  );
                                }}
                                className="text-purple-600 hover:text-purple-700 font-medium"
                              >
                                ✨ Relancer IA
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

