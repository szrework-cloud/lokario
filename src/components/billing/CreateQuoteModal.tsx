"use client";

import { useState, FormEvent, useEffect } from "react";
import { AnimatedModal } from "@/components/ui/AnimatedModal";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { AnimatedInput } from "@/components/ui/AnimatedInput";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { getClients } from "@/services/clientsService";

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
  const { token } = useAuth();
  const [formData, setFormData] = useState<QuoteFormData>({
    client_id: 0,
    amount: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    
    if (isOpen) {
      loadClients();
    }
  }, [token, isOpen]);

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

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      title="Créer un devis"
      size="lg"
    >
      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleSubmit}
        className="space-y-4"
      >
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
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1 transition-all"
              >
                <option value={0}>Sélectionner un client</option>
                {clients.map((client) => (
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
                    {projects
                  .filter((p) => p.client_id === formData.client_id)
                  .map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
              </select>
            </div>

            <AnimatedInput
              label="Montant (€) *"
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.amount?.toString() || ""}
              onChange={(e) =>
                setFormData({ ...formData, amount: Number(e.target.value) })
              }
              placeholder="0.00"
            />

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
              <AnimatedButton
                type="button"
                variant="ghost"
                onClick={onClose}
              >
                Annuler
              </AnimatedButton>
              <AnimatedButton
                type="submit"
                variant="primary"
                loading={isSubmitting}
              >
                Créer le devis
              </AnimatedButton>
            </div>
          </motion.form>
    </AnimatedModal>
  );
}

