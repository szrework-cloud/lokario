"use client";

import { useState, FormEvent, useEffect } from "react";
import { InboxStatus, MessageSource } from "@/components/inbox/types";
import { getClients } from "@/services/clientsService";
import { useAuth } from "@/hooks/useAuth";

interface CreateConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Client {
  id: number;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
}

export function CreateConversationModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateConversationModalProps) {
  const { token, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);

  const [formData, setFormData] = useState({
    clientId: "",
    subject: "",
    source: "email" as MessageSource,
    status: "À répondre" as InboxStatus,
    fromName: "",
    fromEmail: "",
    fromPhone: "",
    content: "",
  });

  // Charger les clients
  useEffect(() => {
    if (isOpen && token) {
      setIsLoadingClients(true);
      getClients(token)
        .then((data) => {
          setClients(data);
        })
        .catch((err) => {
          console.error("Erreur lors du chargement des clients:", err);
        })
        .finally(() => {
          setIsLoadingClients(false);
        });
    }
  }, [isOpen, token]);

  // Réinitialiser le formulaire quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setFormData({
        clientId: "",
        subject: "",
        source: "email",
        status: "À répondre",
        fromName: "",
        fromEmail: "",
        fromPhone: "",
        content: "",
      });
      setError(null);
    }
  }, [isOpen]);

  // Initialiser les champs avec les infos de l'utilisateur connecté (c'est l'entreprise qui envoie)
  useEffect(() => {
    if (isOpen && user) {
      setFormData((prev) => ({
        ...prev,
        fromName: user.full_name || user.email || "Vous",
        fromEmail: "", // Email du destinataire (sera rempli si un client est sélectionné)
        fromPhone: "",
      }));
    }
  }, [isOpen, user]);
  
  // Mettre à jour l'email du destinataire et le téléphone selon le client sélectionné
  useEffect(() => {
    if (formData.clientId) {
      const client = clients.find((c) => c.id === parseInt(formData.clientId));
      if (client) {
        setFormData((prev) => ({
          ...prev,
          fromEmail: client.contactEmail || "", // Email du destinataire
          fromPhone: client.contactPhone || "",
        }));
      } else {
        // Réinitialiser si le client n'est plus valide
        setFormData((prev) => ({
          ...prev,
          fromEmail: "",
          fromPhone: "",
        }));
      }
    }
  }, [formData.clientId, clients]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.content.trim()) {
      setError("Le contenu du message est requis.");
      return;
    }

    if (!formData.fromName.trim()) {
      setError("Le nom de l'expéditeur est requis.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { createConversation } = await import("@/services/inboxService");
      await createConversation(
        {
          subject: formData.subject || undefined,
          status: formData.status,
          source: formData.source,
          clientId: formData.clientId ? parseInt(formData.clientId) : undefined,
          firstMessage: {
            fromName: formData.fromName,
            fromEmail: formData.fromEmail || undefined,
            fromPhone: formData.fromPhone || undefined,
            content: formData.content,
            source: formData.source,
            isFromClient: false, // Nouveau message = message de l'entreprise (envoyé depuis l'inbox)
          },
        },
        token
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Erreur lors de la création de la conversation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[#0F172A]">Nouveau message</h2>
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

          {/* Client (optionnel) */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Client (optionnel)
            </label>
            <select
              id="clientId"
              value={formData.clientId}
              onChange={(e) =>
                setFormData({ ...formData, clientId: e.target.value })
              }
              disabled={isSubmitting || isLoadingClients}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
            >
              <option value="">Aucun client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id.toString()}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Source
            </label>
            <select
              id="source"
              value={formData.source}
              onChange={(e) =>
                setFormData({ ...formData, source: e.target.value as MessageSource })
              }
              disabled={isSubmitting}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
            >
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="messenger">Messenger</option>
              <option value="formulaire">Formulaire</option>
            </select>
          </div>

          {/* Sujet (pour email) */}
          {formData.source === "email" && (
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Sujet
              </label>
              <input
                id="subject"
                type="text"
                value={formData.subject}
                onChange={(e) =>
                  setFormData({ ...formData, subject: e.target.value })
                }
                placeholder="Sujet du message"
                disabled={isSubmitting}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              />
            </div>
          )}

          {/* Expéditeur */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Votre nom <span className="text-red-500">*</span>
              </label>
              <input
                id="fromName"
                type="text"
                value={formData.fromName}
                onChange={(e) =>
                  setFormData({ ...formData, fromName: e.target.value })
                }
                required
                placeholder="Votre nom"
                disabled={isSubmitting}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              />
            </div>
            {formData.source === "email" && (
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Email du destinataire
                </label>
                <input
                  id="fromEmail"
                  type="email"
                  value={formData.fromEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, fromEmail: e.target.value })
                  }
                  placeholder="email@exemple.com"
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                />
              </div>
            )}
            {(formData.source === "whatsapp" || formData.source === "messenger") && (
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Téléphone
                </label>
                <input
                  id="fromPhone"
                  type="tel"
                  value={formData.fromPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, fromPhone: e.target.value })
                  }
                  placeholder="06 12 34 56 78"
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                />
              </div>
            )}
          </div>

          {/* Contenu du message */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) =>
                setFormData({ ...formData, content: e.target.value })
              }
              required
              rows={6}
              placeholder="Contenu du message..."
              disabled={isSubmitting}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
            />
          </div>

          {/* Statut */}
          <div>
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              Statut initial
            </label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as InboxStatus })
              }
              disabled={isSubmitting}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
            >
              <option value="À répondre">À répondre</option>
              <option value="En attente">En attente</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#64748B] hover:bg-[#F9FAFB] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
            >
              {isSubmitting ? "Création..." : "Créer la conversation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

