"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { PageTitle } from "@/components/layout/PageTitle";
import { FollowUpsTable } from "@/components/relances/FollowUpsTable";
import { FollowUpType } from "@/components/relances/types";
import { AiModal } from "@/components/ai/AiModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { Loader } from "@/components/ui/Loader";
import { StatCard } from "@/components/dashboard/StatCard";
import { FollowUpDetailsSlideOver } from "@/components/relances/FollowUpDetailsSlideOver";
import { RelanceIaModal } from "@/components/relances/RelanceIaModal";
import { CreateRelanceIaModal } from "@/components/relances/CreateRelanceIaModal";
import { WeeklyRelancesChart } from "@/components/relances/WeeklyRelancesChart";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { PageTransition } from "@/components/ui/PageTransition";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import {
  getFollowUps,
  getFollowUpStats,
  getWeeklyFollowUps,
  getFollowUpHistory,
  markFollowUpAsDone,
  generateFollowUpMessage,
  sendFollowUp,
  type FollowUpItem,
  type FollowUpStats,
  type WeeklyFollowUpData,
  type FollowUpHistoryItem,
} from "@/services/followupsService";

type FilterType = "all" | "devis" | "factures" | "infos" | "rdv";
type StatusFilterType = "all" | "pending" | "done";
type AutomationFilterType = "all" | "auto" | "manual";

