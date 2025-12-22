"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageTitle } from "@/components/layout/PageTitle";
import { Quote, BillingLine, BillingHistoryEvent, BillingTimelineEvent } from "@/components/billing/types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { calculateSubtotal, calculateTax, calculateTotal, calculateLineTotal, formatAmount, generateQuoteNumber } from "@/components/billing/utils";
import { DescriptionAutocomplete } from "@/components/billing/DescriptionAutocomplete";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { getClients } from "@/services/clientsService";
import { createQuote, QuoteCreate } from "@/services/quotesService";
import { createBillingLineTemplate } from "@/services/billingLineTemplatesService";
import { logger } from "@/lib/logger";

export default function NewQuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get("duplicate");
  const { user, token } = useAuth();
  const { settings, company } = useSettings(false); // Ne pas auto-load, déjà chargé dans AppLayout
  const [isSaving, setIsSaving] = useState(false);

  const [clients, setClients] = useState<Array<{ id: number; name: string }>>([]);
  const [projects] = useState<Array<{ id: number; name: string; client_id: number }>>([]);

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

  const [formData, setFormData] = useState<{
    client_id: number;
    project_id?: number;
    lines: BillingLine[];
    notes?: string;
    conditions?: string;
    valid_until?: string; // Format: YYYY-MM-DD
    service_start_date?: string; // Format: YYYY-MM-DD
    execution_duration?: string;
    discount_type?: "percentage" | "fixed" | null;
    discount_value?: number | null;
    discount_label?: string | null;
    status: Quote["status"];
    attachments?: File[];
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
    status: "brouillon",
    attachments: [],
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

  // Si on duplique un devis, charger les données depuis le backend
  useEffect(() => {
    const loadQuoteToDuplicate = async () => {
      if (!duplicateId || !token) return;
      
      try {
        // TODO: Créer l'API getQuote dans le backend
        // const quoteToDuplicate = await getQuote(token, Number(duplicateId));
        // setFormData({
        //   client_id: quoteToDuplicate.client_id,
        //   project_id: quoteToDuplicate.project_id,
        //   lines: quoteToDuplicate.lines.map((line) => ({
        //     ...line,
        //     id: Date.now() + Math.random(),
        //   })),
        //   notes: quoteToDuplicate.notes || "",
        //   conditions: quoteToDuplicate.conditions || "",
        //   status: "brouillon",
        // });
        
        // Pour l'instant, utiliser les paramètres de l'URL
        const clientId = Number(searchParams.get("client")) || 0;
        const projectId = searchParams.get("project") ? Number(searchParams.get("project")) : undefined;
        
        if (clientId > 0) {
          setFormData(prev => ({
            ...prev,
            client_id: clientId,
            project_id: projectId,
          }));
        }
      } catch (err) {
        console.error("Erreur lors du chargement du devis à dupliquer:", err);
      }
    };
    
    loadQuoteToDuplicate();
  }, [duplicateId, searchParams, token]);

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

  const subtotal = calculateSubtotal(formData.lines);
  const tax = calculateTax(formData.lines);
  const total = calculateTotal(formData.lines);

  const handleLineChange = (lineId: number, field: keyof BillingLine, value: string | number) => {
    // Si auto-entrepreneur et qu'on essaie de modifier le taux de TVA, forcer à 0
    if (field === "taxRate" && isAutoEntrepreneur) {
      value = 0;
      // Mettre à jour toutes les lignes à 0
      setFormData(prev => ({
        ...prev,
        lines: prev.lines.map((line) => ({
          ...line,
          taxRate: 0
        }))
      }));
      return;
    }
    
    // Utiliser la forme fonctionnelle pour toujours avoir le dernier état
    setFormData((prev) => {
      const updatedLines = prev.lines.map((line) => {
        if (line.id === lineId) {
          return { ...line, [field]: value };
        }
        return line;
      });
      return { ...prev, lines: updatedLines };
    });
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
    if (formData.lines.length === 1) return; // Garder au moins une ligne
    setFormData({
      ...formData,
      lines: formData.lines.filter((line) => line.id !== lineId),
    });
  };

  const handleTicketAnalyze = (extractedLines: BillingLine[], file: File) => {
    // Remplacer les lignes existantes par celles extraites du ticket
    setFormData({
      ...formData,
      lines: extractedLines,
      attachments: [...(formData.attachments || []), file],
    });
  };

  const handleRemoveAttachment = (index: number) => {
    const newAttachments = [...(formData.attachments || [])];
    newAttachments.splice(index, 1);
    setFormData({
      ...formData,
      attachments: newAttachments,
    });
  };

  const handleSave = async (statusOverride?: Quote["status"]) => {
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
      const selectedClient = clients.find((c) => c.id === formData.client_id);
      const selectedProject = formData.project_id
        ? projects.find((p) => p.id === formData.project_id)
        : undefined;

      // Générer le numéro (TODO: Récupérer le dernier numéro depuis le backend)
      // TODO: Récupérer le dernier numéro depuis le backend
      const quoteNumber = generateQuoteNumber(0, new Date().getFullYear());

      // Créer les événements initiaux
      const historyEvent: BillingHistoryEvent = {
        id: Date.now(),
        timestamp: now,
        action: "Devis créé",
        user: userName,
      };

      const timelineEvent: BillingTimelineEvent = {
        id: Date.now(),
        timestamp: now,
        action: "Devis créé",
        user: userName,
      };

      // Préparer les données pour l'API
      // Si on clique sur "Créer et envoyer", créer en "brouillon" pour ouvrir le formulaire d'envoi
      const finalStatus = statusOverride === "envoyé" ? "brouillon" : (statusOverride || formData.status);
      // S'assurer que le status est compatible avec QuoteCreate (seulement "brouillon" | "envoyé")
      const validStatus: "brouillon" | "envoyé" = (finalStatus === "brouillon" || finalStatus === "envoyé") ? finalStatus : "brouillon";
      const quoteData: QuoteCreate = {
        client_id: formData.client_id,
        project_id: formData.project_id,
        status: validStatus,
        notes: formData.notes,
        conditions: formData.conditions,
        valid_until: formData.valid_until ? new Date(formData.valid_until) : undefined,
        service_start_date: formData.service_start_date ? new Date(formData.service_start_date) : undefined,
        execution_duration: formData.execution_duration || undefined,
        discount_type: formData.discount_type || null,
        discount_value: formData.discount_value || null,
        discount_label: formData.discount_label || null,
        lines: formData.lines.map((line, index) => ({
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unit_price_ht: line.unitPrice,
          tax_rate: line.taxRate,
          order: index,
        })),
      };

      // Appel API pour créer le devis
      if (!token) {
        throw new Error("Token d'authentification manquant");
      }

      try {
        const createdQuote = await createQuote(token, quoteData);

        // TODO: Uploader les fichiers attachés (formData.attachments) vers le backend
        if (formData.attachments && formData.attachments.length > 0) {
          logger.log("Attachments à uploader:", formData.attachments.map(f => f.name));
          // TODO: Implémenter l'upload des fichiers
        }

        // Rediriger vers la page de détail
        // Si on a cliqué sur "Créer et envoyer", ouvrir automatiquement le formulaire d'envoi
        if (statusOverride === "envoyé") {
          router.push(`/app/billing/quotes/${createdQuote.id}?send=true`);
        } else {
          router.push(`/app/billing/quotes/${createdQuote.id}`);
        }
      } catch (apiError) {
        // Si l'API n'existe pas encore (404), afficher un message clair
        if ((apiError as any).message?.includes("404") || (apiError as any).message?.includes("Not Found")) {
          alert("L'API devis n'est pas encore disponible dans le backend. Veuillez créer l'API quotes dans le backend.");
        } else {
          throw apiError; // Relancer l'erreur pour qu'elle soit gérée par le catch externe
        }
      }
    } catch (error) {
      console.error("Error creating quote:", error);
      const errorMessage = (error as any).message || "Erreur lors de la création du devis";
      alert(`Erreur: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <PageTitle title="Créer un devis" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/app/billing/quotes")}
            className="text-sm text-[#64748B] hover:text-[#0F172A]"
          >
            ← Retour à la liste
          </button>
        </div>

        {duplicateId && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-800">
              📋 Duplication du devis #{duplicateId}. Les informations ont été pré-remplies.
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold text-[#0F172A]">
              Créer un nouveau devis
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
                        project_id: undefined, // Réinitialiser le projet si le client change
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
                    onClick={() => {
                      // TODO: Ouvrir modal pour créer un nouveau client
                      router.push("/app/clients?new=true");
                    }}
                    className="mt-2 text-xs text-[#F97316] hover:text-[#EA580C]"
                  >
                    + Ajouter un nouveau client
                  </button>
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
              </div>
            </div>

            {/* Bloc 2 : Lignes du devis */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#0F172A]">
                  Lignes du devis
                </h2>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsTicketModalOpen(true)}
                    className="text-sm text-[#8B5CF6] hover:text-[#6D28D9] font-medium flex items-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    📸 Analyser un ticket de caisse
                  </button>
                  <button
                    onClick={handleAddLine}
                    className="text-sm text-[#F97316] hover:text-[#EA580C] font-medium"
                  >
                    + Ajouter une ligne
                  </button>
                </div>
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
                            // S'assurer que les valeurs sont des numbers
                            const unitPrice = typeof savedLine.unitPrice === 'string' ? parseFloat(savedLine.unitPrice) : savedLine.unitPrice;
                            // Forcer à 0% si auto-entrepreneur, sinon utiliser le taux sauvegardé
                            const taxRate = isAutoEntrepreneur ? 0 : (typeof savedLine.taxRate === 'string' ? parseFloat(savedLine.taxRate) : savedLine.taxRate);
                            handleLineChange(line.id, "unitPrice", unitPrice);
                            if (savedLine.unit) {
                              handleLineChange(line.id, "unit", savedLine.unit);
                            }
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
                          value={line.unitPrice ?? 0}
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
                          value={line.taxRate ?? 20}
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

            {/* Bloc 4 : Pièces jointes */}
            {formData.attachments && formData.attachments.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-[#0F172A] mb-4">
                  Pièces jointes
                </h2>
                <div className="space-y-2">
                  {formData.attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border border-[#E5E7EB] bg-white"
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-[#64748B]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-[#0F172A]">
                            {file.name}
                          </p>
                          <p className="text-xs text-[#64748B]">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveAttachment(index)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Supprimer
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bloc 5 : Conformité légale */}
            <div>
              <h2 className="text-lg font-semibold text-[#0F172A] mb-4">
                Conformité légale
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Devis valable jusqu'au (optionnel)
                  </label>
                  <input
                    type="date"
                    value={formData.valid_until || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, valid_until: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Date de début de prestation (optionnel)
                  </label>
                  <input
                    type="date"
                    value={formData.service_start_date || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, service_start_date: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Durée d'exécution (optionnel)
                  </label>
                  <input
                    type="text"
                    value={formData.execution_duration || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, execution_duration: e.target.value })
                    }
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    placeholder="Ex: 30 jours, 2 semaines..."
                  />
                </div>
              </div>
            </div>

            {/* Bloc 6 : Réduction/Escompte */}
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
                    value={formData.discount_type || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discount_type: e.target.value as "percentage" | "fixed" | null,
                        discount_value: e.target.value ? formData.discount_value : null,
                      })
                    }
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  >
                    <option value="">Aucune réduction</option>
                    <option value="percentage">Pourcentage (%)</option>
                    <option value="fixed">Montant fixe (€)</option>
                  </select>
                </div>
                {formData.discount_type && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-1">
                        {formData.discount_type === "percentage" ? "Pourcentage (%)" : "Montant (€)"}
                      </label>
                      <input
                        type="number"
                        step={formData.discount_type === "percentage" ? "0.01" : "0.01"}
                        min="0"
                        value={formData.discount_value || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            discount_value: e.target.value ? parseFloat(e.target.value) : null,
                          })
                        }
                        className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                        placeholder={formData.discount_type === "percentage" ? "10" : "50.00"}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] mb-1">
                        Libellé (optionnel)
                      </label>
                      <input
                        type="text"
                        value={formData.discount_label || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, discount_label: e.target.value || null })
                        }
                        className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                        placeholder="Ex: Remise commerciale, Escompte 2%..."
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bloc 6 : Notes & Conditions */}
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
                onClick={() => handleSave("brouillon")}
                disabled={isSaving}
                className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB] disabled:opacity-60"
              >
                {isSaving ? "Enregistrement..." : "Enregistrer comme brouillon"}
              </button>
              <button
                onClick={() => handleSave("envoyé")}
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

