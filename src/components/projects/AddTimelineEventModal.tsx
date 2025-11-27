"use client";

import { useState, FormEvent } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { TimelineEvent } from "./types";

interface AddTimelineEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (event: TimelineEvent) => void;
}

export function AddTimelineEventModal({
  isOpen,
  onClose,
  onSubmit,
}: AddTimelineEventModalProps) {
  const [formData, setFormData] = useState<{
    title: string;
    date: string;
    description: string;
  }>({
    title: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date) {
      return;
    }

    setIsSubmitting(true);
    try {
      onSubmit({
        title: formData.title,
        date: formData.date,
        description: formData.description || undefined,
      });
      setFormData({
        title: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
      });
      onClose();
    } catch (error) {
      console.error("Error adding timeline event:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#0F172A]">
              Ajouter un événement à la timeline
            </h2>
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
                Titre de l'événement *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="Ex: Devis envoyé, Facture payée, Relance envoyée..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="Détails supplémentaires sur cet événement..."
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
                {isSubmitting ? "Ajout..." : "Ajouter l'événement"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

