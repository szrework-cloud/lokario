"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageTitle } from "@/components/layout/PageTitle";
import { Invoice, InvoiceStatus } from "@/components/billing/types";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getInvoiceStatusColor, formatAmount, isInvoiceOverdue } from "@/components/billing/utils";
import Link from "next/link";

export default function InvoicesPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");

  // TODO: Récupérer depuis le backend
  const mockInvoices: Invoice[] = [
    {
      id: 1,
      number: "FAC-2025-014",
      client_id: 1,
      client_name: "Boulangerie Soleil",
      status: "en_retard",
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
      amount_paid: 0,
      amount_remaining: 1500,
      created_at: "2025-01-10T10:00:00",
      sent_at: "2025-01-10T14:30:00",
      due_date: "2025-01-20",
      timeline: [
        {
          id: 1,
          timestamp: "2025-01-10T10:00:00",
          action: "Facture créée",
          user: "Jean Dupont",
        },
        {
          id: 2,
          timestamp: "2025-01-10T14:30:00",
          action: "Facture envoyée",
          user: "Jean Dupont",
        },
      ],
      history: [
        {
          id: 1,
          timestamp: "2025-01-10T10:00:00",
          action: "Facture créée",
          user: "Jean Dupont",
        },
        {
          id: 2,
          timestamp: "2025-01-10T14:30:00",
          action: "Statut changé",
          description: "De 'brouillon' à 'envoyée'",
          user: "Jean Dupont",
        },
      ],
    },
    {
      id: 2,
      number: "FAC-2025-015",
      client_id: 2,
      client_name: "Mme Dupont",
      status: "payée",
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
      amount_paid: 540,
      amount_remaining: 0,
      created_at: "2025-01-12T09:00:00",
      sent_at: "2025-01-12T10:00:00",
      due_date: "2025-01-22",
      paid_at: "2025-01-15T14:00:00",
      timeline: [
        {
          id: 1,
          timestamp: "2025-01-12T09:00:00",
          action: "Facture créée",
          user: "Marie Martin",
        },
        {
          id: 2,
          timestamp: "2025-01-12T10:00:00",
          action: "Facture envoyée",
          user: "Marie Martin",
        },
        {
          id: 3,
          timestamp: "2025-01-15T14:00:00",
          action: "Paiement reçu",
          description: "540,00 €",
          user: "Mme Dupont",
        },
      ],
      history: [
        {
          id: 1,
          timestamp: "2025-01-12T09:00:00",
          action: "Facture créée",
          user: "Marie Martin",
        },
        {
          id: 2,
          timestamp: "2025-01-12T10:00:00",
          action: "Statut changé",
          description: "De 'brouillon' à 'envoyée'",
          user: "Marie Martin",
        },
        {
          id: 3,
          timestamp: "2025-01-15T14:00:00",
          action: "Paiement ajouté",
          description: "540,00 € - Paiement total",
          user: "Marie Martin",
        },
        {
          id: 4,
          timestamp: "2025-01-15T14:00:00",
          action: "Statut changé",
          description: "De 'envoyée' à 'payée'",
          user: "Système",
        },
      ],
      payments: [
        {
          id: 1,
          amount: 540,
          date: "2025-01-15",
          method: "virement",
        },
      ],
    },
    {
      id: 3,
      number: "FAC-2025-016",
      client_id: 3,
      client_name: "M. Martin",
      status: "payée",
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
      amount_paid: 3840,
      amount_remaining: 0,
      created_at: "2025-01-13T08:00:00",
      sent_at: "2025-01-13T09:00:00",
      due_date: "2025-01-23",
      paid_at: "2025-01-18T10:00:00",
      timeline: [
        {
          id: 1,
          timestamp: "2025-01-13T08:00:00",
          action: "Facture créée",
          user: "Jean Dupont",
        },
        {
          id: 2,
          timestamp: "2025-01-13T09:00:00",
          action: "Facture envoyée",
          user: "Jean Dupont",
        },
        {
          id: 3,
          timestamp: "2025-01-18T10:00:00",
          action: "Paiement reçu",
          description: "3840,00 €",
          user: "M. Martin",
        },
      ],
      history: [
        {
          id: 1,
          timestamp: "2025-01-13T08:00:00",
          action: "Facture créée",
          user: "Jean Dupont",
        },
        {
          id: 2,
          timestamp: "2025-01-13T09:00:00",
          action: "Statut changé",
          description: "De 'brouillon' à 'envoyée'",
          user: "Jean Dupont",
        },
        {
          id: 3,
          timestamp: "2025-01-18T10:00:00",
          action: "Paiement ajouté",
          description: "3840,00 € - Paiement total",
          user: "Jean Dupont",
        },
        {
          id: 4,
          timestamp: "2025-01-18T10:00:00",
          action: "Statut changé",
          description: "De 'envoyée' à 'payée'",
          user: "Système",
        },
      ],
      payments: [
        {
          id: 1,
          amount: 3840,
          date: "2025-01-18",
          method: "virement",
        },
      ],
    },
  ];

  const filteredInvoices = useMemo(() => {
    let filtered = mockInvoices;
    if (statusFilter !== "all") {
      filtered = filtered.filter((inv) => {
        if (statusFilter === "en_retard") {
          return isInvoiceOverdue(inv) && inv.status !== "payée";
        }
        return inv.status === statusFilter;
      });
    }
    return filtered;
  }, [statusFilter, mockInvoices]);

  const statusLabels: Record<InvoiceStatus | "all", string> = {
    all: "Tous",
    brouillon: "Brouillon",
    envoyée: "Envoyée",
    payée: "Payée",
    en_retard: "En retard",
  };

  return (
    <>
      <PageTitle title="Factures" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A]">Factures</h1>
            <p className="mt-2 text-slate-600">
              Gérez toutes vos factures et suivez les paiements
            </p>
          </div>
          <button
            onClick={() => router.push("/app/billing/invoices/new")}
            className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
          >
            + Créer une facture
          </button>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(statusLabels) as Array<InvoiceStatus | "all">).map(
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
                  ? mockInvoices.length
                  : status === "en_retard"
                  ? mockInvoices.filter((inv) => isInvoiceOverdue(inv) && inv.status !== "payée").length
                  : mockInvoices.filter((inv) => inv.status === status).length}
                )
              </button>
            )
          )}
        </div>

        {/* Tableau */}
        {filteredInvoices.length === 0 ? (
          <Card>
            <EmptyState
              title="Aucune facture"
              description={
                statusFilter === "all"
                  ? "Créez votre première facture pour commencer."
                  : `Aucune facture avec le statut "${statusLabels[statusFilter]}".`
              }
              action={
                statusFilter === "all" && (
                  <button
                    onClick={() => router.push("/app/billing/invoices/new")}
                    className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
                  >
                    Créer une facture
                  </button>
                )
              }
              icon="💰"
            />
          </Card>
        ) : (
          <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
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
                      Montant payé
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
                  {filteredInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="hover:bg-[#F9FAFB] cursor-pointer"
                      onClick={() =>
                        router.push(`/app/billing/invoices/${invoice.id}`)
                      }
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0F172A]">
                        {invoice.number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#0F172A]">
                        <Link
                          href={`/app/clients?client=${encodeURIComponent(invoice.client_name)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-[#F97316]"
                        >
                          {invoice.client_name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0F172A]">
                        {formatAmount(invoice.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748B]">
                        {formatAmount(invoice.amount_paid)} / {formatAmount(invoice.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748B]">
                        {new Date(invoice.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getInvoiceStatusColor(
                            invoice.status
                          )}`}
                        >
                          {statusLabels[invoice.status]}
                        </span>
                        {isInvoiceOverdue(invoice) && (
                          <span className="ml-2 text-xs text-red-600">
                            ({Math.floor((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))} jours)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() =>
                              router.push(`/app/billing/invoices/${invoice.id}`)
                            }
                            className="text-[#64748B] hover:text-[#0F172A] font-medium"
                          >
                            Voir
                          </button>
                          <span className="text-[#E5E7EB]">|</span>
                          <button
                            onClick={() => {
                              // TODO: Générer PDF
                              console.log("Download PDF:", invoice.number);
                            }}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            PDF
                          </button>
                          {invoice.status !== "payée" && (
                            <>
                              <span className="text-[#E5E7EB]">|</span>
                              <button
                                onClick={() => {
                                  // TODO: Ouvrir relance IA
                                  router.push(
                                    `/app/relances?invoice=${invoice.id}`
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

