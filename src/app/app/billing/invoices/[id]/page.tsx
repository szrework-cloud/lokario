"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageTitle } from "@/components/layout/PageTitle";
import { Invoice, Payment, BillingLine } from "@/components/billing/types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { getInvoiceStatusColor, formatAmount, calculateLineTotal, isInvoiceOverdue, getDaysOverdue } from "@/components/billing/utils";
import { getInvoice, updateInvoice, validateInvoice, cancelInvoice, generatePDF, getRelatedDocuments, Invoice as InvoiceAPI, InvoiceLine, RelatedDocument } from "@/services/invoicesService";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { logger } from "@/lib/logger";

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = Number(params.id);
  const { token } = useAuth();
  const { showToast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedDocuments, setRelatedDocuments] = useState<RelatedDocument[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [creditNoteAmount, setCreditNoteAmount] = useState<string>("");
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    method: "virement" as Payment["method"],
    reference: "",
    notes: "",
  });

  useEffect(() => {
    const loadInvoice = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await getInvoice(token, invoiceId);
        
        // Adapter les données du backend au format frontend
        // Valider operation_category pour s'assurer qu'il correspond au type attendu
        const validOperationCategory = data.operation_category && 
          (data.operation_category === "vente" || 
           data.operation_category === "prestation" || 
           data.operation_category === "les deux")
          ? data.operation_category as "vente" | "prestation" | "les deux"
          : undefined;

        const adaptedInvoice: Invoice = {
          ...data,
          client_name: data.client_name || "",
          due_date: data.due_date || new Date().toISOString().split('T')[0],
          operation_category: validOperationCategory,
          vat_on_debit: data.vat_on_debit ?? false,
          vat_applicable: data.vat_applicable ?? true,
          amount: data.amount || data.total_ttc || data.total || 0,
          // Adapter les lignes (unit_price_ht -> unitPrice, tax_rate -> taxRate)
          lines: (data.lines || []).map((line) => ({
            id: line.id || 0,
            description: line.description,
            quantity: line.quantity,
            unit: line.unit,
            unitPrice: line.unit_price_ht,
            taxRate: line.tax_rate,
            total: line.total_ttc,
          })),
          // S'assurer que les champs optionnels sont présents
          amount_paid: data.amount_paid || 0,
          amount_remaining: data.amount_remaining ?? (data.total_ttc || data.total || data.amount || 0),
          subtotal: data.subtotal_ht || 0,
          tax: data.total_tax || 0,
          total: data.total_ttc || data.total || data.amount || 0,
          timeline: [], // TODO: Récupérer depuis l'API
          history: [], // TODO: Récupérer depuis l'API
          payments: [], // TODO: Récupérer depuis l'API
        };
        
        setInvoice(adaptedInvoice);
        
        // Charger les documents liés
        try {
          setIsLoadingDocuments(true);
          const documentsData = await getRelatedDocuments(token, invoiceId);
          logger.log("Documents liés reçus:", documentsData);
          logger.log("Nombre de documents:", documentsData.related_documents?.length || 0);
          logger.log("Documents détaillés:", JSON.stringify(documentsData.related_documents, null, 2));
          setRelatedDocuments(documentsData.related_documents || []);
        } catch (err: any) {
          // Ne pas bloquer l'affichage de la facture si les documents liés ne se chargent pas
          console.error("Erreur lors du chargement des documents liés:", err);
        } finally {
          setIsLoadingDocuments(false);
        }
      } catch (err: any) {
        console.error("Erreur lors du chargement de la facture:", err);
        setError(err.message || "Erreur lors du chargement de la facture");
      } finally {
        setIsLoading(false);
      }
    };

    loadInvoice();
  }, [invoiceId, token]);

  if (isLoading) {
    return (
      <>
        <PageTitle title="Facture" />
        <div className="space-y-6">
          <div className="flex items-center justify-center p-8">
            <div className="text-[#64748B]">Chargement de la facture...</div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageTitle title="Erreur" />
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Erreur</h3>
            <p className="text-sm text-red-700 mb-4">{error}</p>
            <button
              onClick={() => router.push("/app/billing/quotes")}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              ← Retour à la liste
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!invoice) {
    return (
      <>
        <PageTitle title="Facture introuvable" />
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-slate-600">La facture demandée n'existe pas.</p>
              <button
                onClick={() => router.push("/app/billing/quotes")}
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
    impayée: "Impayée",
    en_retard: "En retard",
    annulée: "Annulée",
  };

  const handleAddPayment = async () => {
    if (!token || !invoice) return;

    const amount = parseFloat(paymentForm.amount);
    if (isNaN(amount) || amount <= 0) {
      showToast("Veuillez entrer un montant valide", "error");
      return;
    }

    if (amount > invoice.amount_remaining) {
      showToast(`Le montant ne peut pas dépasser le montant restant (${formatAmount(invoice.amount_remaining)})`, "error");
      return;
    }

    try {
      // Appeler l'API pour enregistrer le paiement
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/invoices/${invoice.id}/payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: amount,
            date: paymentForm.date,
            method: paymentForm.method,
            reference: paymentForm.reference || null,
            notes: paymentForm.notes || null,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: "Erreur lors de l'ajout du paiement" }));
        throw new Error(error.detail || "Erreur lors de l'ajout du paiement");
      }

      // Recharger la facture pour avoir les données à jour
      const reloadedInvoice = await getInvoice(token, invoice.id);
      
      // Valider operation_category
      const validOperationCategory = reloadedInvoice.operation_category && 
        (reloadedInvoice.operation_category === "vente" || 
         reloadedInvoice.operation_category === "prestation" || 
         reloadedInvoice.operation_category === "les deux")
        ? reloadedInvoice.operation_category as "vente" | "prestation" | "les deux"
        : undefined;

      // Adapter les données
      const adaptedInvoice: Invoice = {
        ...reloadedInvoice,
        client_name: reloadedInvoice.client_name || "",
        due_date: reloadedInvoice.due_date || new Date().toISOString().split('T')[0],
        operation_category: validOperationCategory,
        vat_on_debit: reloadedInvoice.vat_on_debit ?? false,
        vat_applicable: reloadedInvoice.vat_applicable ?? true,
        amount: reloadedInvoice.amount || reloadedInvoice.total_ttc || reloadedInvoice.total || 0,
        lines: (reloadedInvoice.lines || []).map((line) => ({
          id: line.id || 0,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unit_price_ht,
          taxRate: line.tax_rate,
          total: line.total_ttc,
        })),
        amount_paid: Number(reloadedInvoice.amount_paid || 0),
        amount_remaining: Number(reloadedInvoice.amount_remaining ?? (reloadedInvoice.total_ttc || reloadedInvoice.total || reloadedInvoice.amount || 0)),
        subtotal: reloadedInvoice.subtotal_ht || 0,
        tax: reloadedInvoice.total_tax || 0,
        total: reloadedInvoice.total_ttc || reloadedInvoice.total || reloadedInvoice.amount || 0,
        timeline: [],
        history: [],
        payments: [
          ...(invoice.payments || []),
          {
            id: Date.now(),
            amount: amount,
            date: paymentForm.date,
            method: paymentForm.method,
            reference: paymentForm.reference || undefined,
            notes: paymentForm.notes || undefined,
          },
        ],
      };

      setInvoice(adaptedInvoice);

      // Réinitialiser le formulaire
      setPaymentForm({
        amount: "",
        date: new Date().toISOString().split("T")[0],
        method: "virement",
        reference: "",
        notes: "",
      });

      setIsPaymentModalOpen(false);
    } catch (err: any) {
      console.error("Erreur lors de l'ajout du paiement:", err);
      showToast(`Erreur lors de l'ajout du paiement: ${err.message || "Erreur inconnue"}`, "error");
    }
  };

  return (
    <>
      <PageTitle title={`Facture ${invoice.number}`} />
      <div className="space-y-6">
        {/* Bouton retour */}
        <button
          onClick={() => router.push("/app/billing/quotes")}
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
                  {invoice.number}
                </h1>
                <p className="mt-1 text-sm text-[#64748B]">
                  Client:{" "}
                  <Link
                    href={`/app/clients?client=${encodeURIComponent(invoice.client_name || "")}`}
                    className="text-[#F97316] hover:text-[#EA580C]"
                  >
                    {invoice.client_name}
                  </Link>
                  {invoice.project_name && (
                    <>
                      {" • "}
                      <Link
                        href={`/app/projects?project=${invoice.project_id}`}
                        className="text-[#F97316] hover:text-[#EA580C]"
                      >
                        {invoice.project_name}
                      </Link>
                    </>
                  )}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  {invoice.invoice_type === "avoir" ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Avoir
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getInvoiceStatusColor(
                        invoice.status
                      )}`}
                    >
                      {statusLabels[invoice.status]}
                    </span>
                  )}
                  {invoice.invoice_type !== "avoir" && isInvoiceOverdue(invoice) && (
                    <span className="text-xs text-red-600 font-medium">
                      En retard de {getDaysOverdue(invoice)} jour{getDaysOverdue(invoice) > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (!token) return;
                    try {
                      // Générer le PDF via l'API avec authentification
                      const blob = await generatePDF(token, invoice.id);
                      const url = window.URL.createObjectURL(blob);
                      window.open(url, "_blank");
                      // Nettoyer l'URL après un délai
                      setTimeout(() => window.URL.revokeObjectURL(url), 100);
                    } catch (error) {
                      showToast("Erreur lors de la génération du PDF", "error");
                    }
                  }}
                  className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
                >
                  📄 PDF
                </button>
                {invoice.status !== "payée" && invoice.status !== "annulée" && (
                  <>
                    <button
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
                    >
                      💰 Ajouter paiement
                    </button>
                    <button
                      onClick={() => {
                        router.push(`/app/relances?invoice=${invoice.id}`);
                      }}
                      className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
                    >
                      ✨ Relancer IA
                    </button>
                  </>
                )}
                {invoice.status !== "annulée" && invoice.invoice_type !== "avoir" && (
                  <button
                    onClick={() => {
                      // Pré-remplir avec le montant restant créditable (total - avoirs existants)
                      // Utiliser credit_remaining si disponible, sinon calculer depuis total
                      const creditRemaining = (invoice as any).credit_remaining;
                      const total = invoice.total || 0;
                      const remainingAmount = creditRemaining != null ? Number(creditRemaining) : Number(total);
                      setCreditNoteAmount(isNaN(remainingAmount) ? "0.00" : remainingAmount.toFixed(2));
                      setIsCancelModalOpen(true);
                    }}
                    className="rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
                  >
                    📝 Créer un avoir
                  </button>
                )}
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
              {invoice.status !== "payée" && (
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
                  {formatAmount(invoice.total)}
                </p>
              </div>
              <div className="bg-[#F9FAFB] p-4 rounded-lg">
                <p className="text-sm text-[#64748B] mb-1">Montant payé</p>
                <p className="text-xl font-bold text-green-600">
                  {formatAmount(invoice.amount_paid)}
                </p>
              </div>
            </div>
            <div className="bg-[#F9FAFB] p-4 rounded-lg">
              <p className="text-sm text-[#64748B] mb-1">Montant restant</p>
              <p className={`text-xl font-bold ${invoice.amount_remaining > 0 ? "text-red-600" : "text-green-600"}`}>
                {formatAmount(invoice.amount_remaining)}
              </p>
            </div>
            {invoice.payments && invoice.payments.length > 0 && (
              <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
                <h3 className="text-sm font-medium text-[#0F172A] mb-3">
                  Historique des paiements
                </h3>
                <div className="space-y-2">
                  {invoice.payments.map((payment) => (
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
              {invoice.timeline && invoice.timeline.length > 0 ? (
                invoice.timeline
                  .sort(
                    (a, b) =>
                      new Date(b.timestamp).getTime() -
                      new Date(a.timestamp).getTime()
                  )
                  .map((event, index) => (
                    <div key={event.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-3 rounded-full bg-[#F97316]"></div>
                        {index < invoice.timeline.length - 1 && (
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
                  ))
              ) : (
                <p className="text-sm text-[#64748B]">Aucun événement dans la timeline</p>
              )}
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
                      Unité
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
                  {invoice.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3 text-sm text-[#0F172A]">
                        {line.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-[#64748B]">
                        {line.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-[#64748B]">
                        {line.unit || "-"}
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
                      colSpan={5}
                      className="px-4 py-3 text-sm font-medium text-right text-[#0F172A]"
                    >
                      Sous-total HT
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-right text-[#0F172A]">
                      {formatAmount(invoice.subtotal)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-3 text-sm font-medium text-right text-[#0F172A]"
                    >
                      TVA
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-right text-[#0F172A]">
                      {formatAmount(invoice.tax)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-3 text-lg font-bold text-right text-[#0F172A]"
                    >
                      Total TTC
                    </td>
                    <td className="px-4 py-3 text-lg font-bold text-right text-[#0F172A]">
                      {formatAmount(invoice.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {invoice.notes && (
              <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
                <h3 className="text-sm font-medium text-[#0F172A] mb-2">
                  Notes
                </h3>
                <p className="text-sm text-[#64748B]">{invoice.notes}</p>
              </div>
            )}
            {invoice.conditions && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-[#0F172A] mb-2">
                  Conditions
                </h3>
                <p className="text-sm text-[#64748B]">{invoice.conditions}</p>
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
              {invoice.history && invoice.history.length > 0 ? (
                invoice.history
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
                  ))
              ) : (
                <p className="text-sm text-[#64748B]">Aucun historique disponible</p>
              )}
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
                    📄 {invoice.number}.pdf
                  </span>
                  <span className="text-xs text-[#64748B]">(Généré automatiquement)</span>
                </div>
                <button 
                  onClick={async () => {
                    if (!token) return;
                    try {
                      // Générer le PDF via l'API avec authentification
                      const blob = await generatePDF(token, invoice.id);
                      const url = window.URL.createObjectURL(blob);
                      window.open(url, "_blank");
                      // Nettoyer l'URL après un délai
                      setTimeout(() => window.URL.revokeObjectURL(url), 100);
                    } catch (error) {
                      showToast("Erreur lors de la génération du PDF", "error");
                    }
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Télécharger
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modal d'ajout de paiement */}
        <Modal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          title="Ajouter un paiement"
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-2">
                Montant (€) *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={invoice.amount_remaining}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="flex-1 px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                />
                <button
                  type="button"
                  onClick={() => setPaymentForm({ ...paymentForm, amount: Number(invoice.amount_remaining || 0).toFixed(2) })}
                  className="px-4 py-2 text-sm font-medium text-[#F97316] border border-[#F97316] rounded-lg hover:bg-[#F97316] hover:text-white transition-colors whitespace-nowrap"
                  title="Remplir avec le montant total restant"
                >
                  Total
                </button>
              </div>
              <p className="text-xs text-[#64748B] mt-1">
                Montant restant: {formatAmount(invoice.amount_remaining)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-2">
                Date *
              </label>
              <input
                type="date"
                value={paymentForm.date}
                onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-2">
                Mode de paiement *
              </label>
              <select
                value={paymentForm.method}
                onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as Payment["method"] })}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
              >
                <option value="virement">Virement</option>
                <option value="chèque">Chèque</option>
                <option value="espèces">Espèces</option>
                <option value="carte">Carte bancaire</option>
                <option value="autre">Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-2">
                Référence
              </label>
              <input
                type="text"
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                placeholder="Ex: VIR-2025-001"
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-2">
                Notes
              </label>
              <textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Notes optionnelles..."
                rows={3}
                className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleAddPayment}
                className="flex-1 rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
              >
                Enregistrer le paiement
              </button>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A]"
              >
                Annuler
              </button>
            </div>
          </div>
        </Modal>

        {/* Modal de confirmation pour créer un avoir */}
        <Modal
          isOpen={isCancelModalOpen}
          onClose={() => {
            setIsCancelModalOpen(false);
            setCreditNoteAmount("");
          }}
          title="Créer un avoir"
          size="md"
        >
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-[#0F172A] font-medium">
                Créer un avoir pour cette facture
              </p>
              <p className="text-sm text-[#64748B]">
                Montant total de la facture : <strong>{formatAmount(invoice.total)}</strong>
              </p>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[#0F172A]">
                Montant de l'avoir (€) *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={(() => {
                    const creditRemaining = (invoice as any).credit_remaining;
                    const total = invoice.total || 0;
                    return creditRemaining != null ? Number(creditRemaining) : Number(total);
                  })()}
                  value={creditNoteAmount}
                  onChange={(e) => setCreditNoteAmount(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                />
                <button
                  type="button"
                  onClick={() => {
                    const creditRemaining = (invoice as any).credit_remaining;
                    const total = invoice.total || 0;
                    const remainingAmount = creditRemaining != null ? Number(creditRemaining) : Number(total);
                    setCreditNoteAmount(isNaN(remainingAmount) ? "0.00" : remainingAmount.toFixed(2));
                  }}
                  className="px-4 py-2 text-sm font-medium text-[#F97316] border border-[#F97316] rounded-lg hover:bg-[#F97316] hover:text-white transition-colors whitespace-nowrap"
                  title="Remplir avec le montant total restant"
                >
                  Total
                </button>
              </div>
              <p className="text-xs text-[#64748B]">
                Montant restant créditable : {(() => {
                  const creditRemaining = (invoice as any).credit_remaining;
                  const total = invoice.total || 0;
                  const amount = creditRemaining != null ? Number(creditRemaining) : Number(total);
                  return formatAmount(isNaN(amount) ? 0 : amount);
                })()}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={async () => {
                  if (!token) return;
                  const amount = parseFloat(creditNoteAmount);
                  if (!amount || amount <= 0) {
                    showToast("Veuillez saisir un montant valide", "error");
                    return;
                  }
                  const creditRemaining = (invoice as any).credit_remaining;
                  const total = invoice.total || 0;
                  const maxAmount = creditRemaining != null ? Number(creditRemaining) : Number(total);
                  if (isNaN(maxAmount) || amount > maxAmount) {
                    showToast(`Le montant ne peut pas dépasser ${formatAmount(maxAmount)}`, "error");
                    return;
                  }
                  setIsCancelling(true);
                  try {
                    await cancelInvoice(token, invoice.id, amount);
                    setIsCancelModalOpen(false);
                    setCreditNoteAmount("");
                    // Recharger la facture
                    const data = await getInvoice(token, invoiceId);
                    // Valider operation_category
                    const validOpCategory = data.operation_category && 
                      (data.operation_category === "vente" || 
                       data.operation_category === "prestation" || 
                       data.operation_category === "les deux")
                      ? data.operation_category as "vente" | "prestation" | "les deux"
                      : undefined;
                    const adaptedInvoice: Invoice = {
                      ...data,
                      client_name: data.client_name || "",
                      due_date: data.due_date || new Date().toISOString().split('T')[0],
                      operation_category: validOpCategory,
                      vat_on_debit: data.vat_on_debit ?? false,
                      vat_applicable: data.vat_applicable ?? true,
                      amount: data.amount || data.total_ttc || 0,
                      lines: (data.lines || []).map((line) => ({
                        id: line.id || 0,
                        description: line.description,
                        quantity: line.quantity,
                        unitPrice: line.unit_price_ht,
                        taxRate: line.tax_rate,
                        total: line.total_ttc,
                      })),
                      amount_paid: data.amount_paid || 0,
                      amount_remaining: data.amount_remaining ?? (data.total_ttc || data.amount || 0),
                      subtotal: data.subtotal_ht || 0,
                      tax: data.total_tax || 0,
                      total: data.total_ttc || data.amount || 0,
                      timeline: [],
                      history: [],
                      payments: [],
                    };
                    setInvoice(adaptedInvoice);
                    // Recharger la page pour voir les changements
                    window.location.reload();
                  } catch (err: any) {
                    showToast(`Erreur lors de la création de l'avoir: ${err.message || "Erreur inconnue"}`, "error");
                  } finally {
                    setIsCancelling(false);
                  }
                }}
                disabled={isCancelling || !creditNoteAmount || parseFloat(creditNoteAmount) <= 0}
                className="flex-1 rounded-xl bg-gradient-to-r from-orange-600 to-orange-700 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCancelling ? "Création en cours..." : "Créer l'avoir"}
              </button>
              <button
                onClick={() => {
                  setIsCancelModalOpen(false);
                  setCreditNoteAmount("");
                }}
                disabled={isCancelling}
                className="px-4 py-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A] disabled:opacity-60"
              >
                Annuler
              </button>
            </div>
          </div>
        </Modal>

        {/* Section Documents liés */}
        {relatedDocuments.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <h2 className="text-xl font-semibold text-[#0F172A]">Documents liés</h2>
              <p className="text-sm text-[#64748B] mt-1">
                Tous les documents en rapport avec cette facture
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {relatedDocuments.map((doc) => (
                  <div
                    key={`${doc.type}-${doc.id}`}
                    className="flex items-center justify-between p-4 border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#F97316] to-[#EA580C] flex items-center justify-center text-white font-semibold">
                        {doc.type === "quote" ? "📄" : doc.type === "credit_note" ? "💰" : "📋"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={doc.type === "quote" ? `/app/billing/quotes/${doc.id}` : `/app/billing/invoices/${doc.id}`}
                            className="font-medium text-[#0F172A] hover:text-[#F97316] transition-colors"
                          >
                            {doc.number}
                          </Link>
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#F1F5F9] text-[#64748B]">
                            {doc.type === "quote" ? "Devis" : doc.type === "credit_note" ? "Avoir" : "Facture"}
                          </span>
                        </div>
                        <div className="text-sm text-[#64748B] mt-1">
                          {doc.type === "quote" ? (
                            <>Montant : <strong>{formatAmount(doc.total || 0)}</strong></>
                          ) : doc.type === "credit_note" ? (
                            <>Montant crédité : <strong>{formatAmount(doc.credit_amount || 0)}</strong></>
                          ) : (
                            <>Montant : <strong>{formatAmount(doc.total || 0)}</strong></>
                          )}
                          {doc.created_at && (
                            <> • {new Date(doc.created_at).toLocaleDateString("fr-FR")}</>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        doc.type === "credit_note"
                          ? "bg-purple-100 text-purple-700"
                          : doc.status === "accepté" || doc.status === "payée"
                          ? "bg-green-100 text-green-700"
                          : doc.status === "refusé" || doc.status === "annulée"
                          ? "bg-red-100 text-red-700"
                          : doc.status === "envoyé" || doc.status === "envoyée"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {doc.type === "credit_note" ? "Avoir" : doc.status}
                      </span>
                      <Link
                        href={doc.type === "quote" ? `/app/billing/quotes/${doc.id}` : `/app/billing/invoices/${doc.id}`}
                        className="px-3 py-1.5 text-sm font-medium text-[#F97316] hover:bg-[#F97316] hover:text-white rounded-lg transition-colors border border-[#F97316]"
                      >
                        Voir
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

