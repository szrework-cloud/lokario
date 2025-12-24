"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageTitle } from "@/components/layout/PageTitle";
import { Quote, BillingLine, BillingHistoryEvent, BillingTimelineEvent } from "@/components/billing/types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { calculateSubtotal, calculateTax, calculateTotal, calculateLineTotal, formatAmount, generateQuoteNumber } from "@/components/billing/utils";
import { DescriptionAutocomplete } from "@/components/billing/DescriptionAutocomplete";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { getClients } from "@/services/clientsService";
import { getQuote, updateQuote, Quote as QuoteAPI } from "@/services/quotesService";
import { createBillingLineTemplate } from "@/services/billingLineTemplatesService";

export default function EditQuotePage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = Number(params.id);
  const { user, token } = useAuth();
  const { settings } = useSettings(false); // Ne pas auto-load, déjà chargé dans AppLayout
  const [error, setError] = useState<string | null>(null);

  // Taux de TVA par défaut (les settings n'ont pas encore de section billing)
  const taxRates = [0, 2.1, 5.5, 10, 20];

  // TODO: Récupérer depuis le backend
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadQuote = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await getQuote(token, quoteId);
        
        console.log("[EDIT QUOTE] Données reçues du backend:", data);
        console.log("[EDIT QUOTE] Lignes reçues:", data.lines);
        
        // Adapter les données du backend au format frontend
        const adaptedQuote: Quote = {
          ...data,
          client_name: data.client_name || "",
          lines: (data.lines || []).map((line) => ({
            id: line.id || 0,
            description: line.description || "",
            quantity: line.quantity || 1,
            unit: line.unit || "",
            unitPrice: line.unit_price_ht || 0,
            taxRate: line.tax_rate || 0,
            total: line.total_ttc || 0,
          })),
          subtotal: data.subtotal_ht || 0,
          tax: data.total_tax || 0,
          total: data.total_ttc || data.amount || 0,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          discount_label: data.discount_label,
          timeline: [],
          history: [],
        };
        
        console.log("[EDIT QUOTE] Quote adapté:", adaptedQuote);
        console.log("[EDIT QUOTE] Nombre de lignes:", adaptedQuote.lines.length);
        
        setQuote(adaptedQuote);
      } catch (err: any) {
        console.error("Erreur lors du chargement du devis:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuote();
  }, [quoteId, token]);

  const handleLineChange = (lineId: number, field: keyof BillingLine, value: string | number) => {
    if (!quote) return;
    
    const updatedLines = quote.lines.map((line) =>
      line.id === lineId ? { ...line, [field]: value } : line
    );

    // Recalculer les totaux
    const subtotal = calculateSubtotal(updatedLines);
    const tax = calculateTax(updatedLines);
    const total = calculateTotal(updatedLines);

    setQuote({
      ...quote,
      lines: updatedLines,
      subtotal,
      tax,
      total,
    });
  };

  const handleAddLine = () => {
    if (!quote) return;
    
    const newLine: BillingLine = {
      id: Date.now(),
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: 20,
    };

    const updatedLines = [...quote.lines, newLine];
    const subtotal = calculateSubtotal(updatedLines);
    const tax = calculateTax(updatedLines);
    const total = calculateTotal(updatedLines);

    setQuote({
      ...quote,
      lines: updatedLines,
      subtotal,
      tax,
      total,
    });
  };

  const handleRemoveLine = (lineId: number) => {
    if (!quote) return;
    
    const updatedLines = quote.lines.filter((line) => line.id !== lineId);
    const subtotal = calculateSubtotal(updatedLines);
    const tax = calculateTax(updatedLines);
    const total = calculateTotal(updatedLines);

    setQuote({
      ...quote,
      lines: updatedLines,
      subtotal,
      tax,
      total,
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

  const handleSave = async (status: Quote["status"]) => {
    if (!quote || !token) return;

    setIsSaving(true);
    setError(null);
    
    try {
      // Préparer les données pour l'API
      const updateData = {
        lines: quote.lines.map((line, index) => ({
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unit_price_ht: line.unitPrice,
          tax_rate: line.taxRate,
          order: index,
        })),
        notes: quote.notes,
        conditions: quote.conditions,
        valid_until: quote.valid_until,
        service_start_date: quote.service_start_date,
        execution_duration: quote.execution_duration,
        discount_type: quote.discount_type,
        discount_value: quote.discount_value,
        discount_label: quote.discount_label,
        status: status,
      };

      // Appeler l'API pour mettre à jour le devis
      await updateQuote(token, quote.id, updateData);

      // Rediriger vers la page de détail
      router.push(`/app/billing/quotes/${quote.id}`);
    } catch (err: any) {
      console.error("Error saving quote:", err);
      setError(err.message || "Erreur lors de la sauvegarde du devis");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <PageTitle title="Modifier le devis" />
        <div className="space-y-6">
          <div className="flex items-center justify-center p-8">
            <div className="text-[#64748B]">Chargement du devis...</div>
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

  if (!quote) {
    return (
      <>
        <PageTitle title="Devis introuvable" />
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-slate-600">Le devis demandé n'existe pas.</p>
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

  return (
    <>
      <PageTitle title={`Modifier ${quote.number}`} />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push(`/app/billing/quotes/${quote.id}`)}
            className="text-sm text-[#64748B] hover:text-[#0F172A]"
          >
            ← Retour au devis
          </button>
        </div>

        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold text-[#0F172A]">
              Modifier le devis {quote.number}
            </h1>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Infos client */}
            <div>
              <h2 className="text-lg font-semibold text-[#0F172A] mb-4">
                Informations client
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Client
                  </label>
                  <input
                    type="text"
                    value={quote.client_name}
                    readOnly
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm bg-[#F9FAFB] text-[#64748B]"
                  />
                </div>
                {quote.project_name && (
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1">
                      Projet
                    </label>
                    <input
                      type="text"
                      value={quote.project_name}
                      readOnly
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm bg-[#F9FAFB] text-[#64748B]"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Lignes du devis */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#0F172A]">
                  Lignes du devis
                </h2>
                <button
                  onClick={handleAddLine}
                  className="text-sm text-[#F97316] hover:text-[#EA580C] font-medium"
                >
                  + Ajouter une ligne
                </button>
              </div>
              {quote.lines.length === 0 ? (
                <div className="text-center py-8 text-[#64748B]">
                  <p className="text-sm">Aucune ligne dans ce devis.</p>
                  <p className="text-xs mt-2">Cliquez sur "+ Ajouter une ligne" pour en ajouter une.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {quote.lines.map((line) => (
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
              )}
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
                    {formatAmount(quote.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748B]">TVA</span>
                  <span className="font-medium text-[#0F172A]">
                    {formatAmount(quote.tax)}
                  </span>
                </div>
                {quote.discount_type && quote.discount_value && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#64748B] italic">
                      {quote.discount_label || "Réduction"}
                      {quote.discount_type === "percentage" && ` (${quote.discount_value}%)`}
                    </span>
                    <span className="font-medium text-red-600 italic">
                      -{formatAmount(
                        quote.discount_type === "percentage"
                          ? ((quote.subtotal + quote.tax) * quote.discount_value) / 100
                          : quote.discount_value
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-[#E5E7EB]">
                  <span className="text-[#0F172A]">Total TTC</span>
                  <span className="text-[#0F172A]">
                    {formatAmount(quote.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Réduction/Escompte */}
            <div>
              <h2 className="text-lg font-semibold text-[#0F172A] mb-4">
                Réduction / Escompte
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Type de réduction
                  </label>
                  <select
                    value={quote.discount_type || ""}
                    onChange={(e) =>
                      setQuote({
                        ...quote,
                        discount_type: e.target.value as "percentage" | "fixed" | null,
                        discount_value: e.target.value ? quote.discount_value : null,
                      })
                    }
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  >
                    <option value="">Aucune réduction</option>
                    <option value="percentage">Pourcentage (%)</option>
                    <option value="fixed">Montant fixe (€)</option>
                  </select>
                </div>
                {quote.discount_type && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-1">
                        {quote.discount_type === "percentage" ? "Pourcentage (%)" : "Montant (€)"}
                      </label>
                      <input
                        type="number"
                        step={quote.discount_type === "percentage" ? "0.01" : "0.01"}
                        min="0"
                        value={quote.discount_value || ""}
                        onChange={(e) =>
                          setQuote({
                            ...quote,
                            discount_value: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                        className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                        placeholder={quote.discount_type === "percentage" ? "10" : "50.00"}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-1">
                        Libellé (optionnel)
                      </label>
                      <input
                        type="text"
                        value={quote.discount_label || ""}
                        onChange={(e) =>
                          setQuote({ ...quote, discount_label: e.target.value || null })
                        }
                        className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                        placeholder="Ex: Remise commerciale, Escompte 2%..."
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Notes & Conditions */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Notes
                </label>
                <textarea
                  value={quote.notes || ""}
                  onChange={(e) =>
                    setQuote({ ...quote, notes: e.target.value })
                  }
                  rows={4}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  placeholder="Notes internes..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Conditions
                </label>
                <textarea
                  value={quote.conditions || ""}
                  onChange={(e) =>
                    setQuote({ ...quote, conditions: e.target.value })
                  }
                  rows={4}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  placeholder="Conditions de paiement, garantie..."
                />
              </div>
            </div>

            {/* Statut */}
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Statut
              </label>
              <select
                value={quote.status}
                onChange={(e) =>
                  setQuote({
                    ...quote,
                    status: e.target.value as Quote["status"],
                  })
                }
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              >
                <option value="brouillon">Brouillon</option>
                <option value="envoyé">Envoyé</option>
                <option value="accepté">Accepté</option>
                <option value="refusé">Refusé</option>
              </select>
            </div>

            {/* Boutons d'action */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
              <button
                onClick={() => router.push(`/app/billing/quotes/${quote.id}`)}
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
                onClick={() => handleSave(quote.status)}
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

