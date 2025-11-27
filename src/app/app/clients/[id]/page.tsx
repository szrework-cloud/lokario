"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { PageTitle } from "@/components/layout/PageTitle";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";

interface ClientDetail {
  id: number;
  name: string;
  type: "Client" | "Fournisseur";
  sector?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  tags?: ("VIP" | "régulier" | "nouveau")[];
  lastContact?: string;
  totalInvoiced?: number;
  totalPaid?: number;
  openProjects?: number;
}

interface RecentMessage {
  id: number;
  subject: string;
  date: string;
  source: "email" | "whatsapp" | "messenger";
}

interface RecentInvoice {
  id: number;
  number: string;
  amount: number;
  status: "envoyé" | "payé" | "impayé";
  date: string;
}

interface ActiveFollowup {
  id: number;
  type: string;
  dueDate: string;
  status: string;
}

interface ActiveTask {
  id: number;
  title: string;
  dueDate: string;
  priority: string;
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = Number(params.id);
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [activeFollowups, setActiveFollowups] = useState<ActiveFollowup[]>([]);
  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Récupérer les données depuis le backend
    // Mock data
    const mockClient: ClientDetail = {
      id: clientId,
      name: "Boulangerie Soleil",
      type: "Client",
      sector: "Commerce",
      contactEmail: "contact@boulangerie-soleil.fr",
      contactPhone: "01 23 45 67 89",
      address: "123 Rue de la Boulangerie, 75001 Paris",
      tags: ["VIP", "régulier"],
      lastContact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      totalInvoiced: 12500,
      totalPaid: 10000,
      openProjects: 1,
    };

    const mockMessages: RecentMessage[] = [
      {
        id: 1,
        subject: "Question sur la facture #2025-014",
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        source: "email",
      },
      {
        id: 2,
        subject: "Demande de devis",
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        source: "whatsapp",
      },
      {
        id: 3,
        subject: "Confirmation de commande",
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        source: "email",
      },
    ];

    const mockInvoices: RecentInvoice[] = [
      {
        id: 1,
        number: "FAC-2025-014",
        amount: 1250,
        status: "impayé",
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        number: "FAC-2025-010",
        amount: 850,
        status: "payé",
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: 3,
        number: "FAC-2025-005",
        amount: 1200,
        status: "payé",
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    const mockFollowups: ActiveFollowup[] = [
      {
        id: 1,
        type: "Facture impayée",
        dueDate: "En retard de 5 jours",
        status: "À faire",
      },
    ];

    const mockTasks: ActiveTask[] = [
      {
        id: 1,
        title: "Relancer facture #2025-014",
        dueDate: "Aujourd'hui",
        priority: "urgent",
      },
      {
        id: 2,
        title: "Préparer devis nouveau projet",
        dueDate: "Demain",
        priority: "high",
      },
    ];

    setTimeout(() => {
      setClient(mockClient);
      setRecentMessages(mockMessages);
      setRecentInvoices(mockInvoices);
      setActiveFollowups(mockFollowups);
      setActiveTasks(mockTasks);
      setIsLoading(false);
    }, 300);
  }, [clientId]);

  if (isLoading) {
    return (
      <>
        <PageTitle title="Chargement..." />
        <div className="flex items-center justify-center h-64">
          <p className="text-[#64748B]">Chargement de la fiche client...</p>
        </div>
      </>
    );
  }

  if (!client) {
    return (
      <>
        <PageTitle title="Client introuvable" />
        <Card>
          <EmptyState
            title="Client introuvable"
            description="Le client demandé n'existe pas ou a été supprimé."
            icon="❌"
          />
        </Card>
      </>
    );
  }

  const tagColors: Record<string, "success" | "warning" | "error" | "info" | "default"> = {
    VIP: "error",
    régulier: "success",
    nouveau: "info",
  };

  const sourceIcons: Record<string, string> = {
    email: "✉️",
    whatsapp: "📱",
    messenger: "💬",
  };

