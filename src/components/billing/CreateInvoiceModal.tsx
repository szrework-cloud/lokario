"use client";

import { useState, FormEvent, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { BillingLine } from "./types";
import { calculateSubtotal, calculateTax, calculateTotal, calculateLineTotal, formatAmount } from "./utils";
import { DescriptionAutocomplete } from "./DescriptionAutocomplete";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { getClients } from "@/services/clientsService";
import { createBillingLineTemplate } from "@/services/billingLineTemplatesService";

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InvoiceFormData) => void;
}

export interface InvoiceFormData {
  client_id: number;
  project_id?: number;
  quote_id?: number;
  
  // Informations vendeur
  seller_name?: string;
  seller_address?: string;
  seller_siren?: string;
  seller_siret?: string;
  seller_vat_number?: string;
  seller_rcs?: string;
  seller_legal_form?: string;
  seller_capital?: number;
  
  // Informations client
  client_name?: string;
  client_address?: string;
  client_siren?: string;
  client_delivery_address?: string;
  
  // Dates
  issue_date?: string;
  sale_date?: string;
  due_date?: string;
  
  // Conditions
  payment_terms?: string;
  late_penalty_rate?: number;
  recovery_fee?: number;
  
  // Mentions spéciales
  vat_on_debit?: boolean;
  vat_exemption_reference?: string;
  operation_category?: "vente" | "prestation" | "les deux";
  vat_applicable?: boolean;
  
  // Notes
  notes?: string;
  conditions?: string;
  
  // Lignes
  lines: BillingLine[];
}

// Taux de TVA par défaut (sera remplacé par les settings)
const DEFAULT_TVA_RATES = [0, 2.1, 5.5, 10, 20];

