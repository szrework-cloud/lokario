"use client";

import { useState } from "react";
import { ModuleToggle } from "@/components/settings/ModuleToggle";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { PreviewModal } from "@/components/admin/PreviewModal";

type ModuleConfig = {
  tasks: { enabled: boolean };
  inbox: { enabled: boolean };
  relances: { enabled: boolean };
  projects: { enabled: boolean };
  billing: { enabled: boolean };
  reporting: { enabled: boolean };
  chatbot_internal: { enabled: boolean };
  chatbot_site: { enabled: boolean };
};

type IaConfig = {
  ai_relances: boolean;
  ai_summary: boolean;
  ai_chatbot_internal: boolean;
  ai_chatbot_site: boolean;
};

type PackSettings = {
  modules: ModuleConfig;
  ia: IaConfig;
};

export default function PacksPage() {
  const { toast, showToast, hideToast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [settings, setSettings] = useState<PackSettings>({
    modules: {
      tasks: { enabled: true },
      inbox: { enabled: true },
      relances: { enabled: true },
      projects: { enabled: true },
      billing: { enabled: true },
      reporting: { enabled: true },
      chatbot_internal: { enabled: true },
      chatbot_site: { enabled: false },
    },
    ia: {
      ai_relances: true,
      ai_summary: true,
      ai_chatbot_internal: true,
      ai_chatbot_site: false,
    },
  });

  const handleModuleToggle = (
    key: keyof ModuleConfig,
    enabled: boolean
  ) => {
    setSettings({
      ...settings,
      modules: {
        ...settings.modules,
        [key]: { enabled },
      },
    });
  };

  const handleIaToggle = (key: keyof IaConfig, enabled: boolean) => {
    setSettings({
      ...settings,
      ia: {
        ...settings.ia,
        [key]: enabled,
      },
    });
  };

  const handleSave = () => {
    // TODO: Sauvegarder la configuration du pack (créer un endpoint backend si nécessaire)
    showToast("Configuration du pack sauvegardée", "success");
  };

  const handleSelectAllModules = () => {
    setSettings({
      ...settings,
      modules: {
        tasks: { enabled: true },
        inbox: { enabled: true },
        relances: { enabled: true },
        projects: { enabled: true },
        billing: { enabled: true },
        reporting: { enabled: true },
        chatbot_internal: { enabled: true },
        chatbot_site: { enabled: true },
      },
    });
  };

  const handleDeselectAllModules = () => {
    setSettings({
      ...settings,
      modules: {
        tasks: { enabled: false },
        inbox: { enabled: false },
        relances: { enabled: false },
        projects: { enabled: false },
        billing: { enabled: false },
        reporting: { enabled: false },
        chatbot_internal: { enabled: false },
        chatbot_site: { enabled: false },
      },
    });
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Gestion des Packs</h1>
          <p className="mt-2 text-sm text-[#64748B]">
            Configurez les modules disponibles pour les packs d'abonnement
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0F172A]">Modules</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAllModules}
                  className="text-xs px-3 py-1 rounded-lg border border-[#E5E7EB] text-[#64748B] hover:bg-[#F9FAFB]"
                >
                  Tout activer
                </button>
                <button
                  onClick={handleDeselectAllModules}
                  className="text-xs px-3 py-1 rounded-lg border border-[#E5E7EB] text-[#64748B] hover:bg-[#F9FAFB]"
                >
                  Tout désactiver
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-0">
            <ModuleToggle
              label="Tâches"
              description="Gestion des tâches, to-do, checklists."
              enabled={settings.modules.tasks.enabled}
              onToggle={(v) => handleModuleToggle("tasks", v)}
            />
            <ModuleToggle
              label="Inbox"
              description="Centralisation des emails et messages client."
              enabled={settings.modules.inbox.enabled}
              onToggle={(v) => handleModuleToggle("inbox", v)}
            />
            <ModuleToggle
              label="Relances"
              description="Relances devis, factures, paiements."
              enabled={settings.modules.relances.enabled}
              onToggle={(v) => handleModuleToggle("relances", v)}
            />
            <ModuleToggle
              label="Projets / Dossiers"
              description="Suivi des dossiers clients, chantiers, projets."
              enabled={settings.modules.projects.enabled}
              onToggle={(v) => handleModuleToggle("projects", v)}
            />
            <ModuleToggle
              label="Devis & Factures"
              description="Création, suivi et gestion des devis et factures."
              enabled={settings.modules.billing.enabled}
              onToggle={(v) => handleModuleToggle("billing", v)}
            />
            <ModuleToggle
              label="Reporting"
              description="Reporting et tableaux de bord."
              enabled={settings.modules.reporting.enabled}
              onToggle={(v) => handleModuleToggle("reporting", v)}
            />
            <ModuleToggle
              label="Chatbot interne"
              description="Assistant interne pour vous guider dans l'outil."
              enabled={settings.modules.chatbot_internal.enabled}
              onToggle={(v) => handleModuleToggle("chatbot_internal", v)}
            />
            <ModuleToggle
              label="Chatbot site web"
              description="Widget de chat sur le site du client."
              enabled={settings.modules.chatbot_site.enabled}
              onToggle={(v) => handleModuleToggle("chatbot_site", v)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#0F172A]">
              Intelligence artificielle
            </h2>
          </CardHeader>
          <CardContent className="space-y-0">
            <ModuleToggle
              label="IA pour les relances"
              description="Génération automatique des messages de relance."
              enabled={settings.ia.ai_relances}
              onToggle={(v) => handleIaToggle("ai_relances", v)}
            />
            <ModuleToggle
              label="Résumé IA de la journée"
              description="Synthèse des priorités et tâches."
              enabled={settings.ia.ai_summary}
              onToggle={(v) => handleIaToggle("ai_summary", v)}
            />
            <ModuleToggle
              label="Chatbot interne (IA)"
              description="Assistant IA pour les équipes du client dans l'app."
              enabled={settings.ia.ai_chatbot_internal}
              onToggle={(v) => handleIaToggle("ai_chatbot_internal", v)}
            />
            <ModuleToggle
              label="Chatbot site web (IA)"
              description="IA pour répondre aux questions de vos clients sur votre site."
              enabled={settings.ia.ai_chatbot_site}
              onToggle={(v) => handleIaToggle("ai_chatbot_site", v)}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowPreview(true)}
            className="rounded-xl border border-[#E5E7EB] bg-white px-6 py-2 text-sm font-medium text-[#0F172A] shadow-sm hover:bg-[#F9FAFB] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
          >
            Prévisualisation
          </button>
          <button
            onClick={handleSave}
            className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white px-6 py-2 text-sm font-medium shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
          >
            Enregistrer la configuration
          </button>
        </div>

        <Toast
          message={toast.message}
          isVisible={toast.isVisible}
          onClose={hideToast}
          type={toast.type}
        />
      </div>

      {showPreview && (
        <PreviewModal
          settings={settings}
          onClose={() => setShowPreview(false)}
        />
      )}
    </>
  );
}
