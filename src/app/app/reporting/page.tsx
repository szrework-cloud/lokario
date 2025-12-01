"use client";

import { useState, useEffect } from "react";
import { PageTitle } from "@/components/layout/PageTitle";
import { KpiCard } from "@/components/reporting/KpiCard";
import { FakeBarChart } from "@/components/reporting/FakeBarChart";
import { Loader } from "@/components/ui/Loader";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export default function ReportingPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simuler un chargement backend
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // TODO: Récupérer les statistiques depuis le backend
  const monthlyData = [
    { label: "Jan", value: 12000 },
    { label: "Fév", value: 15000 },
    { label: "Mar", value: 18000 },
    { label: "Avr", value: 14000 },
    { label: "Mai", value: 20000 },
    { label: "Juin", value: 22000 },
  ];

  // Mock données temps gagné (sera remplacé par l'API backend)
  const timeSavedData = {
    total: {
      hours: 24,
      minutes: 30,
    },
    thisWeek: {
      hours: 6,
      minutes: 15,
    },
    thisMonth: {
      hours: 24,
      minutes: 30,
    },
    breakdown: {
      automation: { hours: 12, minutes: 0, label: "Automatisations" },
      ai: { hours: 8, minutes: 30, label: "Intelligence artificielle" },
      templates: { hours: 4, minutes: 0, label: "Modèles et templates" },
    },
    description: "Temps gagné grâce à l'automatisation et l'IA sur les 30 derniers jours",
  };

  return (
    <>
      <PageTitle title="Reporting" />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Reporting</h1>
          <p className="mt-2 text-slate-600">
            Vue globale de votre activité
          </p>
        </div>

        {isLoading ? (
          <Loader text="Chargement des statistiques..." />
        ) : (
          <>
            {/* Temps gagné - Section principale */}
            <Card className="bg-gradient-to-br from-[#F97316]/10 via-white to-[#EA580C]/10 border-2 border-[#F97316]/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-[#0F172A] mb-1">
                      Temps gagné
                    </h2>
                    <p className="text-sm text-[#64748B]">
                      {timeSavedData.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-5xl font-bold text-[#F97316] mb-1">
                      {timeSavedData.total.hours}h {timeSavedData.total.minutes}min
                    </div>
                    <div className="text-xs text-[#64748B]">Total (30 jours)</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#E5E7EB]">
                  <div>
                    <div className="text-sm text-[#64748B] mb-1">Cette semaine</div>
                    <div className="text-2xl font-bold text-[#0F172A]">
                      {timeSavedData.thisWeek.hours}h {timeSavedData.thisWeek.minutes}min
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-[#64748B] mb-1">Ce mois</div>
                    <div className="text-2xl font-bold text-[#0F172A]">
                      {timeSavedData.thisMonth.hours}h {timeSavedData.thisMonth.minutes}min
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-[#64748B] mb-1">Moyenne par jour</div>
                    <div className="text-2xl font-bold text-[#0F172A]">
                      {Math.floor((timeSavedData.total.hours * 60 + timeSavedData.total.minutes) / 30)}min
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
                  <h3 className="text-sm font-semibold text-[#0F172A] mb-4">
                    Répartition par source
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.values(timeSavedData.breakdown).map((item, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-[#E5E7EB]">
                        <div className="text-xs text-[#64748B] mb-1">{item.label}</div>
                        <div className="text-xl font-bold text-[#0F172A]">
                          {item.hours}h {item.minutes}min
                        </div>
                        <div className="mt-2 w-full bg-[#E5E7EB] rounded-full h-2">
                          <div
                            className="bg-[#F97316] h-2 rounded-full"
                            style={{
                              width: `${((item.hours * 60 + item.minutes) / (timeSavedData.total.hours * 60 + timeSavedData.total.minutes)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            title="Devis envoyés ce mois-ci"
            value={24}
            subtitle="+3 vs mois dernier"
            trend="up"
          />
          <KpiCard
            title="Devis acceptés"
            value={18}
            subtitle="75% de taux d'acceptation"
            trend="up"
          />
          <KpiCard
            title="CA mensuel"
            value="45 230 €"
            subtitle="Ce mois-ci"
            trend="up"
          />
          <KpiCard
            title="Factures en retard"
            value={3}
            subtitle="Total: 1 250 €"
            trend="down"
          />
          <KpiCard
            title="Relances envoyées"
            value={42}
            subtitle="Ce mois-ci"
            trend="neutral"
          />
          <KpiCard
            title="Tâches complétées"
            value={156}
            subtitle="Cette semaine"
            trend="up"
          />
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <FakeBarChart
            title="Montants facturés par mois"
            data={monthlyData}
          />
          <FakeBarChart
            title="Nombre de devis envoyés par semaine"
            data={[
              { label: "Sem 1", value: 5 },
              { label: "Sem 2", value: 8 },
              { label: "Sem 3", value: 6 },
              { label: "Sem 4", value: 5 },
            ]}
          />
        </div>

        {/* Filtres de période */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Semaine
            </button>
            <button className="rounded-lg border border-[#F97316] bg-[#F97316] px-4 py-2 text-sm font-medium text-white">
              Mois
            </button>
            <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Année
            </button>
          </div>
          <button className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB] flex items-center gap-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Exporter PDF
          </button>
        </div>

        {/* Statistiques détaillées */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[#0F172A]">
                Tâches en retard
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Total</span>
                  <span className="text-lg font-semibold text-red-600">12</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Cette semaine</span>
                  <span className="text-sm font-medium text-[#0F172A]">5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Ce mois</span>
                  <span className="text-sm font-medium text-[#0F172A]">12</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[#0F172A]">
                Devis acceptés / refusés
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Taux d'acceptation</span>
                  <span className="text-lg font-semibold text-green-600">75%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Acceptés</span>
                  <span className="text-sm font-medium text-green-600">18</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Refusés</span>
                  <span className="text-sm font-medium text-red-600">6</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[#0F172A]">
                Clients actifs
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Total clients</span>
                  <span className="text-lg font-semibold text-[#0F172A]">45</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Actifs ce mois</span>
                  <span className="text-sm font-medium text-green-600">32</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Nouveaux</span>
                  <span className="text-sm font-medium text-blue-600">8</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold text-[#0F172A]">
                Performance équipes
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: "Jean Dupont", tasks: 45, completed: 42 },
                  { name: "Marie Martin", tasks: 38, completed: 36 },
                  { name: "Sophie Durand", tasks: 32, completed: 30 },
                ].map((member) => (
                  <div key={member.name} className="flex items-center justify-between">
                    <span className="text-sm text-[#0F172A]">{member.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#64748B]">
                        {member.completed}/{member.tasks}
                      </span>
                      <div className="w-20 bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-[#F97316] h-2 rounded-full"
                          style={{
                            width: `${(member.completed / member.tasks) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
          </>
        )}
      </div>
    </>
  );
}

