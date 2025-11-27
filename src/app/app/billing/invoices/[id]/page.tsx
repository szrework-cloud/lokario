"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageTitle } from "@/components/layout/PageTitle";
import { Invoice, Payment } from "@/components/billing/types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { getInvoiceStatusColor, formatAmount, calculateLineTotal, isInvoiceOverdue, getDaysOverdue } from "@/components/billing/utils";
import Link from "next/link";

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = Number(params.id);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // TODO: Récupérer depuis le backend
  const mockInvoice: Invoice | null = invoiceId === 1 ? {
    id: 1,
    number: "FAC-2025-014",
    client_id: 1,
    client_name: "Boulangerie Soleil",
    project_id: 2,
    project_name: "Installation équipement",
    status: "en_retard",
    lines: [
      {
        id: 1,
        description: "Prestation de service - Installation",
        quantity: 1,
        unitPrice: 1250,
        taxRate: 20,
      },
      {
        id: 2,
        description: "Matériel supplémentaire",
        quantity: 2,
        unitPrice: 150,
        taxRate: 20,
      },
    ],
    subtotal: 1550,
    tax: 310,
    total: 1860,
    amount_paid: 0,
    amount_remaining: 1860,
    notes: "Facture suite à l'acceptation du devis DEV-2025-023.",
    conditions: "Paiement à 30 jours. Sans paiement, pénalités de retard.",
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
        description: "Envoyée par email à contact@boulangerie-soleil.fr",
        user: "Jean Dupont",
      },
    ],
    history: [
      {
        id: 1,
        timestamp: "2025-01-10T10:00:00",
        action: "Facture créée",
        description: "Convertie depuis DEV-2025-023",
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
    linked_followups: [2],
  } : null;

  if (!mockInvoice) {
    return (
      <>
        <PageTitle title="Facture introuvable" />
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-slate-600">La facture demandée n'existe pas.</p>
              <button
                onClick={() => router.push("/app/billing/invoices")}
                className="mt-4 text-[#F97316] hover:text-[#EA580C]"
              >
                ← Retour à la liste
              </button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const statusLabels: Record<Invoice["status"], string> = {
    brouillon: "Brouillon",
    envoyée: "Envoyée",
    payée: "Payée",
    en_retard: "En retard",
  };

  const handleAddPayment = (payment: Payment) => {
    // TODO: Ajouter le paiement via API
    console.log("Add payment:", payment);
    setIsPaymentModalOpen(false);
  };

  return (
    <>
      <PageTitle title={`Facture ${mockInvoice.number}`} />
      <div className="space-y-6">
        {/* Bouton retour */}
        <button
          onClick={() => router.push("/app/billing/invoices")}
          className="text-sm text-[#64748B] hover:text-[#0F172A]"
        >
          ← Retour à la liste
        </button>

        {/* Bloc 1 : En-tête */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#0F172A]">
                  {mockInvoice.number}
                </h1>
                <p className="mt-1 text-sm text-[#64748B]">
                  Client:{" "}
                  <Link
                    href={`/app/clients?client=${encodeURIComponent(mockInvoice.client_name)}`}
                    className="text-[#F97316] hover:text-[#EA580C]"
                  >
                    {mockInvoice.client_name}
                  </Link>
                  {mockInvoice.project_name && (
                    <>
                      {" • "}
                      <Link
                        href={`/app/projects?project=${mockInvoice.project_id}`}
                        className="text-[#F97316] hover:text-[#EA580C]"
                      >
                        {mockInvoice.project_name}
                      </Link>
                    </>
                  )}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getInvoiceStatusColor(
                      mockInvoice.status
                    )}`}
                  >
                    {statusLabels[mockInvoice.status]}
                  </span>
                  {isInvoiceOverdue(mockInvoice) && (
                    <span className="text-xs text-red-600 font-medium">
                      En retard de {getDaysOverdue(mockInvoice)} jour{getDaysOverdue(mockInvoice) > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // Simuler le téléchargement du PDF
                    const link = document.createElement("a");
                    link.href = "#";
                    link.download = `${mockInvoice.number}.pdf`;
                    link.click();
                    // Dans une vraie app, on appellerait l'API pour générer le PDF
                    alert(`Téléchargement du PDF ${mockInvoice.number}.pdf simulé`);
                  }}
                  className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => {
                    // Dupliquer la facture en redirigeant vers la page de création avec les données pré-remplies
                    const duplicateParams = new URLSearchParams({
                      duplicate: String(mockInvoice.id),
                      client: String(mockInvoice.client_id),
                      ...(mockInvoice.project_id && { project: String(mockInvoice.project_id) }),
                    });
                    router.push(`/app/billing/invoices/new?${duplicateParams.toString()}`);
                  }}
                  className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
                >
                  📋 Dupliquer
                </button>
                {mockInvoice.status !== "payée" && (
                  <>
                    <button
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
                    >
                      💰 Ajouter paiement
                    </button>
                    <button
                      onClick={() => {
                        router.push(`/app/relances?invoice=${mockInvoice.id}`);
                      }}
                      className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
                    >
                      ✨ Relancer IA
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    // TODO: Modifier facture
                    router.push(`/app/billing/invoices/${mockInvoice.id}/edit`);
                  }}
                  className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
                >
                  ✏️ Modifier
                </button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Bloc Paiement */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0F172A]">
                Paiement
              </h2>
              {mockInvoice.status !== "payée" && (
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="text-xs text-[#F97316] hover:text-[#EA580C]"
                >
                  + Ajouter un paiement
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-[#F9FAFB] p-4 rounded-lg">
                <p className="text-sm text-[#64748B] mb-1">Montant total</p>
                <p className="text-xl font-bold text-[#0F172A]">
                  {formatAmount(mockInvoice.total)}
                </p>
              </div>
              <div className="bg-[#F9FAFB] p-4 rounded-lg">
                <p className="text-sm text-[#64748B] mb-1">Montant payé</p>
                <p className="text-xl font-bold text-green-600">
                  {formatAmount(mockInvoice.amount_paid)}
                </p>
              </div>
            </div>
            <div className="bg-[#F9FAFB] p-4 rounded-lg">
              <p className="text-sm text-[#64748B] mb-1">Montant restant</p>
              <p className={`text-xl font-bold ${mockInvoice.amount_remaining > 0 ? "text-red-600" : "text-green-600"}`}>
                {formatAmount(mockInvoice.amount_remaining)}
              </p>
            </div>
            {mockInvoice.payments && mockInvoice.payments.length > 0 && (
              <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
                <h3 className="text-sm font-medium text-[#0F172A] mb-3">
                  Historique des paiements
                </h3>
                <div className="space-y-2">
                  {mockInvoice.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-[#E5E7EB] bg-white"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#0F172A]">
                          {formatAmount(payment.amount)} - {payment.method}
                        </p>
                        <p className="text-xs text-[#64748B]">
                          {new Date(payment.date).toLocaleDateString("fr-FR")}
                          {payment.reference && ` • Réf: ${payment.reference}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bloc 2 : Timeline */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#0F172A]">Timeline</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockInvoice.timeline
                .sort(
                  (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime()
                )
                .map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-3 w-3 rounded-full bg-[#F97316]"></div>
                      {index < mockInvoice.timeline.length - 1 && (
                        <div className="h-12 w-0.5 bg-[#E5E7EB]"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium text-[#0F172A]">
                        {event.action}
                      </p>
                      {event.description && (
                        <p className="text-xs text-[#64748B] mt-1">
                          {event.description}
                        </p>
                      )}
                      <p className="text-xs text-[#64748B] mt-1">
                        {event.user} •{" "}
                        {new Date(event.timestamp).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Bloc 3 : Lignes de la facture */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#0F172A]">
              Détails de la facture
            </h2>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F9FAFB]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#64748B] uppercase">
                      Quantité
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#64748B] uppercase">
                      Prix unitaire
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#64748B] uppercase">
                      TVA
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#64748B] uppercase">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {mockInvoice.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3 text-sm text-[#0F172A]">
                        {line.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-[#64748B]">
                        {line.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-[#64748B]">
                        {formatAmount(line.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-[#64748B]">
                        {line.taxRate}%
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-right text-[#0F172A]">
                        {formatAmount(calculateLineTotal(line))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#F9FAFB]">
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-3 text-sm font-medium text-right text-[#0F172A]"
                    >
                      Sous-total HT
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-right text-[#0F172A]">
                      {formatAmount(mockInvoice.subtotal)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-3 text-sm font-medium text-right text-[#0F172A]"
                    >
                      TVA
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-right text-[#0F172A]">
                      {formatAmount(mockInvoice.tax)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-3 text-lg font-bold text-right text-[#0F172A]"
                    >
                      Total TTC
                    </td>
                    <td className="px-4 py-3 text-lg font-bold text-right text-[#0F172A]">
                      {formatAmount(mockInvoice.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {mockInvoice.notes && (
              <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
                <h3 className="text-sm font-medium text-[#0F172A] mb-2">
                  Notes
                </h3>
                <p className="text-sm text-[#64748B]">{mockInvoice.notes}</p>
              </div>
            )}
            {mockInvoice.conditions && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-[#0F172A] mb-2">
                  Conditions
                </h3>
                <p className="text-sm text-[#64748B]">{mockInvoice.conditions}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bloc 4 : Historique */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#0F172A]">
              Historique des actions
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mockInvoice.history
                .sort(
                  (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime()
                )
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#F97316] mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#0F172A]">
                        {entry.action}
                      </p>
                      {entry.description && (
                        <p className="text-xs text-[#64748B] mt-1">
                          {entry.description}
                        </p>
                      )}
                      <p className="text-xs text-[#64748B] mt-1">
                        {entry.user} •{" "}
                        {new Date(entry.timestamp).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Bloc 5 : Documents associés */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0F172A]">
                Documents associés
              </h2>
              <button className="text-xs text-[#F97316] hover:text-[#EA580C]">
                + Ajouter un document
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded border border-[#E5E7EB] hover:bg-[#F9FAFB]">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#0F172A]">
                    📄 {mockInvoice.number}.pdf
                  </span>
                  <span className="text-xs text-[#64748B]">(Généré automatiquement)</span>
                </div>
                <button className="text-xs text-blue-600 hover:text-blue-700">
                  Télécharger
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

