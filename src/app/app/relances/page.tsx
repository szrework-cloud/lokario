"use client";

import { useState, useEffect, useMemo } from "react";
import { PageTitle } from "@/components/layout/PageTitle";
import { FollowUpsTable } from "@/components/relances/FollowUpsTable";
import { FollowUpItem, FollowUpType } from "@/components/relances/types";
import { AiModal } from "@/components/ai/AiModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { Toast } from "@/components/ui/Toast";
import { Loader } from "@/components/ui/Loader";
import { StatCard } from "@/components/dashboard/StatCard";
import { FollowUpDetailsSlideOver } from "@/components/relances/FollowUpDetailsSlideOver";
import { RelanceIaModal } from "@/components/relances/RelanceIaModal";
import { WeeklyRelancesChart } from "@/components/relances/WeeklyRelancesChart";
import { useToast } from "@/hooks/useToast";

type FilterType = "all" | "devis" | "factures" | "infos" | "rdv";

interface FollowUpHistoryItem {
  id: number;
  date: string;
  message: string;
  status: "envoyé" | "lu" | "répondu";
  sentBy?: string;
}

export default function RelancesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FollowUpItem | null>(null);
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUpItem | null>(null);
  const [isRelanceIaModalOpen, setIsRelanceIaModalOpen] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  useEffect(() => {
    // Simuler un chargement backend
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // TODO: Récupérer les relances depuis le backend
  const mockFollowUps: FollowUpItem[] = [
    {
      id: 1,
      type: "Devis non répondu",
      client: "Boulangerie Soleil",
      clientId: 1,
      source: "Devis #2025-023",
      dueDate: "Aujourd'hui",
      status: "À faire",
      amount: 1250,
      actualDate: new Date().toISOString().split('T')[0], // Aujourd'hui
    },
    {
      id: 2,
      type: "Facture impayée",
      client: "Mme Dupont",
      clientId: 2,
      source: "Facture #2025-014",
      dueDate: "En retard de 5 jours",
      status: "À faire",
      amount: 320,
      actualDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Il y a 5 jours
    },
    {
      id: 3,
      type: "Info manquante",
      client: "M. Martin",
      clientId: 3,
      source: "Email",
      dueDate: "Demain",
      status: "En attente",
      actualDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Demain
    },
    {
      id: 4,
      type: "Rappel RDV",
      client: "Salon Beauté",
      clientId: 4,
      source: "Calendrier",
      dueDate: "Aujourd'hui",
      status: "Fait",
      actualDate: new Date().toISOString().split('T')[0],
    },
    {
      id: 5,
      type: "Devis non répondu",
      client: "Restaurant Le Jardin",
      clientId: 5,
      source: "Devis #2025-025",
      dueDate: "Dans 3 jours",
      status: "À faire",
      amount: 850,
      actualDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  ];

  // Filtrage des relances selon le filtre actif
  const filteredFollowUps = useMemo(() => {
    if (activeFilter === "all") {
      return mockFollowUps.filter((f) => f.status !== "Fait");
    }
    
    const filterMap: Record<FilterType, FollowUpType[]> = {
      all: [],
      devis: ["Devis non répondu"],
      factures: ["Facture impayée"],
      infos: ["Info manquante"],
      rdv: ["Rappel RDV"],
    };

    return mockFollowUps.filter(
      (f) => f.status !== "Fait" && filterMap[activeFilter].includes(f.type as FollowUpType)
    );
  }, [activeFilter]);

  // Calcul des KPIs
  const kpis = useMemo(() => {
    const active = mockFollowUps.filter((f) => f.status !== "Fait");
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
  }, []);

  const handleMarkAsDone = (id: number) => {
    // TODO: Appel backend pour marquer comme fait
    console.log("Mark as done:", id);
    showToast("Relance marquée comme faite", "success");
  };

  const handleGenerateMessage = (item: FollowUpItem) => {
    setSelectedItem(item);
    setMessageText("");
    setIsModalOpen(true);
  };

  const handleViewDetails = (item: FollowUpItem) => {
    setSelectedFollowUp(item);
    setIsSlideOverOpen(true);
  };

  // Données pour le graphique hebdomadaire
  const weeklyRelancesData = useMemo(() => {
    const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
    
    // Ajuster pour que Lundi = 0
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    // Générer les données pour cette semaine (mock)
    return days.map((day, index) => {
      // Simuler des données : quelques jours avec des relances
      let count = 0;
      if (index === 0) count = 1; // Lundi
      if (index === 2) count = 2; // Mercredi
      // Les autres jours restent à 0
      
      return { day, count };
    });
  }, []);

  // Mock historique pour la démo
  const getFollowUpHistory = (followUpId: number): FollowUpHistoryItem[] => {
    // Générer un historique mock basé sur l'ID
    const histories: Record<number, FollowUpHistoryItem[]> = {
      1: [
        {
          id: 1,
          date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          message: "Bonjour, nous vous rappelons que votre devis #2025-023 est en attente de réponse. N'hésitez pas à nous contacter pour toute question.",
          status: "envoyé",
          sentBy: "Marie Dupont",
        },
        {
          id: 2,
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          message: "Relance concernant le devis #2025-023. Nous restons à votre disposition.",
          status: "lu",
          sentBy: "Marie Dupont",
        },
      ],
      2: [
        {
          id: 3,
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          message: "Bonjour, votre facture #2025-014 d'un montant de 320 € est impayée depuis le 10 janvier. Merci de régulariser votre situation.",
          status: "envoyé",
          sentBy: "Jean Martin",
        },
      ],
    };
    return histories[followUpId] || [];
  };

  const handleGenerate = (text: string) => {
    setMessageText(text);
  };

  const filters: Array<{ id: FilterType; label: string }> = [
    { id: "all", label: "Tous" },
    { id: "devis", label: "Devis" },
    { id: "factures", label: "Factures" },
    { id: "infos", label: "Infos manquantes" },
    { id: "rdv", label: "RDV" },
  ];

  return (
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
        <WeeklyRelancesChart data={weeklyRelancesData} />

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
            subtitle={`${mockFollowUps.filter((f) => f.type === "Facture impayée" && f.status !== "Fait").reduce((sum, f) => sum + (f.amount || 0), 0)} €`}
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

        {/* Filtres chips + Bouton Relance IA */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === filter.id
                    ? "bg-[#F97316] text-white"
                    : "bg-white border border-[#E5E7EB] text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#0F172A]"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsRelanceIaModalOpen(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:brightness-110 shadow-md hover:shadow-lg transition-all"
          >
            ✨ Relance IA
          </button>
        </div>

        {isLoading ? (
          <Loader text="Chargement des relances..." />
        ) : filteredFollowUps.length === 0 ? (
          <Card>
            <EmptyState
              title="Aucune relance en attente. Tout est à jour 🙌"
              description="Les relances apparaîtront automatiquement ici lorsque des devis ne seront pas répondu, des factures seront en retard, ou des informations manqueront."
              icon="✅"
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
          history={selectedFollowUp ? getFollowUpHistory(selectedFollowUp.id) : []}
          onGenerateMessage={handleGenerateMessage}
          onMarkAsDone={handleMarkAsDone}
        />

        {/* Modal Relance IA */}
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
          placeholder="Votre message de relance..."
          label="Message de relance"
        />

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