  return (
    <>
      <PageTitle title={client.name} />
      <div className="space-y-6">
        {/* Header avec bouton retour */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-sm font-medium text-[#64748B] hover:text-[#0F172A]"
          >
            ← Retour à la liste
          </button>
        </div>

        {/* Infos de contact */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#0F172A]">Informations de contact</h2>
              <Tag variant={client.type === "Client" ? "success" : "info"}>
                {client.type}
              </Tag>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {client.contactEmail && (
                <div>
                  <span className="text-sm font-medium text-[#64748B]">Email</span>
                  <p className="text-sm text-[#0F172A]">{client.contactEmail}</p>
                </div>
              )}
              {client.contactPhone && (
                <div>
                  <span className="text-sm font-medium text-[#64748B]">Téléphone</span>
                  <p className="text-sm text-[#0F172A]">{client.contactPhone}</p>
                </div>
              )}
              {client.address && (
                <div>
                  <span className="text-sm font-medium text-[#64748B]">Adresse</span>
                  <p className="text-sm text-[#0F172A]">{client.address}</p>
                </div>
              )}
              {client.sector && (
                <div>
                  <span className="text-sm font-medium text-[#64748B]">Secteur</span>
                  <p className="text-sm text-[#0F172A]">{client.sector}</p>
                </div>
              )}
            </div>

            {/* Tags */}
            {client.tags && client.tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-[#64748B]">Tags:</span>
                {client.tags.map((tag) => (
                  <Tag key={tag} variant={tagColors[tag] || "default"}>
                    {tag}
                  </Tag>
                ))}
              </div>
            )}

            {/* Dernier contact */}
            {client.lastContact && (
              <div>
                <span className="text-sm font-medium text-[#64748B]">Dernier contact:</span>
                <span className="text-sm text-[#0F172A] ml-2">
                  {new Date(client.lastContact).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Résumé */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 3 messages récents */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#0F172A]">Messages récents</h3>
                <Link
                  href={`/app/inbox?clientId=${client.id}`}
                  className="text-sm font-medium text-[#F97316] hover:text-[#EA580C]"
                >
                  Voir tout
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentMessages.length === 0 ? (
                <p className="text-sm text-[#64748B]">Aucun message récent</p>
              ) : (
                <div className="space-y-3">
                  {recentMessages.slice(0, 3).map((message) => (
                    <div key={message.id} className="p-3 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[#0F172A]">{message.subject}</span>
                        <span className="text-xs">{sourceIcons[message.source]}</span>
                      </div>
                      <p className="text-xs text-[#64748B]">
                        {new Date(message.date).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3 factures récentes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#0F172A]">Factures récentes</h3>
                <Link
                  href={`/app/billing?clientId=${client.id}`}
                  className="text-sm font-medium text-[#F97316] hover:text-[#EA580C]"
                >
                  Voir tout
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentInvoices.length === 0 ? (
                <p className="text-sm text-[#64748B]">Aucune facture récente</p>
              ) : (
                <div className="space-y-3">
                  {recentInvoices.slice(0, 3).map((invoice) => (
                    <div key={invoice.id} className="p-3 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[#0F172A]">{invoice.number}</span>
                        <Tag
                          variant={
                            invoice.status === "payé"
                              ? "success"
                              : invoice.status === "impayé"
                              ? "error"
                              : "default"
                          }
                        >
                          {invoice.status}
                        </Tag>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-[#64748B]">
                          {new Date(invoice.date).toLocaleDateString("fr-FR")}
                        </span>
                        <span className="text-sm font-semibold text-[#0F172A]">
                          {invoice.amount.toLocaleString("fr-FR")} €
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Relances actives */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#0F172A]">Relances actives</h3>
                <Link
                  href={`/app/relances?clientId=${client.id}`}
                  className="text-sm font-medium text-[#F97316] hover:text-[#EA580C]"
                >
                  Voir tout
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {activeFollowups.length === 0 ? (
                <p className="text-sm text-[#64748B]">Aucune relance active</p>
              ) : (
                <div className="space-y-3">
                  {activeFollowups.map((followup) => (
                    <div key={followup.id} className="p-3 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[#0F172A]">{followup.type}</span>
                        <Tag variant={followup.status === "À faire" ? "error" : "warning"}>
                          {followup.status}
                        </Tag>
                      </div>
                      <p className="text-xs text-[#64748B]">{followup.dueDate}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tâches en cours */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#0F172A]">Tâches en cours</h3>
                <Link
                  href={`/app/tasks?clientId=${client.id}`}
                  className="text-sm font-medium text-[#F97316] hover:text-[#EA580C]"
                >
                  Voir tout
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {activeTasks.length === 0 ? (
                <p className="text-sm text-[#64748B]">Aucune tâche en cours</p>
              ) : (
                <div className="space-y-3">
                  {activeTasks.map((task) => (
                    <div key={task.id} className="p-3 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[#0F172A]">{task.title}</span>
                        <Tag
                          variant={
                            task.priority === "urgent"
                              ? "error"
                              : task.priority === "high"
                              ? "warning"
                              : "default"
                          }
                        >
                          {task.priority}
                        </Tag>
                      </div>
                      <p className="text-xs text-[#64748B]">{task.dueDate}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Boutons actions */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-[#0F172A]">Actions rapides</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link
                href={`/app/inbox?clientId=${client.id}`}
                className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB] text-center"
              >
                Ouvrir Inbox
              </Link>
              <Link
                href={`/app/relances?clientId=${client.id}`}
                className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB] text-center"
              >
                Ouvrir Relances
              </Link>
              <Link
                href={`/app/billing?clientId=${client.id}&action=create`}
                className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB] text-center"
              >
                Créer facture
              </Link>
              <Link
                href={`/app/tasks?clientId=${client.id}&action=create`}
                className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB] text-center"
              >
                Ajouter tâche
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

