"use client";

import { useState, FormEvent } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

interface CreateQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: QuoteFormData) => void;
}

export interface QuoteFormData {
  client_id: number;
  project_id?: number;
  amount: number;
  notes?: string;
}

export function CreateQuoteModal({ isOpen, onClose, onSubmit }: CreateQuoteModalProps) {
  const [formData, setFormData] = useState<QuoteFormData>({
    client_id: 0,
    amount: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // TODO: Récupérer depuis le backend
  const mockClients = [
    { id: 1, name: "Boulangerie Soleil" },
    { id: 2, name: "Mme Dupont" },
    { id: 3, name: "M. Martin" },
  ];

  const mockProjects = [
    { id: 1, name: "Rénovation cuisine", client_id: 3 },
    { id: 2, name: "Installation équipement", client_id: 1 },
  ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({ client_id: 0, amount: 0 });
      onClose();
    } catch (error) {
      console.error("Error creating quote:", error);
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
            <h2 className="text-xl font-semibold text-[#0F172A]">Créer un devis</h2>
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
                Client *
              </label>
              <select
                required
                value={formData.client_id}
                onChange={(e) =>
                  setFormData({ ...formData, client_id: Number(e.target.value) })
                }
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              >
                <option value={0}>Sélectionner un client</option>
                {mockClients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
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
                {mockProjects
                  .filter((p) => p.client_id === formData.client_id)
                  .map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Montant (€) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.amount || ""}
                onChange={(e) =>
                  setFormData({ ...formData, amount: Number(e.target.value) })
                }
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="0.00"
              />
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
                placeholder="Notes additionnelles..."
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
                {isSubmitting ? "Création..." : "Créer le devis"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

