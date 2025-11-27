"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { PageTitle } from "@/components/layout/PageTitle";
import { Quote, BillingLine, BillingHistoryEvent, BillingTimelineEvent } from "@/components/billing/types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { calculateSubtotal, calculateTax, calculateTotal, calculateLineTotal, formatAmount, generateQuoteNumber } from "@/components/billing/utils";
import { DescriptionAutocomplete } from "@/components/billing/DescriptionAutocomplete";
import { useAuth } from "@/hooks/useAuth";

export default function EditQuotePage() {
  const router = useRouter();
  const params = useParams();
  const quoteId = Number(params.id);
  const { user } = useAuth();

  // TODO: Récupérer depuis le backend
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Simuler le chargement
    setTimeout(() => {
      const mockQuote: Quote = {
        id: 1,
        number: "DEV-2025-023",
        client_id: 1,
        client_name: "Boulangerie Soleil",
        project_id: 2,
        project_name: "Installation équipement",
        status: "brouillon",
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
        notes: "Installation prévue pour le 15 février 2025.",
        conditions: "Paiement à 30 jours. Garantie 1 an.",
        created_at: "2025-01-15T10:00:00",
        timeline: [
          {
            id: 1,
            timestamp: "2025-01-15T10:00:00",
            action: "Devis créé",
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
        ],
      };
      setQuote(mockQuote);
      setIsLoading(false);
    }, 300);
  }, [quoteId]);

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
  const handleSaveNewLine = async (description: string, unitPrice: number, taxRate: number) => {
    // TODO: Appel API pour sauvegarder la nouvelle ligne
    console.log("Sauvegarder nouvelle ligne:", { description, unitPrice, taxRate });
  };

  const handleSave = async (status: Quote["status"]) => {
    if (!quote) return;

    setIsSaving(true);
    try {
      // Créer les événements d'historique et timeline
      const now = new Date().toISOString();
      const userName = user?.full_name || user?.email || "Utilisateur";

      // Événement historique
      const historyEvent: BillingHistoryEvent = {
        id: Date.now(),
        timestamp: now,
        action: "Devis modifié",
        description: `Statut: ${status}`,
        user: userName,
      };

      // Événement timeline (si le statut change)
      let timelineEvent: BillingTimelineEvent | null = null;
      if (quote.status !== status) {
        timelineEvent = {
          id: Date.now(),
          timestamp: now,
          action: `Statut changé: ${status}`,
          description: `De '${quote.status}' à '${status}'`,
          user: userName,
        };
      }

      // Mettre à jour le devis avec les nouveaux événements
      const updatedQuote: Quote = {
        ...quote,
        status,
        history: [...quote.history, historyEvent],
        timeline: timelineEvent ? [...quote.timeline, timelineEvent] : quote.timeline,
      };

      // TODO: Appel API pour sauvegarder
      console.log("Save quote:", updatedQuote);

      // Simuler un délai
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Rediriger vers la page de détail
      router.push(`/app/billing/quotes/${quote.id}`);
    } catch (error) {
      console.error("Error saving quote:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !quote) {
    return (
      <>
        <PageTitle title="Modifier le devis" />
        <div className="space-y-6">
          <p className="text-slate-600">Chargement...</p>
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
                    {formatAmount(quote.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748B]">TVA</span>
                  <span className="font-medium text-[#0F172A]">
                    {formatAmount(quote.tax)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-[#E5E7EB]">
                  <span className="text-[#0F172A]">Total TTC</span>
                  <span className="text-[#0F172A]">
                    {formatAmount(quote.total)}
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

