"use client";

import { useState, FormEvent } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => void;
}

export interface TaskFormData {
  title: string;
  description?: string;
  assigned_to_id: number;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  due_date: string;
  due_time?: string;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  is_mandatory?: boolean;
}

export function CreateTaskModal({ isOpen, onClose, onSubmit }: CreateTaskModalProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<TaskFormData>>({
    priority: "medium",
    recurrence: "none",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // TODO: Récupérer depuis le backend
  const mockEmployees = [
    { id: 1, name: "Jean Dupont", avatar: "JD" },
    { id: 2, name: "Marie Martin", avatar: "MM" },
    { id: 3, name: "Sophie Durand", avatar: "SD" },
    { id: 4, name: "Pierre Bernard", avatar: "PB" },
  ];

  const categories = ["Interne", "Client", "Fournisseur", "Administratif"];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.assigned_to_id || !formData.category || !formData.due_date) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData as TaskFormData);
      setFormData({ priority: "medium", recurrence: "none" });
      onClose();
    } catch (error) {
      console.error("Error creating task:", error);
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Assignée à *
                </label>
                <select
                  required
                  value={formData.assigned_to_id || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      assigned_to_id: Number(e.target.value),
                    })
                  }
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                >
                  <option value="">Sélectionner un employé</option>
                  {mockEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Catégorie *
                </label>
                <select
                  required
                  value={formData.category || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Priorité *
                </label>
                <select
                  required
                  value={formData.priority || "medium"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: e.target.value as TaskFormData["priority"],
                    })
                  }
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                >
                  <option value="low">Faible</option>
                  <option value="medium">Moyenne</option>
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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recurrence: e.target.value as TaskFormData["recurrence"],
                    })
                  }
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                >
                  <option value="none">Aucun</option>
                  <option value="daily">Quotidien</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuel</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Date *
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
            </div>

            {(user?.role === "super_admin" || user?.role === "owner") && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_mandatory"
                  checked={formData.is_mandatory || false}
                  onChange={(e) =>
                    setFormData({ ...formData, is_mandatory: e.target.checked })
                  }
                  className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                />
                <label htmlFor="is_mandatory" className="text-sm text-[#0F172A]">
                  Tâche obligatoire
                </label>
              </div>
            )}

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

