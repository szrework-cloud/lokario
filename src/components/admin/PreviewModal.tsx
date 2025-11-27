"use client";

import { useState } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { TaskRow } from "@/components/dashboard/TaskRow";
import { AiSummaryCard } from "@/components/ai/AiSummaryCard";
import { cn } from "@/lib/utils";

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

interface PreviewModalProps {
  settings: PackSettings;
  onClose: () => void;
}

// Mapping des moduleKey de la sidebar vers les clés dans settings.modules
const moduleKeyMapping: Record<string, string> = {
  tasks: "tasks",
  inbox: "inbox",
  followups: "relances",
  projects: "projects",
  billing: "billing",
  reporting: "reporting",
  chatbot: "chatbot_internal",
};

const navItems = [
  { label: "Tâches", href: "/app/tasks", moduleKey: "tasks" },
  { label: "Inbox", href: "/app/inbox", moduleKey: "inbox" },
  { label: "Relances", href: "/app/relances", moduleKey: "followups" },
  { label: "Clients", href: "/app/clients", moduleKey: "clients" },
  { label: "Projets", href: "/app/projects", moduleKey: "projects" },
  { label: "Devis & Factures", href: "/app/billing", moduleKey: "billing" },
  { label: "Reporting", href: "/app/reporting", moduleKey: "reporting" },
  { label: "Chatbot", href: "/app/chatbot", moduleKey: "chatbot" },
  { label: "Paramètres", href: "/app/settings", moduleKey: null },
];

