"use client";

import { useState, useEffect } from "react";
import { AppointmentSettings } from "./types";
import { mockAppointmentSettings } from "./mockData";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";

export function AppointmentSettingsView() {
  const { user } = useAuth();
  const { company } = useSettings(false);
  const [settings, setSettings] = useState<AppointmentSettings>(mockAppointmentSettings);
  const [isSaving, setIsSaving] = useState(false);

  // Vérifier les permissions (owner/super_admin seulement)
  const canEdit = user?.role === "owner" || user?.role === "super_admin";

  // Générer le slug depuis le nom de l'entreprise (mock pour l'instant)
  const companySlug = company?.name
    ? company.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    : "mon-entreprise";

  useEffect(() => {
    // TODO: Charger les settings depuis l'API
    setSettings(mockAppointmentSettings);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Appel API pour sauvegarder les settings
      console.log("Save settings:", settings);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simuler l'appel API
      alert("Paramètres sauvegardés avec succès");
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  if (!canEdit) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-sm text-[#64748B]">
            Vous n'avez pas les permissions nécessaires pour modifier ces paramètres.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-[#0F172A]">Paramètres d'automatisation</h2>
          <p className="text-sm text-[#64748B] mt-1">
            Configurez les messages automatiques envoyés aux clients via l'Inbox.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Rappel automatique */}
          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoReminderEnabled}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, autoReminderEnabled: e.target.checked }))
                }
                className="mt-1 rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-[#0F172A]">
                  Envoyer automatiquement un rappel avant chaque rendez-vous
                </p>
                <p className="text-xs text-[#64748B] mt-1">
                  Le rappel est envoyé sous forme de message dans la conversation client, personnalisé par l'IA.
                </p>
              </div>
            </label>

            {settings.autoReminderEnabled && (
              <div className="pl-8 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Nombre d'heures avant le rendez-vous
                  </label>
                  <input
                    type="number"
                    value={settings.autoReminderOffsetHours}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        autoReminderOffsetHours: parseInt(e.target.value) || 4,
                      }))
                    }
                    min="1"
                    className="w-full max-w-xs rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.includeRescheduleLinkInReminder}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        includeRescheduleLinkInReminder: e.target.checked,
                      }))
                    }
                    className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                  />
                  <span className="text-sm text-[#0F172A]">
                    Inclure un lien de reprogrammation dans le rappel
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Message no show */}
          <div className="pt-4 border-t border-[#E5E7EB]">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoNoShowMessageEnabled}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, autoNoShowMessageEnabled: e.target.checked }))
                }
                className="mt-1 rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-[#0F172A]">
                  Après un "no show", envoyer automatiquement un message avec lien de reprogrammation
                </p>
                <p className="text-xs text-[#64748B] mt-1">
                  Un message sera automatiquement envoyé dans la conversation client lorsqu'un rendez-vous est marqué comme "no show".
                </p>
              </div>
            </label>
          </div>

          {/* URL publique de réservation */}
          <div className="pt-4 border-t border-[#E5E7EB]">
            <label className="block text-sm font-medium text-[#0F172A] mb-2">
              URL publique de réservation
            </label>
            <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
              <div className="flex items-center gap-2 mb-2">
                <code className="flex-1 px-3 py-2 bg-white rounded border border-[#E5E7EB] text-sm text-[#0F172A]">
                  {typeof window !== "undefined" ? window.location.origin : "https://lokario.fr"}/r/{companySlug}
                </code>
                <button
                  onClick={() => {
                    const url = `${typeof window !== "undefined" ? window.location.origin : "https://lokario.fr"}/r/${companySlug}`;
                    navigator.clipboard.writeText(url);
                    alert("URL copiée dans le presse-papiers !");
                  }}
                  className="px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#0F172A] hover:bg-white"
                >
                  Copier
                </button>
              </div>
              <p className="text-xs text-[#64748B]">
                Partagez cette URL avec vos clients ou intégrez-la sur votre site web pour qu'ils puissent prendre rendez-vous en ligne.
              </p>
            </div>
          </div>

          {/* URL de reprogrammation */}
          <div className="pt-4 border-t border-[#E5E7EB]">
            <label className="block text-sm font-medium text-[#0F172A] mb-1">
              URL de base pour la reprogrammation
            </label>
            <input
              type="text"
              value={settings.rescheduleBaseUrl || ""}
              onChange={(e) =>
                setSettings((prev) => ({ ...prev, rescheduleBaseUrl: e.target.value }))
              }
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              placeholder="https://mon-saas.com/r/{slugEntreprise}"
            />
            <p className="text-xs text-[#64748B] mt-1">
              Utilisez {"{slugEntreprise}"} comme placeholder pour l'identifiant de votre entreprise.
            </p>
          </div>

          {/* Bouton sauvegarder */}
          <div className="pt-4 border-t border-[#E5E7EB]">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-6 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? "Sauvegarde..." : "Sauvegarder les paramètres"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

