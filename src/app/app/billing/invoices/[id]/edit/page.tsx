"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageTitle } from "@/components/layout/PageTitle";
import { Invoice, BillingLine, BillingHistoryEvent, BillingTimelineEvent } from "@/components/billing/types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { calculateSubtotal, calculateTax, calculateTotal, calculateLineTotal, formatAmount } from "@/components/billing/utils";
import { DescriptionAutocomplete } from "@/components/billing/DescriptionAutocomplete";
import { useAuth } from "@/hooks/useAuth";

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = Number(params.id);
  const { user } = useAuth();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      const mockInvoice: Invoice = {
        id: 1,
        number: "FAC-2025-014",
        client_id: 1,
        client_name: "Boulangerie Soleil",
        project_id: 2,
        project_name: "Installation équipement",
        status: "envoyée",
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
        due_date: "2025-02-10",
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
      };
      setInvoice(mockInvoice);
      setIsLoading(false);
    }, 300);
  }, [invoiceId]);

  const handleLineChange = (lineId: number, field: keyof BillingLine, value: string | number) => {
    if (!invoice) return;
    
    const updatedLines = invoice.lines.map((line) =>
      line.id === lineId ? { ...line, [field]: value } : line
    );

    const subtotal = calculateSubtotal(updatedLines);
    const tax = calculateTax(updatedLines);
    const total = calculateTotal(updatedLines);

    setInvoice({
      ...invoice,
      lines: updatedLines,
      subtotal,
      tax,
      total,
      amount_remaining: total - invoice.amount_paid,
    });
  };

  const handleAddLine = () => {
    if (!invoice) return;
    
    const newLine: BillingLine = {
      id: Date.now(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: 20,
    };

    const updatedLines = [...invoice.lines, newLine];
    const subtotal = calculateSubtotal(updatedLines);
    const tax = calculateTax(updatedLines);
    const total = calculateTotal(updatedLines);

    setInvoice({
      ...invoice,
      lines: updatedLines,
      subtotal,
      tax,
      total,
      amount_remaining: total - invoice.amount_paid,
    });
  };

  const handleRemoveLine = (lineId: number) => {
    if (!invoice) return;
    
    const updatedLines = invoice.lines.filter((line) => line.id !== lineId);
    const subtotal = calculateSubtotal(updatedLines);
    const tax = calculateTax(updatedLines);
    const total = calculateTotal(updatedLines);

    setInvoice({
      ...invoice,
      lines: updatedLines,
      subtotal,
      tax,
      total,
      amount_remaining: total - invoice.amount_paid,
    });
  };

  // Fonction pour sauvegarder une nouvelle ligne dans la base de données
  const handleSaveNewLine = async (description: string, unitPrice: number, taxRate: number) => {
    // TODO: Appel API pour sauvegarder la nouvelle ligne
    console.log("Sauvegarder nouvelle ligne:", { description, unitPrice, taxRate });
  };

  const handleSave = async (status: Invoice["status"]) => {
    if (!invoice) return;

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const userName = user?.full_name || user?.email || "Utilisateur";

      const historyEvent: BillingHistoryEvent = {
        id: Date.now(),
        timestamp: now,
        action: "Facture modifiée",
        description: `Statut: ${status}`,
        user: userName,
      };

      let timelineEvent: BillingTimelineEvent | null = null;
      if (invoice.status !== status) {
        timelineEvent = {
          id: Date.now(),
          timestamp: now,
          action: `Statut changé: ${status}`,
          description: `De '${invoice.status}' à '${status}'`,
          user: userName,
        };
      }

      const updatedInvoice: Invoice = {
        ...invoice,
        status,
        history: [...invoice.history, historyEvent],
        timeline: timelineEvent ? [...invoice.timeline, timelineEvent] : invoice.timeline,
      };

      console.log("Save invoice:", updatedInvoice);
      await new Promise((resolve) => setTimeout(resolve, 500));

      router.push(`/app/billing/invoices/${invoice.id}`);
    } catch (error) {
      console.error("Error saving invoice:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !invoice) {
    return (
      <>
        <PageTitle title="Modifier la facture" />
        <div className="space-y-6">
          <p className="text-slate-600">Chargement...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle title={`Modifier ${invoice.number}`} />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push(`/app/billing/invoices/${invoice.id}`)}
            className="text-sm text-[#64748B] hover:text-[#0F172A]"
          >
            ← Retour à la facture
          </button>
        </div>

        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold text-[#0F172A]">
              Modifier la facture {invoice.number}
            </h1>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Infos client */}
            <div>
              <h2 className="text-lg font-semibold text-[#0F172A] mb-4">
                Informations client
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Client
                  </label>
                  <input
                    type="text"
                    value={invoice.client_name}
                    readOnly
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm bg-[#F9FAFB] text-[#64748B]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Date d'échéance
                  </label>
                  <input
                    type="date"
                    value={invoice.due_date}
                    onChange={(e) =>
                      setInvoice({ ...invoice, due_date: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  />
                </div>
              </div>
            </div>

            {/* Lignes de la facture */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#0F172A]">
                  Lignes de la facture
                </h2>
                <button
                  onClick={handleAddLine}
                  className="text-sm text-[#F97316] hover:text-[#EA580C] font-medium"
                >
                  + Ajouter une ligne
                </button>
              </div>
              <div className="space-y-4">
                {invoice.lines.map((line) => (
                  <div
                    key={line.id}
                    className="p-4 rounded-lg border border-[#E5E7EB] bg-white"
                  >
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-5">
                        <label className="block text-xs font-medium text-[#64748B] mb-1">
                          Description
                        </label>
                        <DescriptionAutocomplete
                          value={line.description}
                          onChange={(value) =>
                            handleLineChange(line.id, "description", value)
                          }
                          onSelectLine={(savedLine) => {
                            // Pré-remplir le prix et la TVA si une ligne est sélectionnée
                            handleLineChange(line.id, "unitPrice", savedLine.unitPrice);
                            handleLineChange(line.id, "taxRate", savedLine.taxRate);
                          }}
                          onSaveNewLine={(description, unitPrice, taxRate) => {
                            // Sauvegarder la nouvelle ligne et mettre à jour la ligne actuelle
                            handleSaveNewLine(description, unitPrice, taxRate);
                            handleLineChange(line.id, "description", description);
                            if (unitPrice > 0) {
                              handleLineChange(line.id, "unitPrice", unitPrice);
                            }
                            if (taxRate > 0) {
                              handleLineChange(line.id, "taxRate", taxRate);
                            }
                          }}
                          defaultUnitPrice={line.unitPrice}
                          defaultTaxRate={line.taxRate}
                          placeholder="Tapez pour rechercher dans les lignes enregistrées..."
                          className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-[#64748B] mb-1">
                          Quantité
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.quantity}
                          onChange={(e) =>
                            handleLineChange(
                              line.id,
                              "quantity",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-[#64748B] mb-1">
                          Prix unitaire
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) =>
                            handleLineChange(
                              line.id,
                              "unitPrice",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-[#64748B] mb-1">
                          TVA (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={line.taxRate}
                          onChange={(e) =>
                            handleLineChange(
                              line.id,
                              "taxRate",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                        />
                      </div>
                      <div className="col-span-1 flex items-end">
                        <button
                          onClick={() => handleRemoveLine(line.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 text-right">
                      <span className="text-sm font-medium text-[#0F172A]">
                        Total: {formatAmount(calculateLineTotal(line))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Résumé */}
            <div className="bg-[#F9FAFB] p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-[#0F172A] mb-4">
                Résumé
              </h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748B]">Sous-total HT</span>
                  <span className="font-medium text-[#0F172A]">
                    {formatAmount(invoice.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748B]">TVA</span>
                  <span className="font-medium text-[#0F172A]">
                    {formatAmount(invoice.tax)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-[#E5E7EB]">
                  <span className="text-[#0F172A]">Total TTC</span>
                  <span className="text-[#0F172A]">
                    {formatAmount(invoice.total)}
                  </span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-[#E5E7EB]">
                  <span className="text-[#64748B]">Montant payé</span>
                  <span className="font-medium text-green-600">
                    {formatAmount(invoice.amount_paid)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-[#0F172A]">Montant restant</span>
                  <span className={invoice.amount_remaining > 0 ? "text-red-600" : "text-green-600"}>
                    {formatAmount(invoice.amount_remaining)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes & Conditions */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Notes
                </label>
                <textarea
                  value={invoice.notes || ""}
                  onChange={(e) =>
                    setInvoice({ ...invoice, notes: e.target.value })
                  }
                  rows={4}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Conditions
                </label>
                <textarea
                  value={invoice.conditions || ""}
                  onChange={(e) =>
                    setInvoice({ ...invoice, conditions: e.target.value })
                  }
                  rows={4}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                />
              </div>
            </div>

            {/* Statut */}
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Statut
              </label>
              <select
                value={invoice.status}
                onChange={(e) =>
                  setInvoice({
                    ...invoice,
                    status: e.target.value as Invoice["status"],
                  })
                }
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              >
                <option value="brouillon">Brouillon</option>
                <option value="envoyée">Envoyée</option>
                <option value="payée">Payée</option>
                <option value="en_retard">En retard</option>
              </select>
            </div>

            {/* Boutons d'action */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
              <button
                onClick={() => router.push(`/app/billing/invoices/${invoice.id}`)}
                className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
              >
                Annuler
              </button>
              <button
                onClick={() => handleSave("brouillon")}
                disabled={isSaving}
                className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB] disabled:opacity-60"
              >
                {isSaving ? "Enregistrement..." : "Enregistrer comme brouillon"}
              </button>
              <button
                onClick={() => handleSave(invoice.status)}
                disabled={isSaving}
                className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-6 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60"
              >
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

