"use client";

import { useState, FormEvent } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface CreateFollowupFromInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    client: string;
    type: string;
    message?: string;
    dueDate: string;
  }) => void;
  defaultClient?: string;
}

export function CreateFollowupFromInboxModal({
  isOpen,
  onClose,
  onSubmit,
  defaultClient,
}: CreateFollowupFromInboxModalProps) {
  const [client, setClient] = useState(defaultClient || "");
  const [type, setType] = useState("devis");
  const [message, setMessage] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({
      client,
      type,
      message,
      dueDate,
    });
    // Reset form
    setClient(defaultClient || "");
    setType("devis");
    setMessage("");
    setDueDate("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#0F172A]">Créer une relance</h2>
            <button
              onClick={onClose}
              className="text-[#64748B] hover:text-[#0F172A]"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
              <input
                type="text"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                required
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Type de relance *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                required
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              >
                <option value="devis">Devis non accepté</option>
                <option value="facture">Facture impayée</option>
                <option value="paiement">Rappel de paiement</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Message (optionnel)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Laissez vide pour utiliser le template par défaut"
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Date d'envoi *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit">Créer la relance</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

