"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { ModuleToggle } from "@/components/settings/ModuleToggle";
import Link from "next/link";
import { apiGet, apiPatch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Toast } from "@/components/ui/Toast";
import { Loader } from "@/components/ui/Loader";

type AdminCompanySettings = {
  id: number;
  company_id: number;
  settings: {
    modules: {
      tasks: { enabled: boolean };
      inbox: { enabled: boolean };
      relances: { enabled: boolean };
      projects: { enabled: boolean };
      billing?: { enabled: boolean };
      reporting: { enabled: boolean };
      chatbot_internal: { enabled: boolean };
      chatbot_site: { enabled: boolean };
    };
    ia: {
      ai_relances: boolean;
      ai_summary: boolean;
      ai_chatbot_internal: boolean;
      ai_chatbot_site: boolean;
    };
    integrations: {
      email_provider: string | null;
      email_from: string | null;
    };
  };
  created_at: string | Date;
  updated_at: string | Date;
};

type CompanyInfo = {
  id: number;
  name: string;
  sector?: string | null;
  is_active: boolean;
  created_at: string;
};

export default function CompanyDetailPage() {
  const params = useParams();
  const companyIdParam = params.id;
  const companyId = companyIdParam ? Number(companyIdParam) : null;
  const { token } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [settings, setSettings] = useState<AdminCompanySettings | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("company");

  const tabs = [
    { id: "company", label: "Infos entreprise" },
    { id: "modules", label: "Modules activés" },
    { id: "billing", label: "Facturation" },
    { id: "usage", label: "Utilisation" },
    { id: "ia", label: "Intelligence artificielle" },
    { id: "team", label: "Équipe" },
    { id: "integrations", label: "Intégrations" },
    { id: "notifications", label: "Notifications" },
  ];

  // TODO: Récupérer l'équipe depuis le backend
  const mockTeam = [
    { id: 1, name: "Jean Dupont", email: "jean@example.com", role: "owner" },
    { id: 2, name: "Marie Martin", email: "marie@example.com", role: "user" },
    { id: 3, name: "Pierre Durand", email: "pierre@example.com", role: "user" },
  ];

  // Mock données de facturation
  const mockBillingData = {
    plan: "Pro",
    monthlyPrice: 49.99,
    nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    invoices: [
      {
        id: 1,
        invoiceNumber: "INV-2025-001",
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 49.99,
        status: "Payé",
        pdfUrl: "#",
      },
      {
        id: 2,
        invoiceNumber: "INV-2025-002",
        date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 49.99,
        status: "Payé",
        pdfUrl: "#",
      },
      {
        id: 3,
        invoiceNumber: "INV-2025-003",
        date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        amount: 49.99,
        status: "Payé",
        pdfUrl: "#",
      },
    ],
  };

  // Mock données d'utilisation
  const mockUsageData = {
    timeSaved: {
      hours: 24,
      minutes: 30,
      description: "Temps gagné grâce à l'automatisation",
    },
    stats: {
      tasksCompleted: 156,
      messagesSent: 342,
      invoicesGenerated: 28,
      appointmentsBooked: 45,
      clientsManaged: 12,
    },
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  };

  // Charger les infos de l'entreprise
  useEffect(() => {
    if (!token || !companyId || isNaN(companyId)) return;

    const loadCompany = async () => {
      setLoadingCompany(true);
      setError(null);
      try {
        const data = await apiGet<CompanyInfo>(
          `/companies/${companyId}`,
          token
        );
        setCompany(data);
      } catch (err: any) {
        setError(err.message || "Erreur lors du chargement de l'entreprise");
      } finally {
        setLoadingCompany(false);
      }
    };

    void loadCompany();
  }, [token, companyId]);

  // Charger les settings
  useEffect(() => {
    if (!token || !companyId || isNaN(companyId)) return;

    const loadSettings = async () => {
      setLoadingSettings(true);
      setError(null);
      try {
        const data = await apiGet<AdminCompanySettings>(
          `/companies/${companyId}/settings`,
          token
        );
        setSettings(data);
      } catch (err: any) {
        setError(err.message || "Erreur lors du chargement des paramètres");
      } finally {
        setLoadingSettings(false);
      }
    };

    void loadSettings();
  }, [token, companyId]);

  const handleModuleToggle = (
    key: keyof AdminCompanySettings["settings"]["modules"],
    enabled: boolean
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      settings: {
        ...settings.settings,
        modules: {
          ...settings.settings.modules,
          [key]: { enabled },
        },
      },
    });
  };

  const handleIaToggle = (
    key: keyof AdminCompanySettings["settings"]["ia"],
    enabled: boolean
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      settings: {
        ...settings.settings,
        ia: {
          ...settings.settings.ia,
          [key]: enabled,
        },
      },
    });
  };

  const handleSave = async () => {
    if (!token || !settings || !companyId || isNaN(companyId)) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiPatch<AdminCompanySettings>(
        `/companies/${companyId}/settings`,
        { settings: settings.settings },
        token
      );
      setSettings(updated);
      showToast("Paramètres mis à jour avec succès", "success");
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'enregistrement des paramètres");
      showToast(err.message || "Erreur lors de l'enregistrement", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!companyId || isNaN(companyId)) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">ID d'entreprise invalide</p>
        <Link
          href="/admin/companies"
          className="text-sm text-[#64748B] hover:text-[#0F172A] mt-2 inline-block"
        >
          ← Retour à la liste
        </Link>
      </div>
    );
  }

  if (loadingCompany) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader text="Chargement de l'entreprise..." />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">Entreprise non trouvée</p>
        <Link
          href="/admin/companies"
          className="text-sm text-[#64748B] hover:text-[#0F172A] mt-2 inline-block"
        >
          ← Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href="/admin/companies"
              className="text-sm text-[#64748B] hover:text-[#0F172A] mb-2 inline-block"
            >
              ← Retour à la liste
            </Link>
            <h1 className="text-3xl font-bold text-[#0F172A]">{company.name}</h1>
            <p className="text-sm text-[#64748B] mt-1">
              Interface owner - Les modifications sont sauvegardées en temps réel
            </p>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
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
        {loadingSettings && !settings ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader text="Chargement des paramètres..." />
          </div>
        ) : (
          <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            {activeTab === "company" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Nom de l'entreprise
                  </label>
                  <input
                    type="text"
                    defaultValue={company.name}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    placeholder="Mon Commerce"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Secteur d'activité
                  </label>
                  <select
                    defaultValue={company.sector || ""}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    disabled
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
                    Statut
                  </label>
                  <p className="text-sm text-[#0F172A]">
                    {company.is_active ? "Actif" : "Inactif"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Date de création
                  </label>
                  <p className="text-sm text-[#0F172A]">
                    {new Date(company.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "billing" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-4">
                    Plan et facturation
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-[#64748B]">Plan actuel</span>
                          <span className="px-2 py-1 bg-[#F97316]/10 text-[#F97316] rounded-full text-xs font-medium">
                            {mockBillingData.plan}
                          </span>
                        </div>
                        <div className="mt-4">
                          <div className="text-3xl font-bold text-[#0F172A]">
                            {mockBillingData.monthlyPrice.toFixed(2)} €
                          </div>
                          <div className="text-sm text-[#64748B] mt-1">par mois</div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                          <div className="text-xs text-[#64748B]">
                            Prochaine facturation
                          </div>
                          <div className="text-sm font-medium text-[#0F172A] mt-1">
                            {new Date(mockBillingData.nextBillingDate).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-4">
                    Historique des factures
                  </h3>
                  <div className="rounded-xl border border-[#E5E7EB] bg-white overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-[#F9FAFB]">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase">
                            Numéro
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase">
                            Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase">
                            Montant
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase">
                            Statut
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E7EB]">
                        {mockBillingData.invoices.map((invoice) => (
                          <tr key={invoice.id} className="hover:bg-[#F9FAFB]">
                            <td className="px-4 py-3 text-sm font-medium text-[#0F172A]">
                              {invoice.invoiceNumber}
                            </td>
                            <td className="px-4 py-3 text-sm text-[#64748B]">
                              {new Date(invoice.date).toLocaleDateString("fr-FR")}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-[#0F172A]">
                              {invoice.amount.toFixed(2)} €
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                {invoice.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => {
                                  showToast("Téléchargement de la facture...", "info");
                                }}
                                className="text-sm text-[#F97316] hover:text-[#EA580C]"
                              >
                                Télécharger
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "usage" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-4">
                    Temps gagné
                  </h3>
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <div className="text-5xl font-bold text-[#F97316] mb-2">
                          {mockUsageData.timeSaved.hours}h {mockUsageData.timeSaved.minutes}min
                        </div>
                        <div className="text-sm text-[#64748B]">
                          {mockUsageData.timeSaved.description}
                        </div>
                        <div className="mt-4 text-xs text-[#64748B]">
                          Calculé sur les 30 derniers jours
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-4">
                    Statistiques d'utilisation
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-[#0F172A]">
                          {mockUsageData.stats.tasksCompleted}
                        </div>
                        <div className="text-sm text-[#64748B] mt-1">Tâches complétées</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-[#0F172A]">
                          {mockUsageData.stats.messagesSent}
                        </div>
                        <div className="text-sm text-[#64748B] mt-1">Messages envoyés</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-[#0F172A]">
                          {mockUsageData.stats.invoicesGenerated}
                        </div>
                        <div className="text-sm text-[#64748B] mt-1">Factures générées</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-[#0F172A]">
                          {mockUsageData.stats.appointmentsBooked}
                        </div>
                        <div className="text-sm text-[#64748B] mt-1">Rendez-vous pris</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-2xl font-bold text-[#0F172A]">
                          {mockUsageData.stats.clientsManaged}
                        </div>
                        <div className="text-sm text-[#64748B] mt-1">Clients gérés</div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-4">
                    Dernière activité
                  </h3>
                  <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                    <div className="text-sm text-[#64748B]">
                      Il y a {Math.floor((Date.now() - new Date(mockUsageData.lastActivity).getTime()) / (1000 * 60))} minutes
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "modules" && settings && (
              <div className="space-y-4">
                <p className="text-sm text-[#64748B] mb-4">
                  Activez ou désactivez les modules selon vos besoins. Les
                  modifications sont sauvegardées en temps réel.
                </p>
                <div className="space-y-0">
                  <ModuleToggle
                    label="Tâches"
                    description="Gestion des tâches, checklists et planning interne."
                    enabled={settings.settings.modules.tasks.enabled}
                    onToggle={(enabled) => handleModuleToggle("tasks", enabled)}
                  />
                  <ModuleToggle
                    label="Inbox"
                    description="Centralisation des échanges clients."
                    enabled={settings.settings.modules.inbox.enabled}
                    onToggle={(enabled) => handleModuleToggle("inbox", enabled)}
                  />
                  <ModuleToggle
                    label="Relances"
                    description="Suivi et automatisation des relances clients."
                    enabled={settings.settings.modules.relances.enabled}
                    onToggle={(enabled) => handleModuleToggle("relances", enabled)}
                  />
                  <ModuleToggle
                    label="Projets / Dossiers"
                    description="Suivi des dossiers et projets clients."
                    enabled={settings.settings.modules.projects.enabled}
                    onToggle={(enabled) => handleModuleToggle("projects", enabled)}
                  />
                  <ModuleToggle
                    label="Devis & Factures"
                    description="Création, suivi et gestion des devis et factures."
                    enabled={settings.settings.modules.billing?.enabled ?? true}
                    onToggle={(enabled) => handleModuleToggle("billing" as any, enabled)}
                  />
                  <ModuleToggle
                    label="Reporting"
                    description="Tableaux de bord et statistiques."
                    enabled={settings.settings.modules.reporting.enabled}
                    onToggle={(enabled) => handleModuleToggle("reporting", enabled)}
                  />
                  <ModuleToggle
                    label="Chatbot interne"
                    description="Assistant interne pour vous guider dans l'outil."
                    enabled={settings.settings.modules.chatbot_internal.enabled}
                    onToggle={(enabled) =>
                      handleModuleToggle("chatbot_internal", enabled)
                    }
                  />
                  <ModuleToggle
                    label="Chatbot site web"
                    description="Widget de chat pour votre site web."
                    enabled={settings.settings.modules.chatbot_site.enabled}
                    onToggle={(enabled) =>
                      handleModuleToggle("chatbot_site", enabled)
                    }
                  />
                </div>
              </div>
            )}

            {activeTab === "ia" && settings && (
              <div className="space-y-4">
                <p className="text-sm text-[#64748B] mb-4">
                  Activez ou désactivez les fonctionnalités d'intelligence
                  artificielle.
                </p>
                <div className="space-y-0">
                  <ModuleToggle
                    label="IA pour les relances"
                    description="Génération automatique de messages de relance."
                    enabled={settings.settings.ia.ai_relances}
                    onToggle={(enabled) => handleIaToggle("ai_relances", enabled)}
                  />
                  <ModuleToggle
                    label="Résumé IA de la journée"
                    description="Synthèse automatique de vos priorités."
                    enabled={settings.settings.ia.ai_summary}
                    onToggle={(enabled) => handleIaToggle("ai_summary", enabled)}
                  />
                  <ModuleToggle
                    label="Chatbot interne (aide dans l'app)"
                    description="Assistant interne pour vous guider dans l'outil."
                    enabled={settings.settings.ia.ai_chatbot_internal}
                    onToggle={(enabled) =>
                      handleIaToggle("ai_chatbot_internal", enabled)
                    }
                  />
                  <ModuleToggle
                    label="Chatbot site web"
                    description="IA pour répondre aux questions de vos clients sur votre site."
                    enabled={settings.settings.ia.ai_chatbot_site}
                    onToggle={(enabled) =>
                      handleIaToggle("ai_chatbot_site", enabled)
                    }
                  />
                </div>
              </div>
            )}

            {activeTab === "team" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-[#64748B]">
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
                      className="flex items-center justify-between p-4 border border-[#E5E7EB] rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#0F172A]">
                          {member.name}
                        </p>
                        <p className="text-xs text-[#64748B]">{member.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#64748B]">
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

            {activeTab === "integrations" && settings && (
              <div className="space-y-6">
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
                        defaultValue={settings.settings.integrations.email_from || ""}
                        className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                        placeholder="contact@moncommerce.fr"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="use-for-reminders"
                        className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
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
            {(activeTab === "modules" || activeTab === "ia") && settings && (
              <div className="pt-4 border-t border-[#E5E7EB] flex justify-end mt-6">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white px-6 py-2 text-sm font-medium shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
                >
                  {saving ? "Enregistrement..." : "Enregistrer les paramètres"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <Toast
        message={toast.message}
        isVisible={toast.isVisible}
        onClose={hideToast}
        type={toast.type}
      />
    </>
  );
}