export function CreateInvoiceModal({ isOpen, onClose, onSubmit }: CreateInvoiceModalProps) {
  const { user, token } = useAuth();
  const { settings, company, reloadSettings } = useSettings(false); // Ne pas auto-load, déjà chargé dans AppLayout

  // Recharger les settings quand le modal s'ouvre pour avoir les dernières données
  useEffect(() => {
    if (isOpen && token) {
      reloadSettings();
    }
  }, [isOpen, token, reloadSettings]);

  // Vérifier si l'entreprise est auto-entrepreneur
  // Vérifier plusieurs formats possibles (true, "true", 1, etc.)
  const isAutoEntrepreneurValue = (company as any)?.is_auto_entrepreneur;
  const isAutoEntrepreneur = isAutoEntrepreneurValue === true || 
                             isAutoEntrepreneurValue === 1 || 
                             isAutoEntrepreneurValue === "true" ||
                             String(isAutoEntrepreneurValue).toLowerCase() === "true";

  // Récupérer les taux de TVA depuis les settings
  // Si auto-entrepreneur, forcer à [0] uniquement
  const VALID_TVA_RATES = isAutoEntrepreneur 
    ? [0] 
    : DEFAULT_TVA_RATES;

  // Initialiser avec TVA à 0% si auto-entrepreneur
  const getInitialTaxRate = () => isAutoEntrepreneur ? 0 : 20;

  const [formData, setFormData] = useState<InvoiceFormData>({
    client_id: 0,
    lines: [
      {
        id: Date.now(),
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: getInitialTaxRate(),
      },
    ],
    vat_applicable: !isAutoEntrepreneur, // Désactiver TVA si auto-entrepreneur
    vat_on_debit: false,
    vat_exemption_reference: isAutoEntrepreneur ? "TVA non applicable, art. 293 B du CGI" : undefined,
    issue_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // +30 jours
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"basic" | "seller" | "client" | "conditions">("basic");

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
      }
    };
    
    loadClients();
  }, [token]);

  // Mettre à jour les lignes si l'entreprise devient auto-entrepreneur
  // Cette fonction force TOUJOURS les valeurs à 0 si auto-entrepreneur
  useEffect(() => {
    if (isAutoEntrepreneur) {
      // Forcer TOUJOURS toutes les lignes à 0% de TVA, peu importe l'état actuel
      setFormData(prev => {
        const updatedLines = prev.lines.map(line => ({
          ...line,
          taxRate: 0 // Forcer à 0
        }));
        
        return {
          ...prev,
          lines: updatedLines,
          vat_applicable: false,
          vat_exemption_reference: "TVA non applicable, art. 293 B du CGI"
        };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoEntrepreneur, isOpen]); // Réinitialiser aussi quand le modal s'ouvre

  const handleLineChange = (lineId: number, field: keyof BillingLine, value: string | number) => {
    // Si auto-entrepreneur et qu'on essaie de modifier le taux de TVA, forcer à 0 et bloquer
    if (field === "taxRate" && isAutoEntrepreneur) {
      value = 0; // Forcer à 0
      // Mettre à jour immédiatement toutes les lignes à 0
      const correctedLines = formData.lines.map((line) => ({
        ...line,
        taxRate: 0 // Toutes les lignes à 0
      }));
      setFormData(prev => ({
        ...prev,
        lines: correctedLines,
        vat_applicable: false
      }));
      return; // Sortir immédiatement, ne pas continuer
    }
    
    const updatedLines = formData.lines.map((line) =>
      line.id === lineId ? { ...line, [field]: value } : line
    );
    setFormData({ ...formData, lines: updatedLines });
    
    // Valider le taux de TVA
    if (field === "taxRate") {
      const taxRate = Number(value);
      // Si auto-entrepreneur, forcer à 0 (double vérification)
      if (isAutoEntrepreneur) {
        const correctedLines = updatedLines.map((line) => ({
          ...line,
          taxRate: 0
        }));
        setFormData(prev => ({
          ...prev,
          lines: correctedLines,
          vat_applicable: false
        }));
        return;
      }
      
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
      taxRate: isAutoEntrepreneur ? 0 : 20, // Forcer à 0% si auto-entrepreneur
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.client_id) {
      newErrors.client_id = "Veuillez sélectionner un client";
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
    
    // Validation SIREN (9 chiffres)
    if (formData.seller_siren && !/^\d{9}$/.test(formData.seller_siren)) {
      newErrors.seller_siren = "SIREN doit contenir 9 chiffres";
    }
    if (formData.client_siren && !/^\d{9}$/.test(formData.client_siren)) {
      newErrors.client_siren = "SIREN doit contenir 9 chiffres";
    }
    if (formData.seller_siret && !/^\d{14}$/.test(formData.seller_siret)) {
      newErrors.seller_siret = "SIRET doit contenir 14 chiffres";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Forcer toutes les lignes à 0% de TVA si auto-entrepreneur (sécurité finale)
    const finalFormData = isAutoEntrepreneur
      ? {
          ...formData,
          lines: formData.lines.map(line => ({ ...line, taxRate: 0 })),
          vat_applicable: false,
          vat_exemption_reference: "TVA non applicable, art. 293 B du CGI"
        }
      : formData;
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(finalFormData);
      // Réinitialiser le formulaire
      setFormData({
        client_id: 0,
        lines: [
          {
            id: Date.now(),
            description: "",
            quantity: 1,
            unitPrice: 0,
            taxRate: getInitialTaxRate(),
          },
        ],
        vat_applicable: !isAutoEntrepreneur,
        vat_on_debit: false,
        vat_exemption_reference: isAutoEntrepreneur ? "TVA non applicable, art. 293 B du CGI" : undefined,
        issue_date: new Date().toISOString().split("T")[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error("Error creating invoice:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Utiliser les lignes avec TVA forcée à 0% pour les calculs si auto-entrepreneur
  const safeLines = isAutoEntrepreneur 
    ? formData.lines.map(line => ({ ...line, taxRate: 0 }))
    : formData.lines;

  const subtotal = calculateSubtotal(safeLines);
  const tax = calculateTax(safeLines);
  const total = calculateTotal(safeLines);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#0F172A]">Créer une facture</h2>
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
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Onglets */}
            <div className="flex gap-2 border-b border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setActiveTab("basic")}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "basic"
                    ? "text-[#F97316] border-b-2 border-[#F97316]"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Informations de base
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("seller")}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "seller"
                    ? "text-[#F97316] border-b-2 border-[#F97316]"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Vendeur
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("client")}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "client"
                    ? "text-[#F97316] border-b-2 border-[#F97316]"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Client
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("conditions")}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === "conditions"
                    ? "text-[#F97316] border-b-2 border-[#F97316]"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                Conditions
              </button>
            </div>

            {/* Onglet Informations de base */}
            {activeTab === "basic" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1">
                      Client *
                    </label>
                    <select
                      required
                      value={formData.client_id}
                      onChange={(e) =>
                        setFormData({ ...formData, client_id: Number(e.target.value) })
                      }
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1 ${
                        errors.client_id
                          ? "border-red-500"
                          : "border-[#E5E7EB] focus:border-[#F97316]"
                      }`}
                    >
                      <option value={0}>Sélectionner un client</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                    {errors.client_id && (
                      <p className="text-xs text-red-500 mt-1">{errors.client_id}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1">
                      Date d'échéance *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.due_date || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, due_date: e.target.value })
                      }
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1">
                      Date d'émission
                    </label>
                    <input
                      type="date"
                      value={formData.issue_date || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, issue_date: e.target.value })
                      }
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1">
                      Date de vente/prestation
                    </label>
                    <input
                      type="date"
                      value={formData.sale_date || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, sale_date: e.target.value })
                      }
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    />
                  </div>
                </div>

                <div>
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

                {/* Lignes de facture */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[#0F172A]">
                      Lignes de la facture
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
                                if (savedLine.unit) {
                                  handleLineChange(line.id, "unit", savedLine.unit);
                                }
                                // Forcer à 0% si auto-entrepreneur, sinon utiliser le taux sauvegardé
                                const taxRate = isAutoEntrepreneur ? 0 : savedLine.taxRate;
                                handleLineChange(line.id, "taxRate", taxRate);
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
                            {errors[`line_${line.id}_quantity`] && (
                              <p className="text-xs text-red-500 mt-1">
                                {errors[`line_${line.id}_quantity`]}
                              </p>
                            )}
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
                            {errors[`line_${line.id}_unitPrice`] && (
                              <p className="text-xs text-red-500 mt-1">
                                {errors[`line_${line.id}_unitPrice`]}
                              </p>
                            )}
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
                                  className="w-full rounded-lg border px-3 py-2 text-sm border-[#E5E7EB] bg-[#F9FAFB] cursor-not-allowed opacity-60"
                                />
                                <p className="text-xs text-[#F97316] mt-1">
                                  Entreprise auto-entrepreneur : TVA non applicable
                                </p>
                              </div>
                            ) : (
                            <select
                                value={line.taxRate || 0}
                                onChange={(e) => {
                                  const newRate = parseFloat(e.target.value) || 0;
                                  handleLineChange(line.id, "taxRate", newRate);
                                }}
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
                            )}
                            {!isAutoEntrepreneur && errors[`line_${line.id}_taxRate`] && (
                              <p className="text-xs text-red-500 mt-1">
                                {errors[`line_${line.id}_taxRate`]}
                              </p>
                            )}
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
                            Total: {formatAmount(calculateLineTotal(isAutoEntrepreneur ? { ...line, taxRate: 0 } : line))}
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
                      <span className="text-[#0F172A]">Total TTC</span>
                      <span className="text-[#0F172A]">{formatAmount(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Onglet Vendeur */}
            {activeTab === "seller" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Nom / Raison sociale
                  </label>
                  <input
                    type="text"
                    value={formData.seller_name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, seller_name: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Adresse complète
                  </label>
                  <textarea
                    value={formData.seller_address || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, seller_address: e.target.value })
                    }
                    rows={3}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1">
                      SIREN (9 chiffres)
                    </label>
                    <input
                      type="text"
                      maxLength={9}
                      value={formData.seller_siren || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          seller_siren: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1 ${
                        errors.seller_siren
                          ? "border-red-500"
                          : "border-[#E5E7EB] focus:border-[#F97316]"
                      }`}
                    />
                    {errors.seller_siren && (
                      <p className="text-xs text-red-500 mt-1">{errors.seller_siren}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1">
                      SIRET (14 chiffres)
                    </label>
                    <input
                      type="text"
                      maxLength={14}
                      value={formData.seller_siret || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          seller_siret: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1 ${
                        errors.seller_siret
                          ? "border-red-500"
                          : "border-[#E5E7EB] focus:border-[#F97316]"
                      }`}
                    />
                    {errors.seller_siret && (
                      <p className="text-xs text-red-500 mt-1">{errors.seller_siret}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    TVA intracommunautaire
                  </label>
                  <input
                    type="text"
                    value={formData.seller_vat_number || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, seller_vat_number: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1">
                      RCS
                    </label>
                    <input
                      type="text"
                      value={formData.seller_rcs || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, seller_rcs: e.target.value })
                      }
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                      placeholder="RCS Paris B 123 456 789"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1">
                      Forme juridique
                    </label>
                    <input
                      type="text"
                      value={formData.seller_legal_form || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, seller_legal_form: e.target.value })
                      }
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                      placeholder="SARL, SAS, etc."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Capital social (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.seller_capital || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        seller_capital: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  />
                </div>
              </div>
            )}

            {/* Onglet Client */}
            {activeTab === "client" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Nom / Raison sociale
                  </label>
                  <input
                    type="text"
                    value={formData.client_name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, client_name: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Adresse complète
                  </label>
                  <textarea
                    value={formData.client_address || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, client_address: e.target.value })
                    }
                    rows={3}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    SIREN (9 chiffres) *
                  </label>
                  <input
                    type="text"
                    maxLength={9}
                    required
                    value={formData.client_siren || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        client_siren: e.target.value.replace(/\D/g, ""),
                      })
                    }
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1 ${
                      errors.client_siren
                        ? "border-red-500"
                        : "border-[#E5E7EB] focus:border-[#F97316]"
                    }`}
                  />
                  {errors.client_siren && (
                    <p className="text-xs text-red-500 mt-1">{errors.client_siren}</p>
                  )}
                  <p className="text-xs text-[#64748B] mt-1">
                    Obligatoire à partir du 1er septembre 2026
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Adresse de livraison (si différente)
                  </label>
                  <textarea
                    value={formData.client_delivery_address || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, client_delivery_address: e.target.value })
                    }
                    rows={3}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  />
                </div>
              </div>
            )}

            {/* Onglet Conditions */}
            {activeTab === "conditions" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Modalités de paiement
                  </label>
                  <textarea
                    value={formData.payment_terms || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, payment_terms: e.target.value })
                    }
                    rows={3}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    placeholder="Paiement à 30 jours, virement bancaire..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1">
                      Taux pénalités de retard (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.late_penalty_rate || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          late_penalty_rate: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1">
                      Indemnité forfaitaire (€)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.recovery_fee || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          recovery_fee: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Catégorie de l'opération *
                  </label>
                  <select
                    required
                    value={formData.operation_category || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        operation_category: e.target.value as "vente" | "prestation" | "les deux" | undefined,
                      })
                    }
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="vente">Vente</option>
                    <option value="prestation">Prestation de services</option>
                    <option value="les deux">Les deux</option>
                  </select>
                  <p className="text-xs text-[#64748B] mt-1">
                    Obligatoire à partir du 1er septembre 2026
                  </p>
                </div>

                <div className="space-y-3">
                  {isAutoEntrepreneur && (
                    <div className="rounded-lg border border-[#FED7AA] bg-[#FFF7ED] px-4 py-3 mb-3">
                      <p className="text-sm text-[#9A3412]">
                        <strong>Entreprise auto-entrepreneur :</strong> La TVA n'est pas applicable. 
                        Tous les taux de TVA sont automatiquement à 0%.
                      </p>
                    </div>
                  )}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="vat_applicable"
                      checked={formData.vat_applicable ?? true}
                      onChange={(e) =>
                        setFormData({ ...formData, vat_applicable: e.target.checked })
                      }
                      disabled={isAutoEntrepreneur}
                      className={`rounded border-[#E5E7EB] ${isAutoEntrepreneur ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    <label htmlFor="vat_applicable" className={`ml-2 text-sm ${isAutoEntrepreneur ? 'text-[#64748B]' : 'text-[#0F172A]'}`}>
                      TVA applicable
                      {isAutoEntrepreneur && ' (désactivé pour auto-entrepreneur)'}
                    </label>
                  </div>

                  {formData.vat_applicable && (
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="vat_on_debit"
                        checked={formData.vat_on_debit ?? false}
                        onChange={(e) =>
                          setFormData({ ...formData, vat_on_debit: e.target.checked })
                        }
                        className="rounded border-[#E5E7EB]"
                      />
                      <label htmlFor="vat_on_debit" className="ml-2 text-sm text-[#0F172A]">
                        TVA sur les débits
                      </label>
                    </div>
                  )}

                  {!formData.vat_applicable && (
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-1">
                        Référence exonération TVA
                      </label>
                      <input
                        type="text"
                        value={formData.vat_exemption_reference || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            vat_exemption_reference: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                        placeholder="Ex: Art. 293 B du CGI"
                      />
                    </div>
                  )}
                </div>

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
                    Conditions générales (optionnel)
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
            )}

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
                disabled={isSubmitting}
                className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-6 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
              >
                {isSubmitting ? "Création..." : "Créer la facture"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
