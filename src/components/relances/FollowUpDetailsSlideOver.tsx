"use client";

import { useState } from "react";
import { FollowUpItem } from "./types";
import { Tag } from "@/components/ui/Tag";
import Link from "next/link";

interface FollowUpHistoryItem {
  id: number;
  date: string;
  message: string;
  status: "envoyé" | "lu" | "répondu";
  sentBy?: string;
}

interface FollowUpDetailsSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  followUp: FollowUpItem | null;
  history?: FollowUpHistoryItem[];
  onGenerateMessage: (item: FollowUpItem) => void;
  onMarkAsDone: (id: number) => void;
}

export function FollowUpDetailsSlideOver({
  isOpen,
  onClose,
  followUp,
  history = [],
  onGenerateMessage,
  onMarkAsDone,
}: FollowUpDetailsSlideOverProps) {
  if (!isOpen || !followUp) return null;

  // Mock data pour l'automatisation (UI only)
  const [isAutoEnabled, setIsAutoEnabled] = useState(false);
  const [autoFrequency, setAutoFrequency] = useState("7");

  const statusVariant = {
    "À faire": "error" as const,
    "Fait": "success" as const,
    "En attente": "warning" as const,
  };

  return (
    <div className="fixed inset-0 z-40 overflow-hidden pointer-events-none">
      {/* Backdrop invisible mais cliquable pour fermer */}
      <div
        className="absolute inset-0 pointer-events-auto"
        onClick={onClose}
      />

      {/* Slide-over */}
      <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-lg overflow-y-auto transform transition-transform ease-in-out duration-300 translate-x-0 pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB] bg-white sticky top-0 z-10">
          <h3 className="text-lg font-semibold text-[#0F172A]">Détails de la relance</h3>
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-[#0F172A] text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Informations principales */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide">
              Informations
            </h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-[#64748B]">Type:</span>
                <span className="ml-2 font-medium text-[#0F172A]">{followUp.type}</span>
              </div>
              <div>
                <span className="text-[#64748B]">Client:</span>
                <Link
                  href={`/app/clients?client=${encodeURIComponent(followUp.client)}`}
                  className="ml-2 font-medium text-[#F97316] hover:text-[#EA580C]"
                >
                  {followUp.client}
                </Link>
              </div>
              <div>
                <span className="text-[#64748B]">Source:</span>
                <span className="ml-2 font-medium text-[#0F172A]">{followUp.source}</span>
              </div>
              <div>
                <span className="text-[#64748B]">Date limite:</span>
                <span className="ml-2 font-medium text-[#0F172A]">{followUp.dueDate}</span>
              </div>
              <div>
                <span className="text-[#64748B]">Statut:</span>
                <span className="ml-2">
                  <Tag variant={statusVariant[followUp.status]}>{followUp.status}</Tag>
                </span>
              </div>
              {followUp.amount && (
                <div>
                  <span className="text-[#64748B]">Montant:</span>
                  <span className="ml-2 font-medium text-[#0F172A]">{followUp.amount} €</span>
                </div>
              )}
            </div>
          </div>

          {/* Historique des relances */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide">
              Historique des relances
            </h4>
            {history.length === 0 ? (
              <p className="text-sm text-[#64748B]">Aucune relance envoyée pour le moment.</p>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[#64748B]">
                        {new Date(item.date).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <Tag
                        variant={
                          item.status === "répondu"
                            ? "success"
                            : item.status === "lu"
                            ? "info"
                            : "default"
                        }
                      >
                        {item.status}
                      </Tag>
                    </div>
                    <p className="text-sm text-[#0F172A]">{item.message}</p>
                    {item.sentBy && (
                      <p className="text-xs text-[#64748B] mt-1">Par {item.sentBy}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide">
              Actions
            </h4>
            <div className="space-y-2">
              <button
                onClick={() => {
                  onGenerateMessage(followUp);
                  onClose();
                }}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
              >
                ✨ Générer prochain message
              </button>
              {followUp.clientId && (
                <Link
                  href={`/app/inbox?clientId=${followUp.clientId}`}
                  onClick={() => console.log("Open inbox for client:", followUp.clientId)}
                  className="block w-full text-center rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
                >
                  Ouvrir conversation
                </Link>
              )}
              {followUp.status !== "Fait" && (
                <button
                  onClick={() => {
                    onMarkAsDone(followUp.id);
                    onClose();
                  }}
                  className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
                >
                  Marquer comme fait
                </button>
              )}
            </div>
          </div>

          {/* Automatisation */}
          <div className="space-y-3 pt-4 border-t border-[#E5E7EB]">
            <h4 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide">
              Automatisation
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">Relance automatique</p>
                  <p className="text-xs text-[#64748B]">
                    Envoyer des relances automatiquement jusqu'à réponse
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAutoEnabled}
                    onChange={(e) => setIsAutoEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#E5E7EB] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#F97316] peer-focus:ring-offset-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F97316]"></div>
                </label>
              </div>

              {isAutoEnabled && (
                <div className="space-y-2 pl-4 border-l-2 border-[#F97316]">
                  <label className="text-sm font-medium text-[#0F172A]">
                    Fréquence de relance
                  </label>
                  <select
                    value={autoFrequency}
                    onChange={(e) => setAutoFrequency(e.target.value)}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  >
                    <option value="3">Tous les 3 jours</option>
                    <option value="7">Tous les 7 jours</option>
                    <option value="14">Tous les 14 jours</option>
                  </select>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="until-response"
                      defaultChecked
                      className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                    />
                    <label htmlFor="until-response" className="text-xs text-[#64748B]">
                      Jusqu'à réponse du client
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

