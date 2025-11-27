"use client";

import { useState, useEffect } from "react";
import { PageTitle } from "@/components/layout/PageTitle";
import { ModuleToggle } from "@/components/settings/ModuleToggle";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Toast } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/ui/Loader";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("company");
  const { toast, showToast, hideToast } = useToast();
  const { user } = useAuth();
  const {
    company,
    settings,
    isLoading,
    error,
    updateSettingsLocal,
    saveSettings,
  } = useSettings(false); // Ne pas recharger ici, déjà chargé dans AppLayout
  const [isSaving, setIsSaving] = useState(false);

  const tabs = [
    { id: "company", label: "Infos entreprise" },
    { id: "modules", label: "Modules activés" },
    { id: "ia", label: "Intelligence artificielle" },
    { id: "team", label: "Équipe" },
    { id: "integrations", label: "Intégrations" },
    { id: "notifications", label: "Notifications" },
  ];

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await saveSettings(settings.settings);
      showToast("Paramètres mis à jour avec succès", "success");
    } catch (err: any) {
      showToast(err.message || "Erreur lors de la mise à jour", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // TODO: Récupérer l'équipe depuis le backend
  const mockTeam = [
    { id: 1, name: "Jean Dupont", email: "jean@example.com", role: "owner" },
    { id: 2, name: "Marie Martin", email: "marie@example.com", role: "user" },
    { id: 3, name: "Pierre Durand", email: "pierre@example.com", role: "user" },
  ];

  return (
    <>
      <PageTitle title="Paramètres" />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Paramètres</h1>
          {company && (
            <p className="text-sm text-[#64748B] mt-1">
              Entreprise : <span className="font-medium text-[#0F172A]">{company.name}</span>
            </p>
          )}
        </div>

        {/* Erreur */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Loading */}
        {isLoading && !settings && (
          <Loader text="Chargement des paramètres de votre entreprise..." />
        )}

      {/* Tabs */}
      <div className="border-b border-[#E5E7EB]">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-[#F97316] text-[#F97316]"
                  : "border-transparent text-[#64748B] hover:border-[#FDBA74] hover:text-[#F97316]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {!isLoading && settings && (
      <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
        {activeTab === "company" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Nom de l'entreprise
              </label>
              <input
                type="text"
                defaultValue={company?.name || ""}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="Mon Commerce"
                disabled={user?.role === "user"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Secteur d'activité
              </label>
              <select
                defaultValue={company?.sector || ""}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                disabled={user?.role === "user"}
              >
                <option value="">Sélectionner un secteur</option>
                <option value="Commerce">Commerce</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Beauté / Coiffure">Beauté / Coiffure</option>
                <option value="Services">Services</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Email
              </label>
              <input
                type="email"
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="contact@moncommerce.fr"
                disabled={user?.role === "user"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Logo
              </label>
              <input
                type="file"
                accept="image/*"
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                disabled={user?.role === "user"}
              />
              <p className="text-xs text-[#64748B] mt-1">
                Formats acceptés : JPG, PNG (max 2MB)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Fuseau horaire
              </label>
              <select className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1" disabled={user?.role === "user"}>
                <option>Europe/Paris (UTC+1)</option>
                <option>Europe/London (UTC+0)</option>
                <option>America/New_York (UTC-5)</option>
              </select>
            </div>
            {user?.role !== "user" && (
              <div className="pt-4 border-t border-[#E5E7EB] flex justify-end">
                <button
                  type="button"
                  className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white px-6 py-2 text-sm font-medium shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
                >
                  Enregistrer les modifications
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "modules" && settings && (
          <div className="space-y-4">
            {user?.role !== "super_admin" && (
              <div className="rounded-lg border border-[#FED7AA] bg-[#FFF7ED] px-4 py-3 mb-4">
                <p className="text-sm text-[#9A3412]">
                  <strong>Gestion des modules :</strong> Les modules sont gérés par votre administrateur. 
                  Contactez-nous pour activer un module supplémentaire.
                </p>
              </div>
            )}
            <p className="text-sm text-[#64748B] mb-4">
              {user?.role === "super_admin"
                ? "Activez ou désactivez les modules selon vos besoins."
                : "Modules actuellement activés pour votre entreprise."}
            </p>
            <div className="space-y-0">
              <ModuleToggle
                label="Tâches"
                description="Gestion des tâches, checklists et planning interne."
                enabled={settings.settings.modules.tasks.enabled}
                onToggle={(enabled) => {
                  if (user?.role === "super_admin") {
                    updateSettingsLocal({
                      modules: {
                        ...settings.settings.modules,
                        tasks: { enabled },
                      },
                    });
                  }
                }}
                disabled={user?.role !== "super_admin"}
              />
              <ModuleToggle
                label="Inbox"
                description="Centralisation des échanges clients."
                enabled={settings.settings.modules.inbox.enabled}
                onToggle={(enabled) => {
                  if (user?.role === "super_admin") {
                    updateSettingsLocal({
                      modules: {
                        ...settings.settings.modules,
                        inbox: { enabled },
                      },
                    });
                  }
                }}
                disabled={user?.role !== "super_admin"}
              />
              <ModuleToggle
                label="Relances"
                description="Suivi et automatisation des relances clients."
                enabled={settings.settings.modules.relances.enabled}
                onToggle={(enabled) => {
                  if (user?.role === "super_admin") {
                    updateSettingsLocal({
                      modules: {
                        ...settings.settings.modules,
                        relances: { enabled },
                      },
                    });
                  }
                }}
                disabled={user?.role !== "super_admin"}
              />
              <ModuleToggle
                label="Projets / Dossiers"
                description="Suivi des dossiers et projets clients."
                enabled={settings.settings.modules.projects.enabled}
                onToggle={(enabled) => {
                  if (user?.role === "super_admin") {
                    updateSettingsLocal({
                      modules: {
                        ...settings.settings.modules,
                        projects: { enabled },
                      },
                    });
                  }
                }}
                disabled={user?.role !== "super_admin"}
              />
              <ModuleToggle
                label="Devis & Factures"
                description="Création, suivi et gestion des devis et factures."
                enabled={settings.settings.modules.billing?.enabled ?? true}
                onToggle={(enabled) => {
                  if (user?.role === "super_admin") {
                    updateSettingsLocal({
                      modules: {
                        ...settings.settings.modules,
                        billing: { enabled },
                      },
                    });
                  }
                }}
                disabled={user?.role !== "super_admin"}
              />
              <ModuleToggle
                label="Reporting"
                description="Tableaux de bord et statistiques."
                enabled={settings.settings.modules.reporting.enabled}
                onToggle={(enabled) => {
                  if (user?.role === "super_admin") {
                    updateSettingsLocal({
                      modules: {
                        ...settings.settings.modules,
                        reporting: { enabled },
                      },
                    });
                  }
                }}
                disabled={user?.role !== "super_admin"}
              />
              <ModuleToggle
                label="Chatbot interne"
                description="Assistant interne pour vous guider dans l'outil."
                enabled={settings.settings.modules.chatbot_internal.enabled}
                onToggle={(enabled) => {
                  if (user?.role === "super_admin") {
                    updateSettingsLocal({
                      modules: {
                        ...settings.settings.modules,
                        chatbot_internal: { enabled },
                      },
                    });
                  }
                }}
                disabled={user?.role !== "super_admin"}
              />
              <ModuleToggle
                label="Chatbot site web"
                description="Widget de chat pour votre site web."
                enabled={settings.settings.modules.chatbot_site.enabled}
                onToggle={(enabled) => {
                  if (user?.role === "super_admin") {
                    updateSettingsLocal({
                      modules: {
                        ...settings.settings.modules,
                        chatbot_site: { enabled },
                      },
                    });
                  }
                }}
                disabled={user?.role !== "super_admin"}
              />
            </div>
          </div>
        )}

        {activeTab === "ia" && settings && (
          <div className="space-y-4">
            <p className="text-sm text-[#64748B] mb-4">
              Configurez les fonctionnalités d'intelligence artificielle.
            </p>
            <div className="space-y-0">
              <ModuleToggle
                label="IA pour les relances"
                description="Génération automatique de messages de relance."
                enabled={settings.settings.ia.ai_relances}
                onToggle={(enabled) => {
                  updateSettingsLocal({
                    ia: {
                      ...settings.settings.ia,
                      ai_relances: enabled,
                    },
                  });
                }}
                disabled={user?.role === "user"}
              />
              <ModuleToggle
                label="Résumé IA de la journée"
                description="Synthèse automatique de vos priorités."
                enabled={settings.settings.ia.ai_summary}
                onToggle={(enabled) => {
                  updateSettingsLocal({
                    ia: {
                      ...settings.settings.ia,
                      ai_summary: enabled,
                    },
                  });
                }}
                disabled={user?.role === "user"}
              />
              <ModuleToggle
                label="Chatbot interne (aide dans l'app)"
                description="Assistant interne pour vous guider dans l'outil."
                enabled={settings.settings.ia.ai_chatbot_internal}
                onToggle={(enabled) => {
                  updateSettingsLocal({
                    ia: {
                      ...settings.settings.ia,
                      ai_chatbot_internal: enabled,
                    },
                  });
                }}
                disabled={user?.role === "user"}
              />
              <ModuleToggle
                label="Chatbot site web"
                description="IA pour répondre aux questions de vos clients sur votre site."
                enabled={settings.settings.ia.ai_chatbot_site}
                onToggle={(enabled) => {
                  updateSettingsLocal({
                    ia: {
                      ...settings.settings.ia,
                      ai_chatbot_site: enabled,
                    },
                  });
                }}
                disabled={user?.role === "user"}
              />
            </div>
          </div>
        )}

        {activeTab === "team" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-600">
                Gérez les membres de votre équipe.
              </p>
              <button className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2">
                Inviter un membre
              </button>
            </div>
            <div className="space-y-3">
              {mockTeam.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {member.name}
                    </p>
                    <p className="text-xs text-slate-500">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {member.role === "owner" ? "Propriétaire" : "Utilisateur"}
                    </span>
                    {member.role !== "owner" && (
                      <button className="text-xs text-red-600 hover:text-red-700">
                        Retirer
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "integrations" && (
          <div className="space-y-6">
            {/* Section Emails */}
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A] mb-3">
                Emails
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Adresse email principale
                  </label>
                  <input
                    type="email"
                    defaultValue={settings?.settings.integrations.email_from || ""}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    placeholder="contact@moncommerce.fr"
                    disabled={user?.role === "user"}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="use-for-reminders"
                    className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                    disabled={user?.role === "user"}
                  />
                  <label
                    htmlFor="use-for-reminders"
                    className="text-sm text-[#0F172A]"
                  >
                    Utiliser cette adresse pour les relances automatiques
                  </label>
                </div>
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                  <p className="text-xs text-[#64748B]">
                    TODO: Connecter plus tard : Gmail / Outlook
                  </p>
                </div>
              </div>
            </div>

            {/* Section Imports / Exports */}
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A] mb-3">
                Imports / Exports
              </h3>
              <div className="space-y-4">
                <p className="text-sm text-[#64748B]">
                  Évitez la saisie manuelle en important vos données depuis
                  Excel/CSV.
                </p>
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => {
                      showToast("Fonctionnalité d'import à venir", "info");
                    }}
                    className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
                  >
                    Importer des clients depuis un fichier Excel/CSV
                  </button>
                  <button
                    onClick={() => {
                      showToast("Export en cours de préparation...", "info");
                    }}
                    className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
                  >
                    Exporter mes données
                  </button>
                </div>
                <p className="text-xs text-[#64748B]">
                  TODO: Implémenter l'import/export (clients, devis, tâches)
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-4">
            <p className="text-sm text-[#64748B]">
              Configuration des notifications à venir.
            </p>
          </div>
        )}

        {/* Bouton Enregistrer pour modules et IA */}
        {(activeTab === "modules" || activeTab === "ia") && user?.role !== "user" && (
          <div className="pt-4 border-t border-[#E5E7EB] flex justify-end mt-6">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white px-6 py-2 text-sm font-medium shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
            >
              {isSaving ? "Enregistrement..." : user?.role === "super_admin" ? "Enregistrer les paramètres" : "Enregistrer les paramètres (IA uniquement)"}
            </button>
          </div>
        )}
      </div>
      )}

      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={hideToast}
        type={toast.type}
      />
      </div>
    </>
  );
}

