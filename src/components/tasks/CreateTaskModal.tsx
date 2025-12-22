"use client";

import { useState, FormEvent, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
  employees?: Array<{ id: number; name: string; email: string; avatar?: string }>;
}

export interface TaskFormData {
  title: string;
  description?: string;
  assigned_to_id?: number;
  priority: "normal" | "high" | "critical";  // MVP V1: 3 priorités uniquement
  due_date?: string;
  due_time?: string;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  recurrence_days?: number[]; // Pour hebdomadaire (0-6, dimanche = 0)
}

export function CreateTaskModal({ isOpen, onClose, onSubmit, employees = [] }: CreateTaskModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<TaskFormData>>({
    priority: "normal",  // MVP V1: priorité par défaut "normal"
    recurrence: "none",
    recurrence_days: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Réinitialiser le formulaire quand le modal se ferme
  useEffect(() => {
    if (!isOpen) {
      setFormData({ 
        title: "",
        description: "",
        priority: "normal", 
        recurrence: "none", 
        recurrence_days: [],
        assigned_to_id: undefined,
        due_date: undefined,
        due_time: undefined,
      });
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const weekDays = [
    { value: 0, label: "Dimanche" },
    { value: 1, label: "Lundi" },
    { value: 2, label: "Mardi" },
    { value: 3, label: "Mercredi" },
    { value: 4, label: "Jeudi" },
    { value: 5, label: "Vendredi" },
    { value: 6, label: "Samedi" },
  ];

  // Jours du mois (1-31) pour la récurrence mensuelle
  const monthDays = Array.from({ length: 31 }, (_, i) => ({
    value: i + 1,
    label: String(i + 1),
  }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.title.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData as TaskFormData);
      // Réinitialiser le formulaire seulement si la soumission réussit
      setFormData({ 
        title: "",
        description: "",
        priority: "normal", 
        recurrence: "none", 
        recurrence_days: [],
        assigned_to_id: undefined,
        due_date: undefined,
        due_time: undefined,
      });  // MVP V1: reset complet du formulaire
      // Le parent gère la fermeture du modal après succès
    } catch (error) {
      console.error("Error creating task:", error);
      // Propager l'erreur pour que le parent puisse l'afficher
      throw error;
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
            <h2 className="text-xl font-semibold text-[#0F172A]">Créer une tâche</h2>
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
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Titre de la tâche *
              </label>
              <input
                type="text"
                required
                value={formData.title || ""}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="Ex: Vérifier stock farine"
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
                rows={3}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="Description détaillée..."
              />
            </div>

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
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name || emp.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Priorité *
                </label>
                <select
                  required
                  value={formData.priority || "normal"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: e.target.value as TaskFormData["priority"],
                    })
                  }
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                >
                  <option value="normal">Normale</option>
                  <option value="high">Haute</option>
                  <option value="critical">Critique</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Récurrence
                </label>
                <select
                  value={formData.recurrence || "none"}
                  onChange={(e) => {
                    const newRecurrence = e.target.value as TaskFormData["recurrence"];
                    // Si on passe à "weekly" ou "monthly", préserver les jours déjà sélectionnés ou initialiser avec un tableau vide
                    let recurrenceDays: number[] | undefined;
                    if (newRecurrence === "weekly" || newRecurrence === "monthly") {
                      recurrenceDays = Array.isArray(formData.recurrence_days) ? formData.recurrence_days : [];
                    } else {
                      recurrenceDays = undefined;
                    }
                    
                    setFormData({
                      ...formData,
                      recurrence: newRecurrence,
                      recurrence_days: recurrenceDays,
                    });
                  }}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                >
                  <option value="none">Aucun</option>
                  <option value="daily">Quotidien</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuel</option>
                </select>
              </div>
            </div>

            {formData.recurrence === "weekly" && (
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Jours de la semaine
                </label>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map((day) => {
                    const recurrenceDays = Array.isArray(formData.recurrence_days) ? formData.recurrence_days : [];
                    const isChecked = recurrenceDays.includes(day.value);
                    
                    return (
                      <label
                        key={day.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const currentDays = Array.isArray(formData.recurrence_days) ? formData.recurrence_days : [];
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                recurrence_days: [...currentDays, day.value],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                recurrence_days: currentDays.filter((d) => d !== day.value),
                              });
                            }
                          }}
                          className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                        />
                        <span className="text-sm text-[#0F172A]">{day.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {formData.recurrence === "monthly" && (
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Jours du mois
                </label>
                <div className="flex flex-wrap gap-2">
                  {monthDays.map((day) => {
                    const recurrenceDays = Array.isArray(formData.recurrence_days) ? formData.recurrence_days : [];
                    const isChecked = recurrenceDays.includes(day.value);
                    
                    return (
                      <label
                        key={day.value}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const currentDays = Array.isArray(formData.recurrence_days) ? formData.recurrence_days : [];
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                recurrence_days: [...currentDays, day.value],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                recurrence_days: currentDays.filter((d) => d !== day.value),
                              });
                            }
                          }}
                          className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                        />
                        <span className="text-sm text-[#0F172A]">{day.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Heure
              </label>
              <input
                type="time"
                value={formData.due_time || ""}
                onChange={(e) =>
                  setFormData({ ...formData, due_time: e.target.value })
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
                {isSubmitting ? "Création..." : "Créer la tâche"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

