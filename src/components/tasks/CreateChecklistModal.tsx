"use client";

import { useState, FormEvent } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { sectorTemplates, SectorTemplate } from "./sectorTemplates";
import { useSettings } from "@/hooks/useSettings";

interface CreateChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ChecklistFormData) => void;
}

export interface ChecklistFormData {
  name: string;
  description?: string;
  items: string[];
  assigned_to_id?: number;
  recurrence: "daily" | "weekly" | "monthly";
  recurrence_days?: number[]; // Pour hebdomadaire (0-6, dimanche = 0)
  execution_time?: string;
}

export function CreateChecklistModal({ isOpen, onClose, onSubmit }: CreateChecklistModalProps) {
  const { company } = useSettings(false);
  
  // Normaliser le secteur (ex: "Coiffure" → "coiffure", "Tabac-Presse" → "tabac")
  const normalizeSector = (sector: string | null | undefined): string | null => {
    if (!sector) return null;
    const normalized = sector.toLowerCase().trim();
    // Mapping pour gérer les variations
    const sectorMap: Record<string, string> = {
      "coiffure": "coiffure",
      "salon de coiffure": "coiffure",
      "tabac": "tabac",
      "tabac-presse": "tabac",
      "presse": "tabac",
      "institut": "institut",
      "institut de beauté": "institut",
      "beauté": "institut",
      "epicerie": "epicerie",
      "épicerie": "epicerie",
      "commerce": "commerce",
      "magasin": "commerce",
    };
    return sectorMap[normalized] || normalized;
  };
  
  const companySector = normalizeSector(company?.sector);
  
  const [formData, setFormData] = useState<Partial<ChecklistFormData>>({
    items: [""],
    recurrence: "daily",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // TODO: Récupérer depuis le backend
  const mockEmployees = [
    { id: 1, name: "Jean Dupont" },
    { id: 2, name: "Marie Martin" },
    { id: 3, name: "Sophie Durand" },
    { id: 4, name: "Pierre Bernard" },
  ];

  const weekDays = [
    { value: 0, label: "Dimanche" },
    { value: 1, label: "Lundi" },
    { value: 2, label: "Mardi" },
    { value: 3, label: "Mercredi" },
    { value: 4, label: "Jeudi" },
    { value: 5, label: "Vendredi" },
    { value: 6, label: "Samedi" },
  ];

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...(formData.items || []), ""],
    });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index: number, value: string) => {
    const newItems = [...(formData.items || [])];
    newItems[index] = value;
    setFormData({ ...formData, items: newItems });
  };

  const applyTemplate = (template: SectorTemplate) => {
    setFormData({
      name: template.name,
      description: template.description,
      items: template.items,
      recurrence: template.recurrence,
      execution_time: template.executionTime,
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.items || formData.items.filter((i) => i.trim()).length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: formData.name,
        description: formData.description,
        items: formData.items.filter((i) => i.trim()),
        assigned_to_id: formData.assigned_to_id,
        recurrence: formData.recurrence || "daily",
        recurrence_days: formData.recurrence_days,
        execution_time: formData.execution_time,
      });
      setFormData({ items: [""], recurrence: "daily" });
      onClose();
    } catch (error) {
      console.error("Error creating checklist:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#0F172A]">Créer une checklist</h2>
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* SECTION TEMPLATES PAR SECTEUR */}
            {companySector && sectorTemplates[companySector] ? (
              <div className="mb-6 p-4 rounded-lg border border-blue-200 bg-blue-50">
                <h3 className="text-sm font-semibold text-[#0F172A] mb-3">
                  📋 Templates pour {company?.sector || companySector}
                </h3>
                <div className="space-y-2">
                  {sectorTemplates[companySector].map((template, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => applyTemplate(template)}
                      className="w-full text-left p-3 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-[#0F172A]">{template.name}</p>
                          <p className="text-xs text-[#64748B]">{template.description}</p>
                        </div>
                        <span className="text-xs text-[#F97316]">Utiliser →</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Si pas de secteur défini, afficher tous les templates par catégorie
              <div className="mb-6 p-4 rounded-lg border border-blue-200 bg-blue-50">
                <h3 className="text-sm font-semibold text-[#0F172A] mb-3">
                  📋 Templates de routines prédéfinis
                </h3>
                <p className="text-xs text-[#64748B] mb-3">
                  {company?.sector 
                    ? `Aucun template spécifique pour "${company.sector}". Voici les templates disponibles :`
                    : "Sélectionnez votre secteur dans les paramètres pour voir les templates adaptés. Voici tous les templates disponibles :"}
                </p>
                <div className="space-y-4">
                  {Object.entries(sectorTemplates).map(([sector, templates]) => (
                    <div key={sector} className="border-t border-blue-200 pt-3 first:border-t-0 first:pt-0">
                      <h4 className="text-xs font-semibold text-[#0F172A] mb-2 capitalize">
                        {sector === "coiffure" && "💇 Coiffure"}
                        {sector === "tabac" && "🚬 Tabac-Presse"}
                        {sector === "institut" && "💅 Institut de beauté"}
                        {sector === "epicerie" && "🛒 Épicerie"}
                        {sector === "commerce" && "🏪 Commerce"}
                      </h4>
                      <div className="space-y-2">
                        {templates.map((template, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => applyTemplate(template)}
                            className="w-full text-left p-2 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-medium text-[#0F172A]">{template.name}</p>
                                <p className="text-xs text-[#64748B]">{template.description}</p>
                              </div>
                              <span className="text-xs text-[#F97316]">→</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Nom de la checklist *
              </label>
              <input
                type="text"
                required
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="Ex: Ouverture magasin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Description
              </label>
              <textarea
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="Description de la checklist..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Items de la checklist *
              </label>
              <div className="space-y-2">
                {formData.items?.map((item, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleItemChange(index, e.target.value)}
                      className="flex-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                      placeholder={`Item ${index + 1}`}
                    />
                    {formData.items && formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="text-sm text-[#F97316] hover:text-[#EA580C] flex items-center gap-1"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Ajouter un item
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Assignée à (optionnel)
                </label>
                <select
                  value={formData.assigned_to_id || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      assigned_to_id: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                >
                  <option value="">Tous les employés</option>
                  {mockEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Récurrence *
                </label>
                <select
                  required
                  value={formData.recurrence || "daily"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recurrence: e.target.value as ChecklistFormData["recurrence"],
                    })
                  }
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                >
                  <option value="daily">Quotidienne</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuelle</option>
                </select>
              </div>
            </div>

            {formData.recurrence === "weekly" && (
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Jours de la semaine
                </label>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map((day) => (
                    <label
                      key={day.value}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.recurrence_days?.includes(day.value) || false}
                        onChange={(e) => {
                          const days = formData.recurrence_days || [];
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              recurrence_days: [...days, day.value],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              recurrence_days: days.filter((d) => d !== day.value),
                            });
                          }
                        }}
                        className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                      />
                      <span className="text-sm text-[#0F172A]">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Heure d'exécution (optionnel)
              </label>
              <input
                type="time"
                value={formData.execution_time || ""}
                onChange={(e) =>
                  setFormData({ ...formData, execution_time: e.target.value })
                }
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              />
            </div>

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
                {isSubmitting ? "Création..." : "Créer la checklist"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

