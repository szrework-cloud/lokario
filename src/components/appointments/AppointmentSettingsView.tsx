"use client";

import { useState, useEffect } from "react";
import { AppointmentSettings } from "@/services/appointmentsService";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import {
  getAppointmentSettings,
  updateAppointmentSettings as updateAppointmentSettingsAPI,
} from "@/services/appointmentsService";

export function AppointmentSettingsView() {
  const { user } = useAuth();
  const { company } = useSettings(false);
  const { token } = useAuth();
  const [settings, setSettings] = useState<AppointmentSettings>({
    autoReminderEnabled: true,
    autoReminderOffsetHours: 4,
    includeRescheduleLinkInReminder: true,
    autoNoShowMessageEnabled: true,
    rescheduleBaseUrl: typeof window !== "undefined" ? `${window.location.origin}/r/{slugEntreprise}` : "https://lokario.fr/r/{slugEntreprise}",
    workStartTime: "09:00",
    workEndTime: "18:00",
    breaksEnabled: false,
    breaks: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Vérifier les permissions (owner/super_admin seulement)
  const canEdit = user?.role === "owner" || user?.role === "super_admin";

  // Utiliser le slug de la base de données, ou le générer depuis le nom si absent
  const companySlug = company?.slug 
    ? company.slug
    : (company?.name
        ? company.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
        : "mon-entreprise");

  useEffect(() => {
    const loadSettings = async () => {
      if (!token) return;
      
      setIsLoading(true);
      try {
        const settingsData = await getAppointmentSettings(token);
        // Si l'URL de reprogrammation n'est pas définie, préremplir avec l'URL par défaut
        if (!settingsData.rescheduleBaseUrl) {
          const defaultUrl = `${typeof window !== "undefined" ? window.location.origin : "https://lokario.fr"}/r/{slugEntreprise}`;
          settingsData.rescheduleBaseUrl = defaultUrl;
        }
        setSettings(settingsData);
      } catch (err) {
        console.error("Erreur lors du chargement des paramètres:", err);
        // Même en cas d'erreur, initialiser avec l'URL par défaut
        setSettings({
          autoReminderEnabled: true,
          autoReminderOffsetHours: 4,
          includeRescheduleLinkInReminder: true,
          autoNoShowMessageEnabled: true,
          rescheduleBaseUrl: `${typeof window !== "undefined" ? window.location.origin : "https://lokario.fr"}/r/{slugEntreprise}`,
          workStartTime: "09:00",
          workEndTime: "18:00",
          breaksEnabled: false,
          breaks: [],
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [token]);

  const handleSave = async () => {
    if (!token) return;
    
    setIsSaving(true);
    try {
      await updateAppointmentSettingsAPI(token, settings);
      alert("Paramètres sauvegardés avec succès");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      alert(error.message || "Erreur lors de la sauvegarde");
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-[#64748B]">Chargement des paramètres...</p>
      </div>
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

          {/* Horaires de travail */}
          <div className="pt-4 border-t border-[#E5E7EB]">
            <h3 className="text-base font-semibold text-[#0F172A] mb-4">Horaires de travail</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Heure de début
                  </label>
                  <input
                    type="time"
                    value={settings.workStartTime || "09:00"}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, workStartTime: e.target.value }))
                    }
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Heure de fin
                  </label>
                  <input
                    type="time"
                    value={settings.workEndTime || "18:00"}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, workEndTime: e.target.value }))
                    }
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  />
                </div>
              </div>

              {/* Pauses entre rendez-vous */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.breaksEnabled || false}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, breaksEnabled: e.target.checked }))
                    }
                    className="mt-1 rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#0F172A]">
                      Activer les pauses entre les rendez-vous
                    </p>
                    <p className="text-xs text-[#64748B] mt-1">
                      Définir des pauses automatiques entre les rendez-vous pour permettre une transition.
                    </p>
                  </div>
                </label>

                {settings.breaksEnabled && (
                  <div className="pl-8 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        {(settings.breaks || []).map((breakItem, index) => (
                          <div key={index} className="border border-[#E5E7EB] rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-sm font-medium text-[#0F172A]">
                                Pause {index + 1}
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const newBreaks = [...(settings.breaks || [])];
                                  newBreaks.splice(index, 1);
                                  setSettings((prev) => ({ ...prev, breaks: newBreaks }));
                                }}
                                className="text-xs text-red-600 hover:text-red-700 font-medium"
                              >
                                Supprimer
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                                  Heure de début
                                </label>
                                <input
                                  type="time"
                                  value={breakItem.startTime}
                                  onChange={(e) => {
                                    const newBreaks = [...(settings.breaks || [])];
                                    newBreaks[index] = { ...newBreaks[index], startTime: e.target.value };
                                    setSettings((prev) => ({ ...prev, breaks: newBreaks }));
                                  }}
                                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                                  Heure de fin
                                </label>
                                <input
                                  type="time"
                                  value={breakItem.endTime}
                                  onChange={(e) => {
                                    const newBreaks = [...(settings.breaks || [])];
                                    newBreaks[index] = { ...newBreaks[index], endTime: e.target.value };
                                    setSettings((prev) => ({ ...prev, breaks: newBreaks }));
                                  }}
                                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newBreaks = [...(settings.breaks || []), { startTime: "12:00", endTime: "13:00" }];
                          setSettings((prev) => ({ ...prev, breaks: newBreaks }));
                        }}
                        className="text-sm text-[#F97316] hover:text-[#EA580C] font-medium"
                      >
                        + Ajouter une pause
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* URL de reprogrammation */}
          <div className="pt-4 border-t border-[#E5E7EB]">
            <label className="block text-sm font-medium text-[#0F172A] mb-2">
              URL de base pour la reprogrammation
            </label>
            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  value={settings.rescheduleBaseUrl || ""}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, rescheduleBaseUrl: e.target.value }))
                  }
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  placeholder={`${typeof window !== "undefined" ? window.location.origin : "https://lokario.fr"}/r/{slugEntreprise}`}
                />
                <div className="mt-2 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs font-medium text-green-900 mb-2">✅ Comment utiliser cette URL ?</p>
                  <div className="space-y-2 text-xs text-green-800">
                    <p>
                      <strong>1. Laissez le placeholder {"{slugEntreprise}"} dans l'URL</strong><br />
                      Ne remplacez PAS {"{slugEntreprise}"} par votre slug réel. Le système le remplacera automatiquement.
                    </p>
                    <p>
                      <strong>2. Exemple d'URL à mettre :</strong><br />
                      <code className="bg-green-100 px-2 py-1 rounded block mt-1">
                        {typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/r/{"{slugEntreprise}"}
                      </code>
                    </p>
                    <p>
                      <strong>3. Votre slug réel :</strong> <code className="bg-green-100 px-1 rounded">{companySlug}</code>
                    </p>
                    <p>
                      <strong>4. URL finale générée (exemple avec RDV #123) :</strong><br />
                      <code className="bg-green-100 px-2 py-1 rounded block mt-1 text-[10px]">
                        {typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/r/{companySlug}?appointmentId=123
                      </code>
                    </p>
                  </div>
                </div>
                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-900 mb-1">💡 Comment ça fonctionne ?</p>
                  <p className="text-xs text-blue-800">
                    Quand un message de rappel ou de no-show est envoyé, le système remplace automatiquement {"{slugEntreprise}"} par votre slug réel (<code className="bg-blue-100 px-1 rounded">{companySlug}</code>) et ajoute l'ID du rendez-vous.
                  </p>
                </div>
              </div>
              
              {/* Exemple d'URL générée */}
              {settings.rescheduleBaseUrl && (
                <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
                  <p className="text-xs font-medium text-[#0F172A] mb-1">Exemple d'URL générée (sans appointmentId) :</p>
                  <code className="text-xs text-[#64748B] break-all">
                    {settings.rescheduleBaseUrl.replace("{slugEntreprise}", companySlug)}
                  </code>
                  <p className="text-xs text-[#64748B] mt-2">
                    Dans les messages, cette URL sera complétée avec <code className="bg-gray-100 px-1 rounded">?appointmentId=XXX</code> pour identifier le rendez-vous à reprogrammer.
                  </p>
                </div>
              )}
              
              {/* Bouton pour réinitialiser à l'URL par défaut */}
              {settings.rescheduleBaseUrl && settings.rescheduleBaseUrl !== `${typeof window !== "undefined" ? window.location.origin : "https://lokario.fr"}/r/{slugEntreprise}` && (
                <button
                  type="button"
                  onClick={() => {
                    const defaultUrl = `${typeof window !== "undefined" ? window.location.origin : "https://lokario.fr"}/r/{slugEntreprise}`;
                    setSettings((prev) => ({ ...prev, rescheduleBaseUrl: defaultUrl }));
                  }}
                  className="text-xs text-[#F97316] hover:text-[#EA580C] font-medium"
                >
                  Réinitialiser à l'URL par défaut
                </button>
              )}
            </div>
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

