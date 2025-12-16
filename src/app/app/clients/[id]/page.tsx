"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { PageTitle } from "@/components/layout/PageTitle";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { EmptyState } from "@/components/ui/EmptyState";
import Link from "next/link";
import { ClientModal } from "@/components/clients/ClientModal";
import { getClient } from "@/services/clientsService";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/ui/Loader";
import { ModuleLink } from "@/components/ui/ModuleLink";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { getTasks } from "@/services/tasksService";
import { getFollowUps } from "@/services/followupsService";
import { getProjects } from "@/services/projectsService";
import { getConversations } from "@/services/inboxService";

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
  const { token } = useAuth();
  const { isModuleEnabled } = useModuleAccess();
  const clientId = Number(params.id);
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<RecentInvoice[]>([]);
  const [activeFollowups, setActiveFollowups] = useState<ActiveFollowup[]>([]);
  const [activeTasks, setActiveTasks] = useState<ActiveTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const loadClient = async () => {
      setIsLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const isMockMode = !apiUrl || apiUrl.trim() === "";

        if (isMockMode) {
          // Mode mock - seulement les données du client
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

          setTimeout(() => {
            setClient(mockClient);
            // Pas de données mockées pour les messages, factures, etc.
            setRecentMessages([]);
            setRecentInvoices([]);
            setActiveFollowups([]);
            setActiveTasks([]);
            setIsLoading(false);
          }, 300);
        } else {
          // Mode avec backend
          const clientData = await getClient(clientId, token);
          setClient({
            id: clientData.id,
            name: clientData.name,
            type: clientData.type,
            sector: clientData.sector,
            contactEmail: clientData.contactEmail,
            contactPhone: clientData.contactPhone,
            address: clientData.address,
            tags: clientData.tags,
            lastContact: clientData.lastContact,
            totalInvoiced: clientData.totalInvoiced,
            totalPaid: clientData.totalPaid,
            openProjects: clientData.openProjects,
          });
          
          // Charger les données associées au client en parallèle
          const loadRelatedData = async () => {
            try {
              // Charger les messages récents (inbox)
              if (isModuleEnabled("inbox")) {
                try {
                  const conversations = await getConversations(token, { limit: 50 });
                  const clientConversations = conversations.filter(conv => conv.clientId === clientId);
                  const messages: RecentMessage[] = clientConversations.slice(0, 3).map(conv => ({
                    id: conv.id,
                    subject: conv.subject || "Sans objet",
                    date: conv.date,
                    source: conv.source,
                  }));
                  setRecentMessages(messages);
                } catch (err) {
                  console.error("Erreur lors du chargement des messages:", err);
                  setRecentMessages([]);
                }
              }
              
              // Charger les tâches actives
              if (isModuleEnabled("tasks")) {
                try {
                  const tasks = await getTasks(token, { status: "pending" });
                  const clientTasks = tasks.filter(task => task.clientId === clientId);
                  setActiveTasks(clientTasks.slice(0, 5).map(task => ({
                    id: task.id,
                    title: task.title,
                    dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString("fr-FR") : "Pas de date",
                    priority: task.priority || "normal",
                  })));
                } catch (err) {
                  console.error("Erreur lors du chargement des tâches:", err);
                  setActiveTasks([]);
                }
              }
              
              // Charger les relances actives
              if (isModuleEnabled("relances")) {
                try {
                  const followups = await getFollowUps(token, { clientId: clientId, status: "pending" });
                  setActiveFollowups(followups.slice(0, 5).map(fu => ({
                    id: fu.id,
                    type: fu.type || "Relance",
                    dueDate: fu.dueDate ? new Date(fu.dueDate).toLocaleDateString("fr-FR") : "Pas de date",
                    status: fu.status || "À faire",
                  })));
                } catch (err) {
                  console.error("Erreur lors du chargement des relances:", err);
                  setActiveFollowups([]);
                }
              }
              
              // Charger les projets actifs
              if (isModuleEnabled("projects")) {
                try {
                  const projects = await getProjects(token, { clientId: clientId, status: "active" });
                  // Le nombre de projets actifs est déjà dans clientData.openProjects
                  // On pourrait aussi charger les détails si nécessaire
                } catch (err) {
                  console.error("Erreur lors du chargement des projets:", err);
                }
              }
              
              // TODO: Charger les factures récentes quand l'API sera disponible
              setRecentInvoices([]);
            } catch (err) {
              console.error("Erreur lors du chargement des données associées:", err);
            }
          };
          
          // Charger les données associées en arrière-plan
          loadRelatedData();
          
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error("Erreur lors du chargement du client:", err);
        setIsLoading(false);
      }
    };

    loadClient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, token]);

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
        {/* Header avec bouton retour et édition */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="text-sm font-medium text-[#64748B] hover:text-[#0F172A]"
          >
            ← Retour à la liste
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
          >
            Modifier
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
                {isModuleEnabled("inbox") ? (
                  <ModuleLink
                    href={`/app/inbox?clientId=${client.id}`}
                    className="text-sm font-medium text-[#F97316] hover:text-[#EA580C]"
                    showTooltip
                  >
                    Voir tout
                  </ModuleLink>
                ) : (
                  <span className="text-sm text-slate-400">Module Inbox désactivé</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {recentMessages.length === 0 ? (
                <p className="text-sm text-[#64748B]">Aucun message récent</p>
              ) : (
                <div className="space-y-3">
                  {recentMessages.slice(0, 3).map((message) => (
                    <Link
                      key={message.id}
                      href={`/app/inbox?conversationId=${message.id}`}
                      className="block p-3 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] hover:border-[#F97316] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[#0F172A]">{message.subject}</span>
                        <span className="text-xs">{sourceIcons[message.source]}</span>
                      </div>
                      <p className="text-xs text-[#64748B]">
                        {new Date(message.date).toLocaleDateString("fr-FR")}
                      </p>
                    </Link>
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
                {isModuleEnabled("billing") ? (
                  <ModuleLink
                    href={`/app/billing?clientId=${client.id}`}
                    className="text-sm font-medium text-[#F97316] hover:text-[#EA580C]"
                    showTooltip
                  >
                    Voir tout
                  </ModuleLink>
                ) : (
                  <span className="text-sm text-slate-400">Module Billing désactivé</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {recentInvoices.length === 0 ? (
                <p className="text-sm text-[#64748B]">Aucune facture récente</p>
              ) : (
                <div className="space-y-3">
                  {recentInvoices.slice(0, 3).map((invoice) => (
                    <Link
                      key={invoice.id}
                      href={`/app/billing?invoiceId=${invoice.id}`}
                      className="block p-3 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] hover:border-[#F97316] cursor-pointer transition-colors"
                    >
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
                    </Link>
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
                {isModuleEnabled("relances") ? (
                  <ModuleLink
                    href={`/app/relances?clientId=${client.id}`}
                    className="text-sm font-medium text-[#F97316] hover:text-[#EA580C]"
                    showTooltip
                  >
                    Voir tout
                  </ModuleLink>
                ) : (
                  <span className="text-sm text-slate-400">Module Relances désactivé</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {activeFollowups.length === 0 ? (
                <p className="text-sm text-[#64748B]">Aucune relance active</p>
              ) : (
                <div className="space-y-3">
                  {activeFollowups.map((followup) => (
                    <Link
                      key={followup.id}
                      href={`/app/relances?followupId=${followup.id}`}
                      className="block p-3 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] hover:border-[#F97316] cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[#0F172A]">{followup.type}</span>
                        <Tag variant={followup.status === "À faire" ? "error" : "warning"}>
                          {followup.status}
                        </Tag>
                      </div>
                      <p className="text-xs text-[#64748B]">{followup.dueDate}</p>
                    </Link>
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
                {isModuleEnabled("tasks") ? (
                  <ModuleLink
                    href={`/app/tasks?clientId=${client.id}`}
                    className="text-sm font-medium text-[#F97316] hover:text-[#EA580C]"
                    showTooltip
                  >
                    Voir tout
                  </ModuleLink>
                ) : (
                  <span className="text-sm text-slate-400">Module Tâches désactivé</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {activeTasks.length === 0 ? (
                <p className="text-sm text-[#64748B]">Aucune tâche en cours</p>
              ) : (
                <div className="space-y-3">
                  {activeTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/app/tasks?taskId=${task.id}`}
                      className="block p-3 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] hover:border-[#F97316] cursor-pointer transition-colors"
                    >
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
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Projets actifs */}
          {isModuleEnabled("projects") && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[#0F172A]">Projets actifs</h3>
                  <ModuleLink
                    href={`/app/projects?clientId=${client.id}`}
                    className="text-sm font-medium text-[#F97316] hover:text-[#EA580C]"
                    showTooltip
                  >
                    Voir tout
                  </ModuleLink>
                </div>
              </CardHeader>
              <CardContent>
                {client.openProjects && client.openProjects > 0 ? (
                  <p className="text-sm text-[#64748B]">
                    {client.openProjects} projet{client.openProjects > 1 ? "s" : ""} en cours
                  </p>
                ) : (
                  <p className="text-sm text-[#64748B]">Aucun projet actif</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Boutons actions */}
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-[#0F172A]">Actions rapides</h3>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {isModuleEnabled("inbox") ? (
                <ModuleLink
                  href={`/app/inbox?clientId=${client.id}`}
                  className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB] text-center"
                  showTooltip
                >
                  Ouvrir Inbox
                </ModuleLink>
              ) : (
                <span className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-slate-400 text-center opacity-50 cursor-not-allowed">
                  Ouvrir Inbox
                </span>
              )}
              {isModuleEnabled("relances") ? (
                <ModuleLink
                  href={`/app/relances?clientId=${client.id}`}
                  className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB] text-center"
                  showTooltip
                >
                  Ouvrir Relances
                </ModuleLink>
              ) : (
                <span className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-slate-400 text-center opacity-50 cursor-not-allowed">
                  Ouvrir Relances
                </span>
              )}
              {isModuleEnabled("billing") ? (
                <ModuleLink
                  href={`/app/billing?clientId=${client.id}&action=create`}
                  className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB] text-center"
                  showTooltip
                >
                  Créer facture
                </ModuleLink>
              ) : (
                <span className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-slate-400 text-center opacity-50 cursor-not-allowed">
                  Créer facture
                </span>
              )}
              {isModuleEnabled("tasks") ? (
                <ModuleLink
                  href={`/app/tasks?clientId=${client.id}&action=create`}
                  className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB] text-center"
                  showTooltip
                >
                  Ajouter tâche
                </ModuleLink>
              ) : (
                <span className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-slate-400 text-center opacity-50 cursor-not-allowed">
                  Ajouter tâche
                </span>
              )}
              {isModuleEnabled("projects") && (
                <ModuleLink
                  href={`/app/projects?clientId=${client.id}&action=create`}
                  className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB] text-center"
                  showTooltip
                >
                  Créer projet
                </ModuleLink>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal d'édition */}
      {client && (
        <ClientModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            // Recharger le client après modification
            const loadClient = async () => {
              try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL;
                if (apiUrl && apiUrl.trim() !== "") {
                  const clientData = await getClient(clientId, token);
                  setClient({
                    id: clientData.id,
                    name: clientData.name,
                    type: clientData.type,
                    sector: clientData.sector,
                    contactEmail: clientData.contactEmail,
                    contactPhone: clientData.contactPhone,
                    address: clientData.address,
                    tags: clientData.tags,
                    lastContact: clientData.lastContact,
                    totalInvoiced: clientData.totalInvoiced,
                    totalPaid: clientData.totalPaid,
                    openProjects: clientData.openProjects,
                  });
                }
              } catch (err: any) {
                console.error("Erreur lors du rechargement:", err);
              }
            };
            loadClient();
            setIsModalOpen(false);
          }}
          onDelete={() => {
            // La redirection est gérée dans le modal, mais on peut aussi rediriger ici
            router.push("/app/clients");
          }}
          client={client}
        />
      )}
    </>
  );
}

