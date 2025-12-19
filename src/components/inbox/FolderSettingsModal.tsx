"use client";

import { useState, useEffect } from "react";
import { InboxFolder, FolderType } from "./types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useAuth } from "@/hooks/useAuth";

interface FolderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  folder: InboxFolder | null;
  onSave: (folder: InboxFolder) => void;
  onDelete?: (folderId: number) => void;
}

const folderTypeOptions: Array<{ value: FolderType; label: string }> = [
  { value: "general", label: "Général" },
  { value: "info", label: "Demande d'info" },
  { value: "rdv", label: "Prise de RDV" },
  { value: "facture", label: "Facture" },
  { value: "support", label: "Support" },
  { value: "autre", label: "Autre" },
];

const colorOptions = [
  "#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B", "#EF4444", "#64748B"
];

export function FolderSettingsModal({
  isOpen,
  onClose,
  folder,
  onSave,
  onDelete,
}: FolderSettingsModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [type, setType] = useState<FolderType>("general");
  const [color, setColor] = useState(colorOptions[0]);
  const [autoClassify, setAutoClassify] = useState(false);
  const [context, setContext] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(false);
  const [autoReplyMode, setAutoReplyMode] = useState<"none" | "approval" | "auto">("none");
  const [autoReplyDelay, setAutoReplyDelay] = useState<number | undefined>(undefined);
  const [useCompanyKnowledge, setUseCompanyKnowledge] = useState(false);

  // Guard de permission
  useEffect(() => {
    if (isOpen && user?.role !== "owner" && user?.role !== "super_admin") {
      onClose();
    }
  }, [isOpen, user?.role, onClose]);

  // Charger les valeurs du dossier dans le formulaire quand le modal s'ouvre
  useEffect(() => {
    if (folder && isOpen) {
      // Charger toutes les valeurs du dossier dans le formulaire
      setName(folder.name || "");
      setType(folder.type || "general");
      setColor(folder.color || colorOptions[0]);
      setAutoClassify(folder.aiRules?.autoClassify || false);
      setContext(folder.aiRules?.context || "");
      setAutoReplyEnabled(folder.autoReply?.enabled || false);
      setAutoReplyMode(folder.autoReply?.mode || "none");
      setAutoReplyDelay(folder.autoReply?.delay || undefined);
      setUseCompanyKnowledge(folder.autoReply?.useCompanyKnowledge || false);
    } else if (!isOpen) {
      // Réinitialiser toutes les valeurs quand le modal se ferme
      setName("");
      setType("general");
      setColor(colorOptions[0]);
      setAutoClassify(false);
      setContext("");
      setAutoReplyEnabled(false);
      setAutoReplyMode("none");
      setAutoReplyDelay(undefined);
      setUseCompanyKnowledge(false);
    }
  }, [folder, isOpen]);

  if (!isOpen || !folder) return null;

  // Double vérification du guard
  if (user?.role !== "owner" && user?.role !== "super_admin") {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      ...folder,
      name: name.trim(),
      type,
      color,
      aiRules: {
        autoClassify,
        context: autoClassify && context.trim() ? context.trim() : undefined,
      },
      autoReply: autoReplyEnabled
        ? {
            enabled: true,
            mode: autoReplyMode,
            aiGenerate: true,
            delay: autoReplyDelay,
            useCompanyKnowledge,
          }
        : undefined,
    });

    onClose();
  };

  const handleDelete = () => {
    if (folder.isSystem) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
      onDelete?.(folder.id);
      onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#0F172A]">
              Paramètres du dossier
            </h2>
            <button
              onClick={onClose}
              className="text-[#64748B] hover:text-[#0F172A]"
            >
              ✕
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form key={folder?.id || 'new'} onSubmit={handleSubmit} className="space-y-6">
            {/* Infos générales */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#0F172A]">
                Informations générales
              </h3>

              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Nom du dossier
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as FolderType)}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                >
                  {folderTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                  Couleur
                </label>
                <div className="flex gap-2 flex-wrap">
                  {colorOptions.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        color === c
                          ? "border-[#0F172A] scale-110"
                          : "border-[#E5E7EB] hover:border-[#F97316]"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Classification automatique avec filtres */}
            <div className="space-y-4 pt-4 border-t border-[#E5E7EB]">
              <h3 className="text-sm font-semibold text-[#0F172A]">
                Classification automatique
              </h3>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoClassify}
                  onChange={(e) => setAutoClassify(e.target.checked)}
                  className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                />
                <span className="text-sm font-medium text-[#0F172A]">
                  Classer automatiquement les messages dans ce dossier avec l'IA
                </span>
              </label>

              {autoClassify && (
                <div className="pl-6 border-l-2 border-[#E5E7EB]">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1">
                      Context
                    </label>
                    <textarea
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      rows={4}
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                      placeholder="Ex: Messages de demande de rendez-vous, emails contenant 'rendez-vous', 'rdv', 'disponibilité' dans le sujet ou le contenu..."
                    />
                    <p className="text-xs text-[#64748B] mt-1">
                      Décrivez le contexte pour que l'IA classe automatiquement les messages dans ce dossier. L'IA analysera le sujet et le contenu des messages.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Réponses automatiques */}
            <div className="space-y-4 pt-4 border-t border-[#E5E7EB]">
              <h3 className="text-sm font-semibold text-[#0F172A]">
                Réponses automatiques
              </h3>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoReplyEnabled}
                  onChange={(e) => setAutoReplyEnabled(e.target.checked)}
                  className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                />
                <span className="text-sm font-medium text-[#0F172A]">
                  Activer les réponses automatiques pour ce dossier
                </span>
              </label>

              {autoReplyEnabled && (
                <div className="space-y-4 pl-6 border-l-2 border-[#E5E7EB]">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">
                      Mode de réponse
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="autoReplyMode"
                          value="none"
                          checked={autoReplyMode === "none"}
                          onChange={() => setAutoReplyMode("none")}
                          className="text-[#F97316] focus:ring-[#F97316]"
                        />
                        <span className="text-sm text-[#0F172A]">
                          Ne jamais répondre automatiquement
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="autoReplyMode"
                          value="approval"
                          checked={autoReplyMode === "approval"}
                          onChange={() => setAutoReplyMode("approval")}
                          className="text-[#F97316] focus:ring-[#F97316]"
                        />
                        <span className="text-sm text-[#0F172A]">
                          Proposer une réponse (validation requise)
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="autoReplyMode"
                          value="auto"
                          checked={autoReplyMode === "auto"}
                          onChange={() => setAutoReplyMode("auto")}
                          className="text-[#F97316] focus:ring-[#F97316]"
                        />
                        <span className="text-sm text-[#0F172A]">
                          Répondre automatiquement sans validation
                        </span>
                      </label>
                    </div>
                  </div>

                  {autoReplyMode !== "none" && (
                    <>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={useCompanyKnowledge}
                          onChange={(e) => setUseCompanyKnowledge(e.target.checked)}
                          className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                        />
                        <span className="text-sm text-[#0F172A]">
                          Utiliser la base de connaissances de l'entreprise
                        </span>
                      </label>

                      <div>
                        <label className="block text-sm font-medium text-[#0F172A] mb-1">
                          Délai avant envoi (minutes, optionnel)
                        </label>
                        <input
                          type="number"
                          value={autoReplyDelay || ""}
                          onChange={(e) =>
                            setAutoReplyDelay(
                              e.target.value ? parseInt(e.target.value) : undefined
                            )
                          }
                          min="0"
                          className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                          placeholder="0"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-[#E5E7EB]">
              {!folder.isSystem && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-lg border border-red-300 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Supprimer
                </button>
              )}
              <div className="flex-1" />
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#0F172A]"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
              >
                Enregistrer
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Supprimer le dossier"
        message={`Êtes-vous sûr de vouloir supprimer le dossier "${folder?.name}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
      />
    </div>
  );
}

