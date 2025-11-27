"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageTitle } from "@/components/layout/PageTitle";
import { Invoice, BillingLine, BillingHistoryEvent, BillingTimelineEvent } from "@/components/billing/types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { calculateSubtotal, calculateTax, calculateTotal, calculateLineTotal, formatAmount, generateInvoiceNumber } from "@/components/billing/utils";
import { DescriptionAutocomplete } from "@/components/billing/DescriptionAutocomplete";
import { useAuth } from "@/hooks/useAuth";

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get("quote"); // Si converti depuis un devis
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  // TODO: Récupérer depuis le backend
  const mockClients = [
    { id: 1, name: "Boulangerie Soleil" },
    { id: 2, name: "Mme Dupont" },
    { id: 3, name: "M. Martin" },
    { id: 4, name: "Salon Beauté" },
  ];

  const mockProjects = [
    { id: 1, name: "Rénovation cuisine", client_id: 3 },
    { id: 2, name: "Installation équipement", client_id: 1 },
    { id: 3, name: "Projet beauté", client_id: 2 },
  ];

  const duplicateId = searchParams.get("duplicate");

  // Si on convertit depuis un devis, charger les données du devis
  useEffect(() => {
    if (quoteId) {
      // TODO: Charger le devis depuis le backend
      // Pour l'instant, on simule avec des données mock
      const mockQuote = {
        client_id: 1,
        project_id: 2,
        lines: [
          {
            id: Date.now(),
            description: "Prestation de service - Installation",
            quantity: 1,
            unitPrice: 1250,
            taxRate: 20,
          },
        ],
        notes: "Installation prévue pour le 15 février 2025.",
        conditions: "Paiement à 30 jours. Garantie 1 an.",
      };

      setFormData({
        client_id: mockQuote.client_id,
        project_id: mockQuote.project_id,
        lines: mockQuote.lines,
        notes: mockQuote.notes,
        conditions: mockQuote.conditions,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // +30 jours
        status: "brouillon",
      });
    } else if (duplicateId) {
      // Si on duplique une facture, charger les données
      // TODO: Charger la facture depuis le backend
      const mockInvoiceToDuplicate = {
        client_id: Number(searchParams.get("client")) || 1,
        project_id: searchParams.get("project") ? Number(searchParams.get("project")) : undefined,
        lines: [
          {
            id: Date.now(),
            description: "Prestation de service - Installation",
            quantity: 1,
            unitPrice: 1250,
            taxRate: 20,
          },
          {
            id: Date.now() + 1,
            description: "Matériel supplémentaire",
            quantity: 2,
            unitPrice: 150,
            taxRate: 20,
          },
        ],
        notes: "Facture suite à l'acceptation du devis.",
        conditions: "Paiement à 30 jours. Sans paiement, pénalités de retard.",
      };

      setFormData({
        client_id: mockInvoiceToDuplicate.client_id,
        project_id: mockInvoiceToDuplicate.project_id,
        lines: mockInvoiceToDuplicate.lines.map((line) => ({
          ...line,
          id: Date.now() + Math.random(), // Nouveaux IDs pour les lignes
        })),
        notes: mockInvoiceToDuplicate.notes,
        conditions: mockInvoiceToDuplicate.conditions,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // +30 jours
        status: "brouillon", // Toujours en brouillon pour une duplication
      });
    }
  }, [quoteId, duplicateId, searchParams]);

  const [formData, setFormData] = useState<{
    client_id: number;
    project_id?: number;
    lines: BillingLine[];
    notes?: string;
    conditions?: string;
    due_date: string;
    status: Invoice["status"];
  }>({
    client_id: 0,
    lines: [
      {
        id: Date.now(),
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 20,
      },
    ],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // +30 jours par défaut
    status: "brouillon",
  });

  const subtotal = calculateSubtotal(formData.lines);
  const tax = calculateTax(formData.lines);
  const total = calculateTotal(formData.lines);

  const handleLineChange = (lineId: number, field: keyof BillingLine, value: string | number) => {
    const updatedLines = formData.lines.map((line) =>
      line.id === lineId ? { ...line, [field]: value } : line
    );
    setFormData({ ...formData, lines: updatedLines });
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
    setFormData({
      ...formData,
      lines: formData.lines.filter((line) => line.id !== lineId),
    });
  };

  // Fonction pour sauvegarder une nouvelle ligne dans la base de données
  const handleSaveNewLine = async (description: string, unitPrice: number, taxRate: number) => {
    // TODO: Appel API pour sauvegarder la nouvelle ligne
    console.log("Sauvegarder nouvelle ligne:", { description, unitPrice, taxRate });
  };

  const handleSave = async (saveAsDraft: boolean = false) => {
    if (!formData.client_id) {
      alert("Veuillez sélectionner un client");
      return;
    }

    if (formData.lines.some((line) => !line.description || line.unitPrice === 0)) {
      alert("Veuillez remplir toutes les lignes avec une description et un prix");
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const userName = user?.full_name || user?.email || "Utilisateur";
      const selectedClient = mockClients.find((c) => c.id === formData.client_id);
      const selectedProject = formData.project_id
        ? mockProjects.find((p) => p.id === formData.project_id)
        : undefined;

      // Générer le numéro (TODO: Récupérer le dernier numéro depuis le backend)
      const invoiceNumber = generateInvoiceNumber(16, 2025); // Mock: dernier numéro était 16

      const historyEvent: BillingHistoryEvent = {
        id: Date.now(),
        timestamp: now,
        action: "Facture créée",
        description: quoteId ? `Convertie depuis devis #${quoteId}` : undefined,
        user: userName,
      };

      const timelineEvent: BillingTimelineEvent = {
        id: Date.now(),
        timestamp: now,
        action: "Facture créée",
        user: userName,
      };

      const newInvoice: Invoice = {
        id: Date.now(),
        number: invoiceNumber,
        quote_id: quoteId ? Number(quoteId) : undefined,
        client_id: formData.client_id,
        client_name: selectedClient?.name || "",
        project_id: formData.project_id,
        project_name: selectedProject?.name,
        status: saveAsDraft ? "brouillon" : formData.status,
        lines: formData.lines,
        subtotal,
        tax,
        total,
        amount_paid: 0,
        amount_remaining: total,
        notes: formData.notes,
        conditions: formData.conditions,
        created_at: now,
        due_date: formData.due_date,
        timeline: [timelineEvent],
        history: [historyEvent],
      };

      console.log("Create invoice:", newInvoice);
      await new Promise((resolve) => setTimeout(resolve, 500));

      router.push(`/app/billing/invoices/${newInvoice.id}`);
    } catch (error) {
      console.error("Error creating invoice:", error);
      alert("Erreur lors de la création de la facture");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageTitle title="Créer une facture" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/app/billing/invoices")}
            className="text-sm text-[#64748B] hover:text-[#0F172A]"
          >
            ← Retour à la liste
          </button>
        </div>

        {quoteId && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              💡 Conversion depuis le devis #{quoteId}. Les informations ont été pré-remplies.
            </p>
          </div>
        )}
        {duplicateId && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              📋 Duplication de la facture #{duplicateId}. Les informations ont été pré-remplies.
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold text-[#0F172A]">
              Créer une nouvelle facture
            </h1>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bloc 1 : Infos client */}
            <div>
              <h2 className="text-lg font-semibold text-[#0F172A] mb-4">
                Informations client
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Client *
                  </label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => {
                      const clientId = Number(e.target.value);
                      setFormData({
                        ...formData,
                        client_id: clientId,
                        project_id: undefined,
                      });
                    }}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    required
                  >
                    <option value="0">Sélectionner un client</option>
                    {mockClients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => router.push("/app/clients?new=true")}
                    className="mt-2 text-xs text-[#F97316] hover:text-[#EA580C]"
                  >
                    + Ajouter un nouveau client
                  </button>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Date d'échéance *
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) =>
                      setFormData({ ...formData, due_date: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    required
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Projet (optionnel)
                </label>
                <select
                  value={formData.project_id || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      project_id: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                >
                  <option value="">Aucun projet</option>
                  {mockProjects
                    .filter((p) => !formData.client_id || p.client_id === formData.client_id)
                    .map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Bloc 2 : Lignes de la facture */}
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
                          className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-[#64748B] mb-1">
                          Prix unitaire *
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
                          required
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
                        {formData.lines.length > 1 && (
                          <button
                            onClick={() => handleRemoveLine(line.id)}
                            className="text-red-600 hover:text-red-700 text-sm font-bold"
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

            {/* Bloc 3 : Résumé */}
            <div className="bg-[#F9FAFB] p-6 rounded-lg border border-[#E5E7EB]">
              <h2 className="text-lg font-semibold text-[#0F172A] mb-4">
                Résumé
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748B]">Sous-total HT</span>
                  <span className="font-medium text-[#0F172A]">
                    {formatAmount(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748B]">TVA</span>
                  <span className="font-medium text-[#0F172A]">
                    {formatAmount(tax)}
                  </span>
                </div>
                <div className="flex justify-between text-xl font-bold pt-3 border-t-2 border-[#E5E7EB]">
                  <span className="text-[#0F172A]">Total TTC</span>
                  <span className="text-[#0F172A]">
                    {formatAmount(total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bloc 4 : Notes & Conditions */}
            <div>
              <h2 className="text-lg font-semibold text-[#0F172A] mb-4">
                Notes & Conditions
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Notes (optionnel)
                  </label>
                  <textarea
                    value={formData.notes || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={4}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    placeholder="Notes internes ou informations supplémentaires..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Conditions (optionnel)
                  </label>
                  <textarea
                    value={formData.conditions || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, conditions: e.target.value })
                    }
                    rows={4}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    placeholder="Conditions de paiement, garantie, délais..."
                  />
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex justify-end gap-3 pt-6 border-t border-[#E5E7EB]">
              <button
                onClick={() => router.push("/app/billing/invoices")}
                className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
              >
                Annuler
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={isSaving}
                className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB] disabled:opacity-60"
              >
                {isSaving ? "Enregistrement..." : "Enregistrer comme brouillon"}
              </button>
              <button
                onClick={() => {
                  setFormData({ ...formData, status: "envoyée" });
                  handleSave(false);
                }}
                disabled={isSaving}
                className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-6 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60"
              >
                {isSaving ? "Création..." : "Créer et envoyer"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