export default function RelancesPage() {
  const { token } = useAuth();
  const searchParams = useSearchParams();
  const followupIdFromUrl = searchParams?.get("followupId");
  const clientIdFromUrl = searchParams?.get("clientId");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FollowUpItem | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("all");
  const [automationFilter, setAutomationFilter] = useState<AutomationFilterType>("all");
  const [isFiltersDropdownOpen, setIsFiltersDropdownOpen] = useState(false);
  const filtersDropdownRef = useRef<HTMLDivElement>(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpItem | null>(null);
  const [isRelanceIaModalOpen, setIsRelanceIaModalOpen] = useState(false);
  const [isCreateRelanceIaModalOpen, setIsCreateRelanceIaModalOpen] = useState(false);
  const { showToast } = useToast();

  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [stats, setStats] = useState<FollowUpStats | null>(null);
  const [weeklyData, setWeeklyData] = useState<WeeklyFollowUpData[]>([]);
  const [followUpHistory, setFollowUpHistory] = useState<Record<number, FollowUpHistoryItem[]>>({});

  const loadData = async () => {
    if (!token) return;
    
    try {
      setIsLoading(true);
      const filters: { status?: string; clientId?: number } = { status: "all" };
      if (clientIdFromUrl) {
        filters.clientId = Number(clientIdFromUrl);
      }
      
      const [followupsData, statsData, weeklyDataResult] = await Promise.all([
        getFollowUps(token, filters),
        getFollowUpStats(token),
        getWeeklyFollowUps(token),
      ]);
      setFollowUps(followupsData);
      setStats(statsData);
      setWeeklyData(weeklyDataResult);
      
      // Si followupId est dans l'URL, ouvrir automatiquement cette relance
      if (followupIdFromUrl) {
        const followupId = Number(followupIdFromUrl);
        const followup = followupsData.find(fu => fu.id === followupId);
        if (followup) {
          setSelectedFollowUp(followup);
          setIsSlideOverOpen(true);
        }
      }
    } catch (error) {
      console.error("Erreur lors du chargement des relances:", error);
      showToast("Erreur lors du chargement des relances", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Fermer le dropdown des filtres quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filtersDropdownRef.current && !filtersDropdownRef.current.contains(event.target as Node)) {
        setIsFiltersDropdownOpen(false);
      }
    };

    if (isFiltersDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFiltersDropdownOpen]);

  // Filtrage des relances selon les filtres actifs
  const filteredFollowUps = useMemo(() => {
    let filtered = [...followUps];
    
    // Filtre par type
    if (activeFilter !== "all") {
      const filterMap: Record<FilterType, FollowUpType[]> = {
        all: [],
        devis: ["Devis non répondu"],
        factures: ["Facture impayée"],
        infos: ["Info manquante"],
        rdv: ["Rappel RDV"],
      };
      filtered = filtered.filter((f) => filterMap[activeFilter].includes(f.type as FollowUpType));
    }
    
    // Filtre par statut
    if (statusFilter === "pending") {
      filtered = filtered.filter((f) => f.status !== "Fait");
    } else if (statusFilter === "done") {
      filtered = filtered.filter((f) => f.status === "Fait");
    }
    // "all" = pas de filtre sur le statut
    
    // Filtre par automatisation
    if (automationFilter === "auto") {
      filtered = filtered.filter((f) => f.autoEnabled === true);
    } else if (automationFilter === "manual") {
      filtered = filtered.filter((f) => !f.autoEnabled);
    }
    // "all" = pas de filtre sur l'automatisation
    
    return filtered;
  }, [activeFilter, statusFilter, automationFilter, followUps]);

  // Calcul des KPIs (utiliser les stats de l'API si disponibles)
  const kpis = useMemo(() => {
    if (stats) {
      return {
        total: stats.total,
        invoices: stats.invoices,
        quotes: stats.quotes,
        late: stats.late,
      };
    }
    
    // Fallback: calculer depuis les données locales
    const active = followUps.filter((f) => f.status !== "Fait");
    const invoices = active.filter((f) => f.type === "Facture impayée");
    const quotes = active.filter((f) => f.type === "Devis non répondu");
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const late = active.filter((f) => {
      if (!f.actualDate) return false;
      const due = new Date(f.actualDate);
      due.setHours(0, 0, 0, 0);
      return due < today;
    });

    return {
      total: active.length,
      invoices: invoices.length,
      quotes: quotes.length,
      late: late.length,
    };
  }, [followUps, stats]);

  const handleMarkAsDone = async (id: number) => {
    if (!token) return;
    
    try {
      await markFollowUpAsDone(id, token);
      setFollowUps(followUps.map(f => f.id === id ? {...f, status: "Fait"} : f));
      showToast("Relance marquée comme faite", "success");
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      showToast("Erreur lors de la mise à jour", "error");
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) return;
    
    try {
      // Recharger les données après suppression
      const [followupsData, statsData, weeklyDataResult] = await Promise.all([
        getFollowUps(token, { status: "all" }),
        getFollowUpStats(token),
        getWeeklyFollowUps(token),
      ]);
      setFollowUps(followupsData);
      setStats(statsData);
      setWeeklyData(weeklyDataResult);
    } catch (error) {
      console.error("Erreur lors du rechargement après suppression:", error);
    }
  };

  const handleGenerateMessage = async (item: FollowUpItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
    
    // Générer automatiquement le message de base selon le type de relance
    if (token) {
      try {
        const generatedMessage = await generateFollowUpMessage(item.id, undefined, token);
        setMessageText(generatedMessage);
      } catch (error) {
        console.error("Erreur lors de la génération du message:", error);
        showToast("Erreur lors de la génération du message", "error");
        // En cas d'erreur, on laisse le champ vide
        setMessageText("");
      }
    } else {
      setMessageText("");
    }
  };

  const handleViewDetails = async (item: FollowUpItem) => {
    setSelectedFollowUp(item);
    setIsSlideOverOpen(true);
    // Charger l'historique si pas déjà chargé
    if (!followUpHistory[item.id]) {
      await loadFollowUpHistory(item.id);
    }
  };

  // Données pour le graphique hebdomadaire (utiliser les données de l'API)
  const weeklyRelancesData = useMemo(() => {
    if (weeklyData.length > 0) {
      return weeklyData;
    }
    
    // Fallback: structure par défaut
    const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
    return days.map((day) => ({ day, count: 0 }));
  }, [weeklyData]);

  // Récupérer l'historique d'une relance
  const loadFollowUpHistory = async (followUpId: number) => {
    if (!token) return;
    
    // Vérifier si déjà chargé
    if (followUpHistory[followUpId]) {
      return followUpHistory[followUpId];
    }
    
    try {
      const history = await getFollowUpHistory(followUpId, token);
      setFollowUpHistory(prev => ({ ...prev, [followUpId]: history }));
      return history;
    } catch (error) {
      console.error("Erreur lors de la récupération de l'historique:", error);
      return [];
    }
  };

  const handleGenerate = (text: string) => {
    setMessageText(text);
  };

  const handleSendMessage = async () => {
    if (!token || !selectedItem || !messageText.trim()) {
      showToast("Veuillez saisir un message", "error");
      return;
    }

    try {
      await sendFollowUp(
        selectedItem.id,
        {
          message: messageText,
          method: "email", // Par défaut email, on pourra ajouter un sélecteur plus tard
        },
        token
      );

      showToast("Relance envoyée avec succès", "success");
      setIsModalOpen(false);
      setSelectedItem(null);
      setMessageText("");
      
      // Recharger les données pour mettre à jour l'historique et les stats
      await loadData();
    } catch (error: any) {
      console.error("Erreur lors de l'envoi de la relance:", error);
      showToast(`Erreur lors de l'envoi: ${error.message || "Erreur inconnue"}`, "error");
    }
  };

  const filters: Array<{ id: FilterType; label: string }> = [
    { id: "all", label: "Tous" },
    { id: "devis", label: "Devis" },
    { id: "factures", label: "Factures" },
    { id: "infos", label: "Infos manquantes" },
    { id: "rdv", label: "RDV" },
  ];

  // Calculer le label du bouton de filtre
  const getFilterButtonLabel = () => {
    const parts: string[] = [];
    
    if (activeFilter !== "all") {
      const filter = filters.find(f => f.id === activeFilter);
      if (filter) parts.push(filter.label);
    } else {
      parts.push("Tous");
    }
    
    if (statusFilter !== "all") {
      parts.push(statusFilter === "pending" ? "À faire" : "Faites");
    }
    
    if (automationFilter !== "all") {
      parts.push(automationFilter === "auto" ? "Automatiques" : "Manuelles");
    }
    
    return parts.length > 0 ? parts.join(" • ") : "Tous les filtres";
  };

  // Vérifier si des filtres sont actifs
  const hasActiveFilters = activeFilter !== "all" || statusFilter !== "all" || automationFilter !== "all";

  return (
    <PageTransition>
      <>
      <PageTitle title="Relances" />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Relances</h1>
          <p className="mt-2 text-slate-600">
            Centralisez toutes vos relances à faire
          </p>
        </div>

        {/* Graphique hebdomadaire */}
        {weeklyRelancesData.length > 0 && <WeeklyRelancesChart data={weeklyRelancesData} />}

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            value={kpis.total}
            label="Total relances à faire"
            subtitle="Relances actives"
          />
          <StatCard
            value={kpis.invoices}
            label="Factures impayées"
            subtitle={stats ? `${stats.total_amount.toFixed(2)} €` : `${followUps.filter((f) => f.type === "Facture impayée" && f.status !== "Fait").reduce((sum, f) => sum + (f.amount || 0), 0)} €`}
          />
          <StatCard
            value={kpis.quotes}
            label="Devis en attente"
            subtitle="En attente de réponse"
          />
          <StatCard
            value={kpis.late}
            label="En retard"
            subtitle="Dépassées"
          />
        </div>

        {/* Filtres unifiés + Boutons Relance IA */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="relative" ref={filtersDropdownRef}>
            <button
              onClick={() => setIsFiltersDropdownOpen(!isFiltersDropdownOpen)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                hasActiveFilters
                  ? "bg-[#F97316] text-white shadow-md"
                  : "bg-white border border-[#E5E7EB] text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#0F172A]"
              }`}
            >
              <span>🔍 {getFilterButtonLabel()}</span>
              <svg
                className={`w-4 h-4 transition-transform ${isFiltersDropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown des filtres */}
            {isFiltersDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-50 p-4">
        <div className="space-y-4">
                  {/* Filtre par type */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                      Type
                    </label>
                    <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeFilter === filter.id
                      ? "bg-[#F97316] text-white"
                              : "bg-slate-50 border border-[#E5E7EB] text-[#64748B] hover:bg-slate-100 hover:text-[#0F172A]"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          
                  {/* Filtre par statut */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                      Statut
                    </label>
                    <div className="flex flex-wrap gap-2">
            {[
              { id: "all" as StatusFilterType, label: "Tous" },
              { id: "pending" as StatusFilterType, label: "À faire" },
              { id: "done" as StatusFilterType, label: "Faites" },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setStatusFilter(filter.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === filter.id
                    ? "bg-blue-600 text-white"
                              : "bg-slate-50 border border-[#E5E7EB] text-[#64748B] hover:bg-slate-100 hover:text-[#0F172A]"
                }`}
              >
                {filter.label}
              </button>
            ))}
                    </div>
                  </div>

                  {/* Filtre par automatisation */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wide">
                      Automatisation
                    </label>
                    <div className="flex flex-wrap gap-2">
            {[
              { id: "all" as AutomationFilterType, label: "Toutes" },
              { id: "auto" as AutomationFilterType, label: "Automatiques" },
              { id: "manual" as AutomationFilterType, label: "Manuelles" },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setAutomationFilter(filter.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  automationFilter === filter.id
                    ? "bg-green-600 text-white"
                              : "bg-slate-50 border border-[#E5E7EB] text-[#64748B] hover:bg-slate-100 hover:text-[#0F172A]"
                }`}
              >
                {filter.label}
              </button>
            ))}
                    </div>
                  </div>

                  {/* Bouton réinitialiser */}
                  {hasActiveFilters && (
                    <button
                      onClick={() => {
                        setActiveFilter("all");
                        setStatusFilter("all");
                        setAutomationFilter("all");
                      }}
                      className="w-full px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border-t border-[#E5E7EB] pt-3"
                    >
                      Réinitialiser les filtres
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreateRelanceIaModalOpen(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:brightness-110 shadow-md hover:shadow-lg transition-all"
            >
              Créer une relance
            </button>
            <button
              onClick={() => setIsRelanceIaModalOpen(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-[#E5E7EB] text-[#0F172A] hover:bg-[#F9FAFB] transition-all"
            >
              ⚙️ Configuration
            </button>
          </div>
        </div>

        {isLoading ? (
          <Loader text="Chargement des relances..." />
        ) : filteredFollowUps.length === 0 ? (
          <Card>
            <EmptyState
              title={statusFilter === "done" ? "Aucune relance terminée" : statusFilter === "pending" ? "Aucune relance en attente. Tout est à jour 🙌" : "Aucune relance trouvée"}
              description={statusFilter === "done" ? "Aucune relance n'a été marquée comme faite." : statusFilter === "pending" ? "Les relances apparaîtront automatiquement ici lorsque des devis ne seront pas répondu, des factures seront en retard, ou des informations manqueront." : "Essayez de modifier les filtres pour voir plus de relances."}
              icon={statusFilter === "done" ? "📋" : statusFilter === "pending" ? "✅" : "🔍"}
            />
          </Card>
        ) : (
          <FollowUpsTable
            items={filteredFollowUps}
            onMarkAsDone={handleMarkAsDone}
            onGenerateMessage={handleGenerateMessage}
            onViewDetails={handleViewDetails}
          />
        )}

        {/* Slide-over détails */}
        <FollowUpDetailsSlideOver
          isOpen={isSlideOverOpen}
          onClose={() => {
            setIsSlideOverOpen(false);
            setSelectedFollowUp(null);
          }}
          followUp={selectedFollowUp}
          history={selectedFollowUp ? (followUpHistory[selectedFollowUp.id] || []) : []}
          onGenerateMessage={handleGenerateMessage}
          onMarkAsDone={handleMarkAsDone}
          onDelete={handleDelete}
          onUpdate={async () => {
            // Recharger les données après mise à jour
            if (!token) return;
            try {
              const [followupsData, statsData] = await Promise.all([
                getFollowUps(token, { status: "all" }),
                getFollowUpStats(token),
              ]);
              setFollowUps(followupsData);
              setStats(statsData);
              // Mettre à jour selectedFollowUp si c'est la même relance
              if (selectedFollowUp) {
                const updated = followupsData.find(f => f.id === selectedFollowUp.id);
                if (updated) {
                  setSelectedFollowUp(updated);
                }
              }
            } catch (error) {
              console.error("Erreur lors du rechargement:", error);
            }
          }}
        />

        {/* Modal Créer Relance IA */}
        <CreateRelanceIaModal
          isOpen={isCreateRelanceIaModalOpen}
          onClose={() => setIsCreateRelanceIaModalOpen(false)}
          onSuccess={() => {
            // Recharger les données (stats, graphique, liste) après création/envoi
            loadData();
          }}
        />

        {/* Modal Configuration Relance IA */}
        <RelanceIaModal
          isOpen={isRelanceIaModalOpen}
          onClose={() => setIsRelanceIaModalOpen(false)}
        />

        <AiModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedItem(null);
            setMessageText("");
          }}
          title="Générer un message de relance"
          context={
            selectedItem && (
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">Type:</span> {selectedItem.type}
                </p>
                <p>
                  <span className="font-medium">Client:</span>{" "}
                  {selectedItem.client}
                </p>
                <p>
                  <span className="font-medium">Source:</span>{" "}
                  {selectedItem.source}
                </p>
                {selectedItem.amount && (
                  <p>
                    <span className="font-medium">Montant:</span>{" "}
                    {selectedItem.amount} €
                  </p>
                )}
              </div>
            )
          }
          initialValue={messageText}
          onGenerate={handleGenerate}
          onSend={handleSendMessage}
          placeholder="Votre message de relance..."
          label="Message de relance"
        />

      </div>
    </>
    </PageTransition>
  );
}

