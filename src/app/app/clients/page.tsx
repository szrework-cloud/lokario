"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageTitle } from "@/components/layout/PageTitle";
import { ClientList, Client } from "@/components/clients/ClientList";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";

export default function ClientsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // TODO: Récupérer les clients depuis le backend
  const mockClients: Client[] = [
    {
      id: 1,
      name: "Boulangerie Soleil",
      type: "Client",
      sector: "Commerce",
      contactEmail: "contact@boulangerie-soleil.fr",
      contactPhone: "01 23 45 67 89",
      tags: ["VIP", "régulier"],
      lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      tasksCount: 2,
      remindersCount: 1,
      invoicesCount: 5,
      totalInvoiced: 12500,
      totalPaid: 10000,
      openProjects: 1,
    },
    {
      id: 2,
      name: "Fournisseur Boissons SA",
      type: "Fournisseur",
      sector: "Distribution",
      contactEmail: "commercial@boissons-sa.fr",
      contactPhone: "01 98 76 54 32",
      tags: ["régulier"],
      lastContact: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      tasksCount: 0,
      remindersCount: 0,
      invoicesCount: 3,
      totalInvoiced: 8500,
      totalPaid: 8500,
    },
    {
      id: 3,
      name: "Mme Dupont",
      type: "Client",
      sector: "Beauté / Coiffure",
      contactEmail: "dupont.marie@email.com",
      contactPhone: "06 12 34 56 78",
      tags: ["nouveau"],
      lastContact: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      tasksCount: 1,
      remindersCount: 1,
      invoicesCount: 2,
      totalInvoiced: 320,
      totalPaid: 0,
    },
    {
      id: 4,
      name: "M. Martin",
      type: "Client",
      sector: "Services",
      contactEmail: "martin.pierre@email.com",
      contactPhone: "06 87 65 43 21",
      tags: ["régulier"],
      lastContact: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      tasksCount: 0,
      remindersCount: 1,
      invoicesCount: 1,
      totalInvoiced: 450,
      totalPaid: 450,
    },
  ];

  // Filtrage par recherche
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) {
      return mockClients;
    }
    const query = searchQuery.toLowerCase();
    return mockClients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.sector?.toLowerCase().includes(query) ||
        client.type.toLowerCase().includes(query) ||
        client.tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  return (
    <>
      <PageTitle title="Clients" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A]">Clients</h1>
          </div>
        <button
          className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
          title="TODO: Ouvrir modal/formulaire pour créer un client"
        >
          + Nouveau client
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Rechercher un client..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
        />
      </div>

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <Card>
          <EmptyState
            title={searchQuery ? "Aucun client trouvé" : "Vous n'avez pas encore de clients enregistrés"}
            description={searchQuery ? "Essayez avec d'autres mots-clés." : "Ajoutez votre premier client pour commencer à gérer vos relations."}
            action={
              !searchQuery && (
                <button className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2">
                  Ajouter un client
                </button>
              )
            }
            icon={searchQuery ? "🔍" : "👥"}
          />
        </Card>
      ) : (
        <ClientList
          clients={filteredClients}
          onClientClick={(client) => {
            router.push(`/app/clients/${client.id}`);
          }}
        />
      )}
      </div>
    </>
  );
}

