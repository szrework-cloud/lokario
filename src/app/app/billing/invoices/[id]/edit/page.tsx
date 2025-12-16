"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageTitle } from "@/components/layout/PageTitle";
import { Invoice, BillingLine } from "@/components/billing/types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { calculateSubtotal, calculateTax, calculateTotal, calculateLineTotal, formatAmount } from "@/components/billing/utils";
import { DescriptionAutocomplete } from "@/components/billing/DescriptionAutocomplete";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { getInvoice, updateInvoice, Invoice as InvoiceAPI } from "@/services/invoicesService";
import { createBillingLineTemplate } from "@/services/billingLineTemplatesService";

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = Number(params.id);
  const { user, token } = useAuth();
  const { settings } = useSettings(false); // Ne pas auto-load, déjà chargé dans AppLayout

  // Taux de TVA par défaut (les settings n'ont pas encore de section billing)
  const taxRates = [0, 2.1, 5.5, 10, 20];

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvoice = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        const data: InvoiceAPI = await getInvoice(token, invoiceId);
        
        // Adapter les lignes du format backend au format frontend
        const adaptedLines: BillingLine[] = (data.lines || []).map((line) => ({
          id: line.id || 0,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unit_price_ht,
          taxRate: line.tax_rate,
          total: line.total_ttc,
        }));
        
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
          amount: data.amount || data.total_ttc || 0,
          lines: adaptedLines,
          amount_paid: 0,
          amount_remaining: data.total_ttc || data.amount || 0,
          subtotal: data.subtotal_ht || 0,
          tax: data.total_tax || 0,
          total: data.total_ttc || data.amount || 0,
          timeline: [],
          history: [],
          payments: [],
        };
      
        // VÉRIFICATION CRITIQUE : Vérifier si la facture peut être modifiée
        if (adaptedInvoice.status !== "brouillon") {
          setError(
            `Impossible de modifier une facture avec le statut "${adaptedInvoice.status}". ` +
            `Créez un avoir pour corriger une facture validée.`
          );
          setIsLoading(false);
          return;
        }
        
        setInvoice(adaptedInvoice);
        setIsLoading(false);
      } catch (err: any) {
        console.error("Erreur lors du chargement de la facture:", err);
        setError(err.message || "Erreur lors du chargement de la facture");
        setIsLoading(false);
      }
    };
    
    loadInvoice();
  }, [invoiceId, token]);

  const handleLineChange = (lineId: number, field: keyof BillingLine, value: string | number) => {
    if (!invoice) return;
    
    // Vérifier que la facture est en brouillon
    if (invoice.status !== "brouillon") {
      setError("Impossible de modifier une facture validée");
      return;
    }
    
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
  const handleSaveNewLine = async (description: string, unit: string | undefined, unitPrice: number, taxRate: number) => {
    if (!token) return;
    try {
      await createBillingLineTemplate(token, {
        description,
        unit,
        unit_price_ht: unitPrice,
        tax_rate: taxRate,
      });
    } catch (err) {
      console.error("Erreur lors de la sauvegarde de la ligne:", err);
    }
  };

  const handleSave = async (status: Invoice["status"]) => {
    if (!invoice || !token) return;

    setIsSaving(true);
    setError(null);
    
    try {
      // Préparer les données pour l'API
      const updateData = {
        lines: invoice.lines.map((line, index) => ({
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unit_price_ht: line.unitPrice,
          tax_rate: line.taxRate,
          order: index,
        })),
        notes: invoice.notes,
        conditions: invoice.conditions,
        due_date: invoice.due_date,
        payment_terms: invoice.payment_terms,
        late_penalty_rate: invoice.late_penalty_rate,
        recovery_fee: invoice.recovery_fee,
        vat_applicable: invoice.vat_applicable,
        vat_on_debit: invoice.vat_on_debit,
        operation_category: invoice.operation_category,
        vat_exemption_reference: invoice.vat_exemption_reference,
        seller_name: invoice.seller_name,
        seller_address: invoice.seller_address,
        seller_siren: invoice.seller_siren,
        seller_siret: invoice.seller_siret,
        seller_vat_number: invoice.seller_vat_number,
        seller_rcs: invoice.seller_rcs,
        seller_legal_form: invoice.seller_legal_form,
        seller_capital: invoice.seller_capital,
        client_name: invoice.client_name,
        client_address: invoice.client_address,
        client_siren: invoice.client_siren,
        client_delivery_address: invoice.client_delivery_address,
        issue_date: invoice.issue_date,
        sale_date: invoice.sale_date,
      };

      // Appeler l'API pour mettre à jour la facture
      await updateInvoice(token, invoice.id, updateData);
      
      // Si le statut a changé, valider la facture
      if (status !== invoice.status && status !== "brouillon") {
        await validateInvoice(token, invoice.id, status);
      }

      router.push(`/app/billing/invoices/${invoice.id}`);
    } catch (err: any) {
      console.error("Error saving invoice:", err);
      setError(err.message || "Erreur lors de la sauvegarde de la facture");
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
                            // Pré-remplir le prix, l'unité et la TVA si une ligne est sélectionnée
                            handleLineChange(line.id, "unitPrice", savedLine.unitPrice);
                            if (savedLine.unit) {
                              handleLineChange(line.id, "unit", savedLine.unit);
                            }
                            handleLineChange(line.id, "taxRate", savedLine.taxRate);
                          }}
                          onSaveNewLine={(description, unit, unitPrice, taxRate) => {
                            // Sauvegarder la nouvelle ligne et mettre à jour la ligne actuelle
                            handleSaveNewLine(description, unit, unitPrice, taxRate);
                            handleLineChange(line.id, "description", description);
                            if (unit) {
                              handleLineChange(line.id, "unit", unit);
                            }
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
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-[#64748B] mb-1">
                          Unité
                        </label>
                        <input
                          type="text"
                          value={line.unit || ""}
                          onChange={(e) =>
                            handleLineChange(line.id, "unit", e.target.value)
                          }
                          placeholder="ex: heure"
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
                          <select
                            value={line.taxRate}
                            onChange={(e) =>
                              handleLineChange(
                                line.id,
                                "taxRate",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                          >
                            {taxRates.map((rate) => (
                              <option key={rate} value={rate}>
                                {rate}%
                              </option>
                            ))}
                          </select>
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

