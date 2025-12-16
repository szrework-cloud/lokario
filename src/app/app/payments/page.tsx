"use client";

import { useState } from "react";
import { Tag } from "@/components/ui/Tag";
import { PageTitle } from "@/components/layout/PageTitle";
import { KpiCard } from "@/components/reporting/KpiCard";
import { AiModal } from "@/components/ai/AiModal";
import { useToast } from "@/hooks/useToast";
import Link from "next/link";

interface PaymentItem {
  id: number;
  invoiceNumber: string;
  client: string;
  amount: number;
  dueDate: string;
  status: "Payé" | "En retard" | "À venir";
  daysLate?: number;
}

export default function PaymentsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentItem | null>(null);
  const [messageText, setMessageText] = useState("");
  const { showToast } = useToast();

  // TODO: Récupérer les paiements depuis le backend
  const mockPayments: PaymentItem[] = [
    {
      id: 1,
      invoiceNumber: "FAC-2025-014",
      client: "Boulangerie Soleil",
      amount: 1250,
      dueDate: "2025-01-10",
      status: "En retard",
      daysLate: 10,
    },
    {
      id: 2,
      invoiceNumber: "FAC-2025-015",
      client: "Mme Dupont",
      amount: 450,
      dueDate: "2025-01-20",
      status: "À venir",
    },
    {
      id: 3,
      invoiceNumber: "FAC-2025-016",
      client: "M. Martin",
      amount: 3200,
      dueDate: "2025-01-15",
      status: "Payé",
    },
    {
      id: 4,
      invoiceNumber: "FAC-2025-017",
      client: "Fournisseur Boissons SA",
      amount: 450,
      dueDate: "2025-01-18",
      status: "À venir",
    },
  ];

  // Calculs pour les KPIs (fake data)
  const paidThisMonth = 3200;
  const overdueAmount = 1250;
  const overdueCount = 1;

  return (
    <>
      <PageTitle title="Paiements & impayés" />
      <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-[#0F172A]">
                Paiements & impayés
              </h1>
              <p className="mt-2 text-[#64748B]">
                Suivez vos paiements et factures en attente
              </p>
            </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <KpiCard
            title="Montant payé ce mois-ci"
            value={`${paidThisMonth.toLocaleString("fr-FR")} €`}
            subtitle="Factures réglées"
            trend="up"
          />
          <KpiCard
            title="Montant en retard"
            value={`${overdueAmount.toLocaleString("fr-FR")} €`}
            subtitle={`${overdueCount} facture${overdueCount > 1 ? "s" : ""}`}
            trend="down"
          />
          <KpiCard
            title="Factures en retard"
            value={overdueCount}
            subtitle="À relancer"
            trend="down"
          />
        </div>

        {/* Filters */}
        {/* QUESTION: Les filtres sont statiques pour l'instant. Il faudra les rendre fonctionnels avec le backend pour filtrer réellement les paiements. */}
        <div className="flex gap-2">
          <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Tous
          </button>
          <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            En attente
          </button>
          <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            En retard
          </button>
          <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Payés
          </button>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Facture
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Date d'échéance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {mockPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                    <Link
                      href={`/app/billing?invoice=${payment.invoiceNumber}`}
                      className="hover:text-slate-600"
                    >
                      {payment.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    <Link
                      href={`/app/clients?client=${encodeURIComponent(payment.client)}`}
                      className="hover:text-slate-600"
                    >
                      {payment.client}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                    {payment.amount.toLocaleString("fr-FR")} €
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {new Date(payment.dueDate).toLocaleDateString("fr-FR")}
                    {payment.daysLate && (
                      <span className="ml-2 text-red-600">
                        ({payment.daysLate} jours de retard)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Tag
                      variant={
                        payment.status === "Payé"
                          ? "success"
                          : payment.status === "En retard"
                          ? "error"
                          : "warning"
                      }
                    >
                      {payment.status}
                    </Tag>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/app/billing?invoice=${payment.invoiceNumber}`}
                        className="text-sm font-medium text-slate-600 hover:text-slate-900"
                      >
                        Voir facture
                      </Link>
                      {payment.status !== "Payé" && (
                        <>
                          <span className="text-slate-300">|</span>
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setMessageText("");
                              setIsModalOpen(true);
                            }}
                            className="text-sm font-medium text-purple-600 hover:text-purple-700"
                          >
                            ✨ Relancer avec l'IA
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

        <AiModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedPayment(null);
            setMessageText("");
          }}
          title="Relancer avec l'IA"
          context={
            selectedPayment && (
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Facture:</span> {selectedPayment.invoiceNumber}
                </p>
                <p>
                  <span className="font-medium">Client:</span> {selectedPayment.client}
                </p>
                <p>
                  <span className="font-medium">Montant:</span> {selectedPayment.amount.toLocaleString("fr-FR")} €
                </p>
                <p>
                  <span className="font-medium">Statut:</span> {selectedPayment.status}
                </p>
              </div>
            )
          }
          initialValue={messageText}
          onGenerate={(text) => setMessageText(text)}
          placeholder="Votre message de relance..."
          label="Message de relance"
        />

      </div>
    </>
  );
}

