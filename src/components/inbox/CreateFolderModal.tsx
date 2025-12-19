"use client";

import { useState, useEffect } from "react";
import { InboxFolder, FolderType } from "./types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { FolderFiltersConfig } from "./FolderFiltersConfig";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (folder: Omit<InboxFolder, "id" | "conversationIds" | "createdAt">) => void;
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

export function CreateFolderModal({ isOpen, onClose, onSave }: CreateFolderModalProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [type, setType] = useState<FolderType>("general");
  const [color, setColor] = useState(colorOptions[0]);
  const [autoClassify, setAutoClassify] = useState(false);
  const [context, setContext] = useState("");

  // Guard de permission
  useEffect(() => {
    if (isOpen && user?.role !== "owner" && user?.role !== "super_admin") {
      onClose();
    }
  }, [isOpen, user?.role, onClose]);

  if (!isOpen) return null;

  // Double vérification du guard
  if (user?.role !== "owner" && user?.role !== "super_admin") {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      type,
      color,
      isSystem: false,
      aiRules: {
        autoClassify,
        context: autoClassify && context.trim() ? context.trim() : undefined,
      },
    });

    // Reset form
    setName("");
    setType("general");
    setColor(colorOptions[0]);
    setAutoClassify(false);
    setPriority(10);
    setFilters({
      keywords: undefined,
      keywords_location: "any",
      sender_email: undefined,
      sender_domain: undefined,
      sender_phone: undefined,
      match_type: "any",
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#0F172A]">
              Créer un dossier
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
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Nom du dossier
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="Ex: Demande d'info/question"
                required
              />
            </div>

            {/* Type */}
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

            {/* Couleur */}
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

            {/* Classification automatique avec filtres */}
            <div className="space-y-4 pt-4 border-t border-[#E5E7EB]">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoClassify}
                  onChange={(e) => setAutoClassify(e.target.checked)}
                  className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                />
                <span className="text-sm font-medium text-[#0F172A]">
                  Classer automatiquement les messages dans ce dossier
                </span>
              </label>

              {autoClassify && (
                <div className="space-y-4 pl-6 border-l-2 border-[#E5E7EB]">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-1">
                      Priorité
                    </label>
                    <input
                      type="number"
                      value={priority}
                      onChange={(e) => setPriority(parseInt(e.target.value) || 10)}
                      min="1"
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                      placeholder="10"
                    />
                    <p className="text-xs text-[#64748B] mt-1">
                      Priorité du dossier (plus petit = plus prioritaire). Si un message correspond à plusieurs dossiers, il sera classé dans celui avec la plus haute priorité.
                    </p>
                  </div>

                  <FolderFiltersConfig
                    filters={filters}
                    onChange={(newFilters) => {
                      setFilters({
                        keywords: newFilters.keywords,
                        keywords_location: newFilters.keywords_location || "any",
                        sender_email: newFilters.sender_email,
                        sender_domain: newFilters.sender_domain,
                        sender_phone: newFilters.sender_phone,
                        match_type: newFilters.match_type || "any",
                      });
                    }}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#0F172A]"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
              >
                Créer
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

