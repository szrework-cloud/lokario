"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Client, createClient, updateClient, deleteClient } from "@/services/clientsService";
import { useAuth } from "@/hooks/useAuth";

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client?: Client | null; // Si fourni, mode édition
  onDelete?: () => void; // Callback après suppression
}

export function ClientModal({ isOpen, onClose, onSuccess, client, onDelete }: ClientModalProps) {
  const { token } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "Client" as "Client" | "Fournisseur",
    sector: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
    country: "",
    siret: "",
    notes: "",
    tags: [] as string[],
  });

  // Initialiser le formulaire avec les données du client si en mode édition
  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || "",
        type: client.type || "Client",
        sector: client.sector || "",
        email: client.contactEmail || "",
        phone: client.contactPhone || "",
        address: client.address || "",
        city: client.city || "",
        postal_code: client.postalCode || "",
        country: client.country || "",
        siret: client.siret || "",
        notes: "",
        tags: client.tags || [],
      });
    } else {
      // Réinitialiser le formulaire en mode création
      setFormData({
        name: "",
        type: "Client",
        sector: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        postal_code: "",
        country: "",
        siret: "",
        notes: "",
        tags: [],
      });
    }
    setError(null);
  }, [client, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (client) {
        // Mode édition
        await updateClient(client.id, formData, token);
      } else {
        // Mode création
        await createClient(formData, token);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Erreur lors de la sauvegarde:", err);
      setError(err.message || "Erreur lors de la sauvegarde du client");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTagToggle = (tag: "VIP" | "régulier" | "nouveau") => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleDelete = async () => {
    if (!client) return;

    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await deleteClient(client.id, token);
      onDelete?.();
      onClose();
      // Rediriger vers la liste des clients
      router.push("/app/clients");
    } catch (err: any) {
      console.error("Erreur lors de la suppression:", err);
      setError(err.message || "Erreur lors de la suppression du client");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#0F172A]">
            {client ? "Modifier le client" : "Nouveau client"}
          </h2>
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-[#0F172A] transition-colors"
            disabled={isSubmitting}
          >
            <svg
              className="w-6 h-6"
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
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Nom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              placeholder="Nom du client"
              disabled={isSubmitting}
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as "Client" | "Fournisseur",
                })
              }
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              disabled={isSubmitting}
            >
              <option value="Client">Client</option>
              <option value="Fournisseur">Fournisseur</option>
            </select>
          </div>

          {/* Secteur */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Secteur
            </label>
            <input
              type="text"
              value={formData.sector}
              onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              placeholder="Commerce, Beauté, Resto, Services..."
              disabled={isSubmitting}
            />
          </div>

          {/* Email et Téléphone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="email@exemple.com"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="01 23 45 67 89"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Adresse */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Adresse
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              placeholder="Adresse complète"
              disabled={isSubmitting}
            />
          </div>

          {/* Ville, Code postal, Pays */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Ville
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="Ville"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Code postal
              </label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="Code postal"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Pays
              </label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="Pays"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* SIRET */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              SIRET
            </label>
            <input
              type="text"
              value={formData.siret}
              onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              placeholder="SIRET (14 chiffres)"
              maxLength={14}
              disabled={isSubmitting}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {(["VIP", "régulier", "nouveau"] as const).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    formData.tags.includes(tag)
                      ? "bg-[#F97316] text-white"
                      : "bg-[#F9FAFB] text-[#64748B] hover:bg-[#E5E7EB]"
                  }`}
                  disabled={isSubmitting}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Notes internes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              placeholder="Notes internes sur ce client..."
              disabled={isSubmitting}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB]">
            {/* Bouton de suppression (uniquement en mode édition) */}
            {client && (
              <div>
                {!showDeleteConfirm ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    disabled={isSubmitting || isDeleting}
                  >
                    Supprimer
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#64748B]">Confirmer la suppression ?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Suppression..." : "Oui, supprimer"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setError(null);
                      }}
                      className="px-3 py-1.5 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
                      disabled={isDeleting}
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Boutons de droite */}
            <div className="flex items-center gap-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
                disabled={isSubmitting || isDeleting}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
                disabled={isSubmitting || isDeleting || showDeleteConfirm}
              >
                {isSubmitting
                  ? "Enregistrement..."
                  : client
                  ? "Enregistrer les modifications"
                  : "Créer le client"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