export function PreviewModal({ settings, onClose }: PreviewModalProps) {
  // Filtrer les items selon les modules activés
  const visibleItems = navItems.filter((item) => {
    // Si pas de moduleKey, toujours visible
    if (!item.moduleKey) return true;
    
    // Mapper le moduleKey de la sidebar vers la clé dans settings
    const settingsKey = moduleKeyMapping[item.moduleKey] || item.moduleKey;
    
    // Vérifier si le module est activé
    const moduleConfig = settings.modules[settingsKey as keyof typeof settings.modules];
    return moduleConfig?.enabled ?? true; // Par défaut activé si pas défini
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="relative w-full max-w-[95vw] max-h-[95vh] bg-[#F9FAFB] rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-6 py-4 bg-white">
          <div>
            <h2 className="text-xl font-bold text-[#0F172A]">
              Prévisualisation - Interface Employé
            </h2>
            <p className="text-xs text-[#64748B] mt-1">
              Aperçu de l'interface selon les modules sélectionnés
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-[#0F172A] text-2xl font-bold w-8 h-8 flex items-center justify-center rounded hover:bg-[#F9FAFB]"
          >
            ×
          </button>
        </div>

        {/* Content - Interface complète */}
        <div className="flex-1 overflow-hidden flex">
          {/* Sidebar */}
          <aside className="w-64 border-r border-[#1F2933] bg-[#111827] flex-shrink-0">
            <div className="flex h-full flex-col">
              {/* Logo */}
              <div className="border-b border-[#1F2933] px-6 py-5">
                <h1 className="text-xl font-semibold text-slate-200">
                  Local Assistant
                </h1>
              </div>

              {/* Navigation */}
              <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
                {visibleItems.map((item) => {
                  const isActive = item.href === "/app/tasks";
                  return (
                    <div
                      key={item.href}
                      className={cn(
                        "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors relative cursor-default",
                        isActive
                          ? "bg-slate-800 text-slate-50 border-l-4 border-[#F97316] pl-2.5"
                          : "text-slate-400"
                      )}
                    >
                      {item.label}
                    </div>
                  );
                })}
              </nav>

              {/* User info */}
              <div className="border-t border-[#1F2933] px-6 py-4">
                <p className="text-xs text-slate-400">Connecté en tant que</p>
                <p className="text-sm font-medium text-slate-200">
                  Employé Démo
                </p>
                <p className="mt-2 text-xs text-slate-400">Rôle: user</p>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* TopBar */}
            <header className="sticky top-0 z-10 border-b border-[#E5E7EB] bg-white flex-shrink-0">
              <div className="flex h-16 items-center justify-between px-8">
                <div>
                  <p className="text-sm text-[#64748B]">Assistant administratif</p>
                  <h2 className="text-2xl font-semibold text-[#0F172A]">Aujourd'hui</h2>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-sm text-[#64748B]">Résumé de la journée</p>
                  <div className="text-xs text-[#64748B] border-l border-[#E5E7EB] pl-4">
                    <p className="font-medium text-[#0F172A]">employe@example.com</p>
                    <p className="text-[#64748B]">Rôle: user</p>
                  </div>
                </div>
              </div>
            </header>

            {/* Main Content Area - Scrollable */}
            <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#F9FAFB]">
              <div className="space-y-8">
                {/* Header */}
                <div>
                  <h1 className="text-3xl font-bold text-[#0F172A]">Aujourd'hui</h1>
                  <p className="mt-2 text-[#64748B]">
                    Voici les tâches, relances, devis/factures et dossiers à traiter aujourd'hui.
                  </p>
                </div>

                {/* Résumé IA - Seulement si activé */}
                {settings.ia.ai_summary && <AiSummaryCard />}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {settings.modules.tasks.enabled && (
                    <StatCard
                      value="8"
                      label="Tâches du jour"
                      subtitle="5 à faire • 3 terminées"
                    />
                  )}
                  {settings.modules.relances.enabled && (
                    <StatCard
                      value="3"
                      label="Relances clients"
                      subtitle="2 devis • 1 rappel RDV"
                    />
                  )}
                  <StatCard
                    value="1"
                    label="Paiements en retard"
                    subtitle="Total 320 €"
                  />
                </div>

                {/* Sections Grid */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Tâches du jour - Seulement si activé */}
                  {settings.modules.tasks.enabled && (
                    <SectionCard
                      title="Tâches du jour"
                      action={
                        <span className="text-sm font-medium text-[#64748B]">
                          Voir tout
                        </span>
                      }
                    >
                      <div className="space-y-0">
                        <TaskRow
                          task="Vérifier stock farine"
                          type="Interne"
                          time="09:00"
                        />
                        <TaskRow
                          task="Nettoyage salle"
                          type="Interne"
                          time="Avant fermeture"
                        />
                        <TaskRow
                          task="Commande fournisseur boissons"
                          type="Fournisseur"
                          time="Aujourd'hui"
                        />
                      </div>
                    </SectionCard>
                  )}

                  {/* Relances à envoyer - Seulement si activé */}
                  {settings.modules.relances.enabled && (
                    <SectionCard
                      title="Relances à envoyer"
                      action={
                        <span className="text-sm font-medium text-[#64748B]">
                          Voir toutes
                        </span>
                      }
                    >
                      <div className="space-y-0">
                        <TaskRow
                          task="Relancer Mme Dupont (devis non signé)"
                          type="Client"
                          time="Aujourd'hui"
                        />
                        <TaskRow
                          task="Rappel RDV M. Martin"
                          type="Client"
                          time="15:30"
                        />
                        <TaskRow
                          task="Relance facture #2025-014"
                          type="Client"
                          time="En retard de 5 jours"
                        />
                      </div>
                    </SectionCard>
                  )}

                  {/* Devis / factures à suivre */}
                  <SectionCard
                    title="Devis / factures à suivre"
                    action={
                      <span className="text-sm font-medium text-[#64748B]">
                        Voir tout
                      </span>
                    }
                  >
                    <div className="space-y-0">
                      <TaskRow
                        task="Devis #2025-023 – Boulangerie Soleil"
                        type="Client"
                        time="Envoyé il y a 3 jours"
                      />
                      <TaskRow
                        task="Facture #2025-014 – En attente"
                        type="Client"
                        time="Échéance dans 2 jours"
                      />
                    </div>
                  </SectionCard>

                  {/* Dossiers / projets ouverts - Seulement si activé */}
                  {settings.modules.projects.enabled && (
                    <SectionCard
                      title="Dossiers / projets ouverts"
                      action={
                        <span className="text-sm font-medium text-[#64748B]">
                          Voir tout
                        </span>
                      }
                    >
                      <div className="space-y-0">
                        <TaskRow
                          task="Projet rénovation – M. Martin"
                          type="Client"
                          time="En cours"
                        />
                        <TaskRow
                          task="Dossier commande équipement"
                          type="Interne"
                          time="En attente validation"
                        />
                      </div>
                    </SectionCard>
                  )}
                </div>
              </div>
            </main>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[#E5E7EB] px-6 py-4 bg-white flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white px-6 py-2 text-sm font-medium shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
