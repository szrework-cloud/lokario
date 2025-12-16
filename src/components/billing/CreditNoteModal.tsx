"use client";

import { useState, FormEvent, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { BillingLine, Invoice } from "./types";
import { CreditNoteCreate } from "./types";
import { calculateSubtotal, calculateTax, calculateTotal, calculateLineTotal, formatAmount } from "./utils";
import { DescriptionAutocomplete } from "./DescriptionAutocomplete";
import { getInvoice } from "@/services/invoicesService";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { logger } from "@/lib/logger";

interface CreditNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreditNoteCreate) => void;
  originalInvoiceId: number;
}

// Taux de TVA par défaut (sera remplacé par les settings)
const DEFAULT_TVA_RATES = [0, 2.1, 5.5, 10, 20];

export function CreditNoteModal({
  isOpen,
  onClose,
  onSubmit,
  originalInvoiceId,
}: CreditNoteModalProps) {
  const { token } = useAuth();
  const { settings } = useSettings(false); // Ne pas auto-load, déjà chargé dans AppLayout

  // Récupérer les taux de TVA depuis les settings
  const VALID_TVA_RATES = DEFAULT_TVA_RATES;
  const [originalInvoice, setOriginalInvoice] = useState<any>(null);
  const [formData, setFormData] = useState<CreditNoteCreate>({
    original_invoice_id: originalInvoiceId,
    credit_amount: 0,
    lines: [
      {
        id: Date.now(),
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 20,
      },
    ],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Charger la facture originale
  useEffect(() => {
    const loadInvoice = async () => {
      if (!token || !isOpen) return;

      try {
        setIsLoading(true);
        const invoice = await getInvoice(token, originalInvoiceId);
        setOriginalInvoice(invoice);
        
        // Pré-remplir le montant avec le total de la facture
        setFormData((prev) => ({
          ...prev,
          credit_amount: (invoice as any).total_ttc || invoice.amount || 0,
        }));
      } catch (err: any) {
        console.error("Erreur lors du chargement de la facture:", err);
        setErrors({ general: err.message || "Erreur lors du chargement de la facture" });
      } finally {
        setIsLoading(false);
      }
    };

    loadInvoice();
  }, [originalInvoiceId, token, isOpen]);

  const handleLineChange = (lineId: number, field: keyof BillingLine, value: string | number) => {
    const updatedLines = formData.lines.map((line) =>
      line.id === lineId ? { ...line, [field]: value } : line
    );
    setFormData({ ...formData, lines: updatedLines });
    
    // Recalculer le montant total de l'avoir
    const newTotal = calculateTotal(updatedLines);
    setFormData((prev) => ({ ...prev, credit_amount: newTotal }));
    
    // Valider le taux de TVA
    if (field === "taxRate") {
      const taxRate = Number(value);
      if (!VALID_TVA_RATES.includes(taxRate)) {
        setErrors({
          ...errors,
          [`line_${lineId}_taxRate`]: `Taux de TVA invalide. Taux autorisés: ${VALID_TVA_RATES.join(", ")}%`,
        });
      } else {
        const newErrors = { ...errors };
        delete newErrors[`line_${lineId}_taxRate`];
        setErrors(newErrors);
      }
    }
  };

  const handleAddLine = () => {
    const newLine: BillingLine = {
      id: Date.now(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: 20,
    };
    setFormData({
      ...formData,
      lines: [...formData.lines, newLine],
    });
  };

  const handleRemoveLine = (lineId: number) => {
    if (formData.lines.length === 1) return;
    const updatedLines = formData.lines.filter((line) => line.id !== lineId);
    setFormData({ ...formData, lines: updatedLines });
    
    // Recalculer le montant total
    const newTotal = calculateTotal(updatedLines);
    setFormData((prev) => ({ ...prev, credit_amount: newTotal }));
  };

  const handleSaveNewLine = async (description: string, unit: string | undefined, unitPrice: number, taxRate: number) => {
    // TODO: Appel API pour sauvegarder la nouvelle ligne
    logger.log("Sauvegarder nouvelle ligne:", { description, unitPrice, taxRate });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!originalInvoice) {
      newErrors.general = "Facture originale introuvable";
      setErrors(newErrors);
      return false;
    }
    
    // Vérifier que le montant de l'avoir ne dépasse pas le montant de la facture
    const invoiceTotal = (originalInvoice as any)?.total_ttc || originalInvoice?.amount || 0;
    const creditTotal = calculateTotal(formData.lines);
    
    if (creditTotal > invoiceTotal) {
      newErrors.credit_amount = `Le montant de l'avoir (${formatAmount(creditTotal)}) dépasse le montant de la facture (${formatAmount(invoiceTotal)})`;
    }
    
    if (formData.lines.length === 0) {
      newErrors.lines = "Veuillez ajouter au moins une ligne";
    }
    
    formData.lines.forEach((line) => {
      if (!line.description || line.description.trim() === "") {
        newErrors[`line_${line.id}_description`] = "Description requise";
      }
      if (line.quantity <= 0) {
        newErrors[`line_${line.id}_quantity`] = "Quantité doit être supérieure à 0";
      }
      if (line.unitPrice < 0) {
        newErrors[`line_${line.id}_unitPrice`] = "Prix unitaire doit être positif";
      }
      if (!VALID_TVA_RATES.includes(line.taxRate)) {
        newErrors[`line_${line.id}_taxRate`] = `Taux de TVA invalide. Taux autorisés: ${VALID_TVA_RATES.join(", ")}%`;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // Réinitialiser le formulaire
      setFormData({
        original_invoice_id: originalInvoiceId,
        credit_amount: 0,
        lines: [
          {
            id: Date.now(),
            description: "",
            quantity: 1,
            unitPrice: 0,
            taxRate: 20,
          },
        ],
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error("Error creating credit note:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const subtotal = calculateSubtotal(formData.lines);
  const tax = calculateTax(formData.lines);
  const total = calculateTotal(formData.lines);
  const invoiceTotal = originalInvoice ? (originalInvoice.total || originalInvoice.amount || 0) : 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#0F172A]">Créer un avoir</h2>
              {originalInvoice && (
                <p className="text-sm text-[#64748B] mt-1">
                  Pour la facture {originalInvoice.number} - Montant: {formatAmount(invoiceTotal)}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-[#64748B] hover:text-[#0F172A]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-[#64748B]">Chargement de la facture...</div>
            </div>
          ) : errors.general ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{errors.general}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avertissement sur le montant */}
              {total > invoiceTotal && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700">
                    ⚠️ Le montant de l'avoir ({formatAmount(total)}) dépasse le montant de la facture ({formatAmount(invoiceTotal)})
                  </p>
                </div>
              )}

              {/* Raison de l'avoir */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Raison de l'avoir (optionnel)
                </label>
                <input
                  type="text"
                  value={formData.reason || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  placeholder="Ex: Erreur de facturation, retour marchandise..."
                />
              </div>

              {/* Lignes de l'avoir */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-[#0F172A]">
                    Lignes de l'avoir
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-sm text-[#F97316] hover:text-[#EA580C] font-medium"
                  >
                    + Ajouter une ligne
                  </button>
                </div>
                <div className="space-y-4">
                  {formData.lines.map((line) => (
                    <div
                      key={line.id}
                      className="p-4 rounded-lg border border-[#E5E7EB] bg-white"
                    >
                      <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-5">
                          <label className="block text-xs font-medium text-[#64748B] mb-1">
                            Description *
                          </label>
                          <DescriptionAutocomplete
                            value={line.description}
                            onChange={(value) =>
                              handleLineChange(line.id, "description", value)
                            }
                            onSelectLine={(savedLine) => {
                              handleLineChange(line.id, "unitPrice", savedLine.unitPrice);
                              handleLineChange(line.id, "taxRate", savedLine.taxRate);
                            }}
                            onSaveNewLine={handleSaveNewLine}
                            defaultUnitPrice={line.unitPrice}
                            defaultTaxRate={line.taxRate}
                            placeholder="Description de la prestation..."
                            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1 ${
                                errors[`line_${line.id}_description`]
                                  ? "border-red-500"
                                  : "border-[#E5E7EB] focus:border-[#F97316]"
                              }`}
                          />
                          {errors[`line_${line.id}_description`] && (
                            <p className="text-xs text-red-500 mt-1">
                              {errors[`line_${line.id}_description`]}
                            </p>
                          )}
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-[#64748B] mb-1">
                            Quantité *
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
                            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1 ${
                                errors[`line_${line.id}_quantity`]
                                  ? "border-red-500"
                                  : "border-[#E5E7EB] focus:border-[#F97316]"
                              }`}
                            required
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-[#64748B] mb-1">
                            Prix unitaire HT *
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
                            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1 ${
                                errors[`line_${line.id}_unitPrice`]
                                  ? "border-red-500"
                                  : "border-[#E5E7EB] focus:border-[#F97316]"
                              }`}
                            required
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
                            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1 ${
                                errors[`line_${line.id}_taxRate`]
                                  ? "border-red-500"
                                  : "border-[#E5E7EB] focus:border-[#F97316]"
                              }`}
                          >
                            {VALID_TVA_RATES.map((rate) => (
                              <option key={rate} value={rate}>
                                {rate}%
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-1 flex items-end">
                          {formData.lines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveLine(line.id)}
                              className="text-red-600 hover:text-red-700 text-lg font-bold"
                              title="Supprimer cette ligne"
                            >
                              ×
                            </button>
                          )}
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
              <div className="bg-[#F9FAFB] p-4 rounded-lg border border-[#E5E7EB]">
                <h3 className="text-lg font-semibold text-[#0F172A] mb-3">Résumé</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748B]">Sous-total HT</span>
                    <span className="font-medium text-[#0F172A]">{formatAmount(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748B]">TVA</span>
                    <span className="font-medium text-[#0F172A]">{formatAmount(tax)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-[#E5E7EB]">
                    <span className="text-[#0F172A]">Montant de l'avoir</span>
                    <span className={`${total > invoiceTotal ? "text-red-600" : "text-[#0F172A]"}`}>
                      {formatAmount(total)}
                    </span>
                  </div>
                  {originalInvoice && (
                    <div className="flex justify-between text-sm pt-2 border-t border-[#E5E7EB]">
                      <span className="text-[#64748B]">Montant facture originale</span>
                      <span className="font-medium text-[#0F172A]">{formatAmount(invoiceTotal)}</span>
                    </div>
                  )}
                </div>
                {errors.credit_amount && (
                  <p className="text-xs text-red-500 mt-2">{errors.credit_amount}</p>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Notes (optionnel)
                </label>
                <textarea
                  value={formData.notes || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  placeholder="Notes additionnelles..."
                />
              </div>

              {/* Boutons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || total > invoiceTotal}
                  className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-6 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
                >
                  {isSubmitting ? "Création..." : "Créer l'avoir"}
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
