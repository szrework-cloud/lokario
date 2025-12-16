"use client";

import { useState, useEffect } from "react";
import { FollowUpItem } from "./types";
import { Tag } from "@/components/ui/Tag";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { logger } from "@/lib/logger";
import {
  updateFollowUp, 
  getFollowUpSettings,
  deleteFollowUp,
  type FollowUpSettings 
} from "@/services/followupsService";

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
  onDelete?: (id: number) => void; // Callback pour supprimer la relance
  onUpdate?: () => void; // Callback pour recharger les données après mise à jour
}

export function FollowUpDetailsSlideOver({
  isOpen,
  onClose,
  followUp,
  history = [],
  onGenerateMessage,
  onMarkAsDone,
  onDelete,
  onUpdate,
}: FollowUpDetailsSlideOverProps) {
  const { token } = useAuth();
  const { showToast } = useToast();
  
  // État pour l'automatisation de la relance
  const [isAutoEnabled, setIsAutoEnabled] = useState(followUp?.autoEnabled || false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // État pour la configuration IA globale (pour info seulement)
  const [settings, setSettings] = useState<FollowUpSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  // Charger les settings au montage
  useEffect(() => {
    if (isOpen && token) {
      loadSettings();
    }
  }, [isOpen, token]);

  // Mettre à jour les valeurs locales quand followUp change
  useEffect(() => {
    if (followUp) {
      setIsAutoEnabled(followUp.autoEnabled || false);
      setHasChanges(false);
    }
  }, [followUp]);

  const loadSettings = async () => {
    if (!token) return;
    
    setIsLoadingSettings(true);
    try {
      const loadedSettings = await getFollowUpSettings(token);
      setSettings(loadedSettings);
    } catch (error) {
      console.error("Erreur lors du chargement des settings:", error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleSave = async () => {
    if (!token || !followUp) return;

    setIsSaving(true);
    try {
      // Utiliser la configuration IA globale pour les paramètres
      const frequencyDays = settings && settings.relance_delays.length > 0 
        ? settings.relance_delays[0] 
        : 7;
      
      await updateFollowUp(
        followUp.id,
        {
          autoEnabled: isAutoEnabled,
          autoFrequencyDays: isAutoEnabled ? frequencyDays : null,
          // Utiliser les conditions d'arrêt de la config IA globale
          autoStopOnResponse: settings?.stop_conditions.stop_on_client_response ?? true,
          autoStopOnPaid: settings?.stop_conditions.stop_on_invoice_paid ?? true,
          autoStopOnRefused: settings?.stop_conditions.stop_on_quote_refused ?? true,
        },
        token
      );

      showToast("Configuration sauvegardée avec succès", "success");
      setHasChanges(false);
      
      // Recharger les données si un callback est fourni
      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde:", error);
      showToast(`Erreur lors de la sauvegarde: ${error.message || "Erreur inconnue"}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Détecter les changements
  useEffect(() => {
    if (followUp) {
      const changed = isAutoEnabled !== (followUp.autoEnabled || false);
      setHasChanges(changed);
    }
  }, [isAutoEnabled, followUp]);

  const handleDelete = () => {
    if (!followUp) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!token || !followUp) return;
    
    setIsDeleting(true);
    try {
      await deleteFollowUp(followUp.id, token);
      showToast("Relance supprimée avec succès", "success");
      setShowDeleteConfirm(false);
      onClose();
      
      // Appeler le callback de suppression
      if (onDelete) {
        onDelete(followUp.id);
      }
      
      // Recharger les données si un callback est fourni
      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      console.error("Erreur lors de la suppression:", error);
      showToast(`Erreur lors de la suppression: ${error.message || "Erreur inconnue"}`, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen || !followUp) return null;

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
              {!(followUp.autoEnabled && followUp.status === "Fait") && (
                <div>
                  <span className="text-[#64748B]">Date limite:</span>
                  <span className="ml-2 font-medium text-[#0F172A]">
                    {followUp.autoEnabled && followUp.status !== "Fait" ? (() => {
                      // Pour les relances automatiques, dueDate contient déjà la date ISO complète
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const dueDate = new Date(followUp.dueDate);
                      dueDate.setHours(0, 0, 0, 0);
                      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                      if (diffDays > 0) {
                        return `Dans ${diffDays} jour${diffDays > 1 ? "s" : ""}`;
                      } else if (diffDays === 0) {
                        return "Aujourd'hui";
                      } else {
                        return "En retard";
                      }
                    })() : followUp.dueDate}
                  </span>
                </div>
              )}
              {/* Informations sur les relances envoyées */}
              {followUp.hasBeenSent && (
                <div>
                  <span className="text-[#64748B]">Relances envoyées:</span>
                  <span className="ml-2 font-medium text-[#0F172A]">
                    {followUp.totalSent} relance{followUp.totalSent > 1 ? "s" : ""}
                    {followUp.autoEnabled && followUp.remainingRelances !== null && followUp.remainingRelances > 0 && (
                      <span className="text-[#64748B]">
                        {" "}({followUp.remainingRelances} restante{followUp.remainingRelances > 1 ? "s" : ""})
                      </span>
                    )}
                  </span>
                </div>
              )}
              <div>
                <span className="text-[#64748B]">Statut:</span>
                <span className="ml-2">
                  {followUp.autoEnabled && followUp.status !== "Fait" ? (() => {
                    // Pour les relances automatiques, dueDate contient déjà la date ISO complète
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dueDate = new Date(followUp.dueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    
                    // Afficher le statut professionnel avec le numéro de relance
                    const statusText = followUp.nextRelanceNumber 
                      ? `Relance ${followUp.nextRelanceNumber}${followUp.remainingRelances !== null ? `/${followUp.totalSent + (followUp.remainingRelances || 0)}` : ''}`
                      : followUp.hasBeenSent 
                        ? `${followUp.totalSent} relance${followUp.totalSent > 1 ? 's' : ''} envoyée${followUp.totalSent > 1 ? 's' : ''}`
                        : 'Relance initiale';
                    
                    if (diffDays > 0) {
                      return (
                        <Tag variant="warning">
                          {statusText} - Dans {diffDays} jour{diffDays > 1 ? "s" : ""}
                        </Tag>
                      );
                    } else if (diffDays === 0) {
                      return (
                        <Tag variant="error">
                          {statusText} - Aujourd'hui
                        </Tag>
                      );
                    } else {
                      return (
                        <Tag variant="error">
                          {statusText} - En retard de {Math.abs(diffDays)} jour{Math.abs(diffDays) > 1 ? "s" : ""}
                        </Tag>
                      );
                    }
                  })() : (
                    <Tag variant={statusVariant[followUp.status]}>
                      {followUp.status}
                      {followUp.hasBeenSent && ` (${followUp.totalSent} envoyée${followUp.totalSent > 1 ? 's' : ''})`}
                    </Tag>
                  )}
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
                  onClick={() => logger.log("Open inbox for client:", followUp.clientId)}
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
              <button
                onClick={handleDelete}
                className="w-full rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 hover:border-red-400 transition-colors"
              >
                🗑️ Supprimer la relance
              </button>
            </div>
          </div>

          {/* Modal de confirmation de suppression */}
          {showDeleteConfirm && (
            <>
              {/* Overlay noir */}
              <div 
                className="fixed inset-0 z-50 bg-black/50"
                onClick={() => !isDeleting && setShowDeleteConfirm(false)}
              />
              {/* Modal centré au milieu de l'écran */}
              <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                <div 
                  onClick={(e) => e.stopPropagation()} 
                  className="bg-white rounded-lg shadow-xl p-4 text-center pointer-events-auto w-64"
                >
                  <p className="text-xs text-[#64748B] mb-3">
                    Supprimer cette relance ?
                  </p>
                  
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setIsDeleting(false);
                      }}
                      disabled={isDeleting}
                      className="text-xs px-3 py-1"
                    >
                      Annuler
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={confirmDelete}
                      disabled={isDeleting}
                      className="text-xs px-3 py-1"
                    >
                      {isDeleting ? "Suppression..." : "Supprimer"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Automatisation */}
          <div className="space-y-3 pt-4 border-t border-[#E5E7EB]">
            <h4 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide">
              Automatisation
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#0F172A]">Relance automatique</p>
                  <p className="text-xs text-[#64748B] mt-1">
                    {settings ? (
                      <>
                        Utilise la configuration IA : {settings.max_relances} relances max, 
                        délais de {settings.relance_delays.join(", ")} jours
                      </>
                    ) : (
                      "Envoyer des relances automatiquement selon la configuration IA"
                    )}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={isAutoEnabled}
                    onChange={(e) => {
                      setIsAutoEnabled(e.target.checked);
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#E5E7EB] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#F97316] peer-focus:ring-offset-2 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F97316]"></div>
                </label>
              </div>

              {/* Bouton sauvegarder */}
              {hasChanges && (
                <div className="pt-2">
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || isLoadingSettings}
                    className="w-full"
                    size="sm"
                  >
                    {isSaving ? "Sauvegarde..." : "💾 Sauvegarder"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

