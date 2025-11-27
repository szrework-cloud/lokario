"use client";

import { useState } from "react";

interface AiActionsMenuProps {
  onGenerateShort: () => void;
  onGenerateDetailed: () => void;
  onSummarize: () => void;
  onIdentifyRequest: () => void;
}

export function AiActionsMenu({
  onGenerateShort,
  onGenerateDetailed,
  onSummarize,
  onIdentifyRequest,
}: AiActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#E5E7EB] bg-white text-sm font-medium text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#0F172A] shadow-sm"
        type="button"
      >
        <span className="text-base">🤖</span>
        <span>IA</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-20">
            <div className="p-2 space-y-1">
              <button
                onClick={() => {
                  onGenerateShort();
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#0F172A] hover:bg-[#F9FAFB]"
              >
                ✨ Générer réponse courte
              </button>
              <button
                onClick={() => {
                  onGenerateDetailed();
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#0F172A] hover:bg-[#F9FAFB]"
              >
                📝 Générer réponse détaillée
              </button>
              <button
                onClick={() => {
                  onSummarize();
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#0F172A] hover:bg-[#F9FAFB]"
              >
                📋 Résumer le message
              </button>
              <button
                onClick={() => {
                  onIdentifyRequest();
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#0F172A] hover:bg-[#F9FAFB]"
              >
                🔍 Identifier la demande
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

