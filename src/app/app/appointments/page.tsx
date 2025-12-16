"use client";

import { useState } from "react";
import { PageTitle } from "@/components/layout/PageTitle";
import { AgendaView } from "@/components/appointments/AgendaView";
import { AppointmentsListView } from "@/components/appointments/AppointmentsListView";
import { AppointmentTypesView } from "@/components/appointments/AppointmentTypesView";
import { useAuth } from "@/hooks/useAuth";
import { PageTransition } from "@/components/ui/PageTransition";

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"agenda" | "list" | "types">("agenda");

  const tabs = [
    { id: "agenda" as const, label: "Agenda" },
    { id: "list" as const, label: "Liste des RDV" },
    { id: "types" as const, label: "Types de RDV" },
  ];

  return (
    <PageTransition>
      <PageTitle
        title="Prise de rendez-vous"
      />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Prise de rendez-vous</h1>
        </div>

        {/* Tabs */}
        <div className="border-b border-[#E5E7EB]">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-[#F97316] text-[#F97316]"
                    : "border-transparent text-[#64748B] hover:text-[#0F172A] hover:border-[#E5E7EB]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div>
          {activeTab === "agenda" && <AgendaView />}
          {activeTab === "list" && <AppointmentsListView />}
          {activeTab === "types" && <AppointmentTypesView />}
        </div>
      </div>
    </PageTransition>
  );
}

