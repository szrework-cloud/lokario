"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageTitle } from "@/components/layout/PageTitle";
import { ClientList, Client } from "@/components/clients/ClientList";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { getClients as fetchClients } from "@/services/clientsService";
import { Loader } from "@/components/ui/Loader";
import { ClientModal } from "@/components/clients/ClientModal";
import { PageTransition } from "@/components/ui/PageTransition";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { StaggerList } from "@/components/ui/PageTransition";
import { ClientCard } from "@/components/clients/ClientCard";

export default function ClientsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Charger les clients depuis l'API
  useEffect(() => {
    const loadClients = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchClients(token, searchQuery || undefined);
        setClients(data);
      } catch (err: any) {
        console.error("Erreur lors du chargement des clients:", err);
        setError(err.message || "Erreur lors du chargement des clients");
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce de la recherche
    const timeoutId = setTimeout(() => {
      loadClients();
    }, searchQuery ? 300 : 0);

    return () => clearTimeout(timeoutId);
  }, [token, searchQuery]);

  const handleOpenCreateModal = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client: Client) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingClient(null);
  };

  const handleModalSuccess = () => {
    // Recharger la liste des clients après création/modification
    const loadClients = async () => {
      try {
        const data = await fetchClients(token, searchQuery || undefined);
        setClients(data);
      } catch (err: any) {
        console.error("Erreur lors du rechargement:", err);
      }
    };
    loadClients();
  };

  const handleModalDelete = () => {
    // Recharger la liste des clients après suppression
    handleModalSuccess();
  };

  if (isLoading) {
    return (
      <>
        <PageTitle title="Clients" />
        <div className="flex items-center justify-center h-64">
          <Loader />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageTitle title="Clients" />
        <Card>
          <EmptyState
            title="Erreur"
            description={error}
            icon="❌"
          />
        </Card>
      </>
    );
  }

  return (
    <PageTransition>
      <PageTitle title="Clients" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A]">Clients</h1>
          </div>
        <AnimatedButton
          variant="primary"
          onClick={handleOpenCreateModal}
        >
          + Nouveau client
        </AnimatedButton>
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
      {clients.length === 0 ? (
        <Card>
          <EmptyState
            title={searchQuery ? "Aucun client trouvé" : "Vous n'avez pas encore de clients enregistrés"}
            description={searchQuery ? "Essayez avec d'autres mots-clés." : "Ajoutez votre premier client pour commencer à gérer vos relations."}
            action={
              !searchQuery && (
                <button
                  onClick={handleOpenCreateModal}
                  className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
                >
                  Ajouter un client
                </button>
              )
            }
            icon={searchQuery ? "🔍" : "👥"}
          />
        </Card>
      ) : (
        <StaggerList staggerDelay={0.05} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client, index) => (
            <ClientCard
              key={client.id}
              client={client}
              delay={index * 0.05}
              onClick={() => router.push(`/app/clients/${client.id}`)}
            />
          ))}
        </StaggerList>
      )}

      {/* Modal de création/édition */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        onDelete={handleModalDelete}
        client={editingClient}
      />
      </div>
    </PageTransition>
  );
}

