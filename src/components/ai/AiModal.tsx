"use client";

import { ReactNode } from "react";
import { AiActionButton } from "./AiActionButton";

interface AiModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  context?: ReactNode;
  initialValue?: string;
  onGenerate: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export function AiModal({
  isOpen,
  onClose,
  title,
  context,
  initialValue = "",
  onGenerate,
  placeholder = "Votre message...",
  label = "Message",
}: AiModalProps) {
  if (!isOpen) return null;

  const handleGenerate = () => {
    // TODO: call AI backend to generate message
    // Pour l'instant, on simule avec un texte d'exemple
    const exampleText = `(IA) Exemple de message adapté au contexte du client. Ce texte sera généré par l'IA en fonction du type de relance, du client et de l'historique.`;
    onGenerate(exampleText);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between border-l-4 border-[#F97316] pl-4">
          <h2 className="text-xl font-semibold text-[#0F172A]">{title}</h2>
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#F97316] rounded"
          >
            ✕
          </button>
        </div>

        {context && (
          <div className="mb-4 rounded-lg border border-[#E5E7EB] bg-slate-50 p-4">
            {context}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {label}
          </label>
          <textarea
            id="ai-message"
            value={initialValue}
            onChange={(e) => {
              // Pour permettre l'édition manuelle
              const textarea = document.getElementById("ai-message") as HTMLTextAreaElement;
              if (textarea) {
                textarea.value = e.target.value;
                onGenerate(e.target.value);
              }
            }}
            className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
            rows={6}
            placeholder={placeholder}
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
          >
            Annuler
          </button>
          <AiActionButton
            onClick={handleGenerate}
            label="Remplir avec l'IA"
          />
          <button
            onClick={() => {
              // TODO: Envoyer le message (appel backend)
              onClose();
            }}
            className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}

