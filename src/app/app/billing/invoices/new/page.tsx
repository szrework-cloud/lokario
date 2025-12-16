"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageTitle } from "@/components/layout/PageTitle";
import { Invoice, BillingLine, BillingHistoryEvent, BillingTimelineEvent } from "@/components/billing/types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { calculateSubtotal, calculateTax, calculateTotal, calculateLineTotal, formatAmount, generateInvoiceNumber } from "@/components/billing/utils";
import { DescriptionAutocomplete } from "@/components/billing/DescriptionAutocomplete";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { getClients } from "@/services/clientsService";
import { getInvoice } from "@/services/invoicesService";
import { createInvoice, InvoiceCreate } from "@/services/invoicesService";
import { getQuote } from "@/services/quotesService";
import { createBillingLineTemplate } from "@/services/billingLineTemplatesService";

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get("quote"); // Si converti depuis un devis
  const { user, token } = useAuth();
  const { settings, company } = useSettings(false); // Ne pas auto-load, déjà chargé dans AppLayout

  // Vérifier si l'entreprise est auto-entrepreneur
  const isAutoEntrepreneurValue = (company as any)?.is_auto_entrepreneur;
  const isAutoEntrepreneur = isAutoEntrepreneurValue === true || 
                             isAutoEntrepreneurValue === 1 || 
                             isAutoEntrepreneurValue === "true" ||
                             String(isAutoEntrepreneurValue).toLowerCase() === "true";

  // Taux de TVA par défaut (les settings n'ont pas encore de section billing)
  // Si auto-entrepreneur, forcer à [0] uniquement
  const taxRates = isAutoEntrepreneur 
    ? [0] 
    : [0, 2.1, 5.5, 10, 20];

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Array<{ id: number; name: string }>>([]);
  const [projects] = useState<Array<{ id: number; name: string; client_id: number }>>([]);

  // Charger les clients depuis le backend
  useEffect(() => {
    const loadClients = async () => {
      if (!token) return;
      
      try {
        const clientsData = await getClients(token);
        setClients(clientsData.map(c => ({ id: c.id, name: c.name })));
      } catch (err) {
        console.error("Erreur lors du chargement des clients:", err);
        // En cas d'erreur, on continue avec une liste vide
      }
    };
    
    loadClients();
  }, [token]);
  
  // TODO: Charger les projets depuis le backend (quand l'API sera disponible)

  const duplicateId = searchParams.get("duplicate");

  // Si on convertit depuis un devis, charger les données du devis
  useEffect(() => {
    const loadData = async () => {
      if (!token) return;
      
      if (quoteId) {
        // Charger le devis depuis le backend pour pré-remplir le formulaire
        try {
          const quoteToConvert = await getQuote(token, Number(quoteId));
          
          // Adapter les lignes du format backend au format frontend
          const adaptedLines: BillingLine[] = (quoteToConvert.lines || []).map((line) => ({
            id: Date.now() + Math.random(), // Nouveaux IDs pour les lignes
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unit_price_ht,
            taxRate: line.tax_rate,
            total: line.total_ttc,
          }));

          setFormData({
            client_id: quoteToConvert.client_id,
            project_id: quoteToConvert.project_id,
            lines: adaptedLines,
            notes: quoteToConvert.notes || "",
            conditions: quoteToConvert.conditions || "",
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // +30 jours par défaut
            status: "brouillon", // Toujours en brouillon pour une conversion
          });
        } catch (err) {
          console.error("Erreur lors du chargement du devis à convertir:", err);
          // En cas d'erreur, on continue avec les paramètres de l'URL
          const clientId = Number(searchParams.get("client")) || 0;
          const projectId = searchParams.get("project") ? Number(searchParams.get("project")) : undefined;
          
          if (clientId > 0) {
            setFormData(prev => ({
              ...prev,
              client_id: clientId,
              project_id: projectId,
            }));
          }
        }
      } else if (duplicateId) {
        // Si on duplique une facture, charger les données depuis le backend
        try {
          const invoiceToDuplicate = await getInvoice(token, Number(duplicateId));
          
          // Adapter les lignes du format backend au format frontend
          const adaptedLines: BillingLine[] = (invoiceToDuplicate.lines || []).map((line) => ({
            id: Date.now() + Math.random(), // Nouveaux IDs pour les lignes
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unit_price_ht,
            taxRate: line.tax_rate,
            total: line.total_ttc,
          }));

          // Valider operation_category
          const validOperationCategory = invoiceToDuplicate.operation_category &&
            (invoiceToDuplicate.operation_category === "vente" ||
             invoiceToDuplicate.operation_category === "prestation" ||
             invoiceToDuplicate.operation_category === "les deux")
            ? invoiceToDuplicate.operation_category as "vente" | "prestation" | "les deux"
            : undefined;

          setFormData({
            client_id: invoiceToDuplicate.client_id,
            project_id: invoiceToDuplicate.project_id,
            lines: adaptedLines,
            notes: invoiceToDuplicate.notes || "",
            conditions: invoiceToDuplicate.conditions || "",
            due_date: invoiceToDuplicate.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            status: "brouillon", // Toujours en brouillon pour une duplication
            payment_terms: invoiceToDuplicate.payment_terms,
            late_penalty_rate: invoiceToDuplicate.late_penalty_rate,
            recovery_fee: invoiceToDuplicate.recovery_fee,
            vat_applicable: invoiceToDuplicate.vat_applicable,
            vat_on_debit: invoiceToDuplicate.vat_on_debit,
            operation_category: validOperationCategory,
            vat_exemption_reference: invoiceToDuplicate.vat_exemption_reference,
            seller_name: invoiceToDuplicate.seller_name,
            seller_address: invoiceToDuplicate.seller_address,
            seller_siren: invoiceToDuplicate.seller_siren,
            seller_siret: invoiceToDuplicate.seller_siret,
            seller_vat_number: invoiceToDuplicate.seller_vat_number,
            seller_rcs: invoiceToDuplicate.seller_rcs,
            seller_legal_form: invoiceToDuplicate.seller_legal_form,
            seller_capital: invoiceToDuplicate.seller_capital,
            client_name: invoiceToDuplicate.client_name,
            client_address: invoiceToDuplicate.client_address,
            client_siren: invoiceToDuplicate.client_siren,
            client_delivery_address: invoiceToDuplicate.client_delivery_address,
            issue_date: invoiceToDuplicate.issue_date,
            sale_date: invoiceToDuplicate.sale_date,
          });
        } catch (err) {
          console.error("Erreur lors du chargement de la facture à dupliquer:", err);
          // En cas d'erreur, on continue avec les paramètres de l'URL
          const clientId = Number(searchParams.get("client")) || 0;
          const projectId = searchParams.get("project") ? Number(searchParams.get("project")) : undefined;
          
          if (clientId > 0) {
            setFormData(prev => ({
              ...prev,
              client_id: clientId,
              project_id: projectId,
            }));
          }
        }
      }
    };
    
    loadData();
  }, [quoteId, duplicateId, searchParams, token]);

  const [formData, setFormData] = useState<{
    client_id: number;
    project_id?: number;
    lines: BillingLine[];
    notes?: string;
    conditions?: string;
    due_date: string;
    status: Invoice["status"];
    payment_terms?: string;
    late_penalty_rate?: number;
    recovery_fee?: number;
    vat_applicable?: boolean;
    vat_on_debit?: boolean;
    operation_category?: "vente" | "prestation" | "les deux";
    vat_exemption_reference?: string;
    seller_name?: string;
    seller_address?: string;
    seller_siren?: string;
    seller_siret?: string;
    seller_vat_number?: string;
    seller_rcs?: string;
    seller_legal_form?: string;
    seller_capital?: number;
    client_name?: string;
    client_address?: string;
    client_siren?: string;
    client_delivery_address?: string;
    issue_date?: string;
    sale_date?: string;
  }>({
    client_id: 0,
    lines: [
      {
        id: Date.now(),
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: isAutoEntrepreneur ? 0 : 20, // 0% si auto-entrepreneur
      },
    ],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // +30 jours par défaut
    status: "brouillon",
  });

  // Forcer toutes les lignes à 0% de TVA si auto-entrepreneur
  useEffect(() => {
    if (isAutoEntrepreneur) {
      setFormData(prev => ({
        ...prev,
        lines: prev.lines.map(line => ({
          ...line,
          taxRate: 0
        }))
      }));
    }
  }, [isAutoEntrepreneur]);

  const subtotal = calculateSubtotal(formData.lines);
  const tax = calculateTax(formData.lines);
  const total = calculateTotal(formData.lines);

  const handleLineChange = (lineId: number, field: keyof BillingLine, value: string | number) => {
    // Si auto-entrepreneur et qu'on essaie de modifier le taux de TVA, forcer à 0
    if (field === "taxRate" && isAutoEntrepreneur) {
      value = 0;
      // Mettre à jour toutes les lignes à 0
      const correctedLines = formData.lines.map((line) => ({
        ...line,
        taxRate: 0
      }));
      setFormData({ ...formData, lines: correctedLines });
      return;
    }
    
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
      taxRate: isAutoEntrepreneur ? 0 : 20, // 0% si auto-entrepreneur
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

  const handleSave = async (saveAsDraft: boolean = false) => {
    if (!token) {
      setError("Non authentifié");
      return;
    }

    if (!formData.client_id) {
      setError("Veuillez sélectionner un client");
      return;
    }

    if (formData.lines.some((line) => !line.description || line.unitPrice === 0)) {
      setError("Veuillez remplir toutes les lignes avec une description et un prix");
      return;
    }

    setIsSaving(true);
    setError(null);
    
    try {
      // Préparer les données pour l'API
      const invoiceData: InvoiceCreate = {
        client_id: formData.client_id,
        project_id: formData.project_id,
        quote_id: quoteId ? Number(quoteId) : undefined,
        issue_date: new Date().toISOString().split("T")[0],
        due_date: formData.due_date,
        sale_date: formData.sale_date ? new Date(formData.sale_date).toISOString().split("T")[0] : undefined,
        lines: formData.lines.map((line, index) => ({
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unit_price_ht: line.unitPrice,
          tax_rate: line.taxRate,
          order: index,
        })),
        notes: formData.notes,
        conditions: formData.conditions,
        payment_terms: formData.payment_terms,
        late_penalty_rate: formData.late_penalty_rate,
        recovery_fee: formData.recovery_fee,
        vat_applicable: formData.vat_applicable ?? true,
        vat_on_debit: formData.vat_on_debit ?? false,
        operation_category: formData.operation_category,
        vat_exemption_reference: formData.vat_exemption_reference,
        seller_name: formData.seller_name,
        seller_address: formData.seller_address,
        seller_siren: formData.seller_siren,
        seller_siret: formData.seller_siret,
        seller_vat_number: formData.seller_vat_number,
        seller_rcs: formData.seller_rcs,
        seller_legal_form: formData.seller_legal_form,
        seller_capital: formData.seller_capital,
        client_name: formData.client_name,
        client_address: formData.client_address,
        client_siren: formData.client_siren,
        client_delivery_address: formData.client_delivery_address,
      };

      // Appeler l'API pour créer la facture
      const createdInvoice = await createInvoice(token, invoiceData);

      // Rediriger vers la page de détail de la facture créée
      router.push(`/app/billing/invoices/${createdInvoice.id}`);
    } catch (err: any) {
      console.error("Error creating invoice:", err);
      setError(err.message || "Erreur lors de la création de la facture");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageTitle title="Créer une facture" />
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/app/billing/quotes")}
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
                    {clients.map((client) => (
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
                  {projects
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
                            // Pré-remplir le prix, l'unité et la TVA si une ligne est sélectionnée
                            handleLineChange(line.id, "unitPrice", savedLine.unitPrice);
                            if (savedLine.unit) {
                              handleLineChange(line.id, "unit", savedLine.unit);
                            }
                            // Forcer à 0% si auto-entrepreneur, sinon utiliser le taux sauvegardé
                            const taxRate = isAutoEntrepreneur ? 0 : savedLine.taxRate;
                            handleLineChange(line.id, "taxRate", taxRate);
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
                          {isAutoEntrepreneur && (
                            <span className="text-[#F97316] ml-1" title="Auto-entrepreneur : TVA non applicable">
                              (0% uniquement)
                            </span>
                          )}
                        </label>
                        {isAutoEntrepreneur ? (
                          <div className="relative">
                            <input
                              type="text"
                              value="0%"
                              readOnly
                              disabled
                              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm bg-[#F9FAFB] cursor-not-allowed opacity-60"
                            />
                            <p className="text-xs text-[#F97316] mt-1">
                              Entreprise auto-entrepreneur : TVA non applicable
                            </p>
                          </div>
                        ) : (
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
                        )}
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
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex justify-end gap-3 pt-6 border-t border-[#E5E7EB]">
              <button
                onClick={() => router.push("/app/billing/quotes")}
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

