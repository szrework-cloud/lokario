"use client";

import { useState, useEffect, useMemo } from "react";
import { PageTitle } from "@/components/layout/PageTitle";
import { InboxList } from "@/components/inbox/InboxList";
import { InboxItem, InboxStatus, MessageSource, ClientInfo, InternalNote, Attachment, InboxFolder } from "@/components/inbox/types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loader } from "@/components/ui/Loader";
import { InboxFoldersSidebar } from "@/components/inbox/InboxFoldersSidebar";
import { ClassificationStatusBadge } from "@/components/inbox/ClassificationStatusBadge";
import { AutoReplyPreviewModal } from "@/components/inbox/AutoReplyPreviewModal";
import { InboxHeader } from "@/components/inbox/InboxHeader";
import { InboxSearchAndFilters } from "@/components/inbox/InboxSearchAndFilters";
import { ChatMessage } from "@/components/inbox/ChatMessage";
import { ClientInfoPanel } from "@/components/inbox/ClientInfoPanel";
import { InternalNotesPanel } from "@/components/inbox/InternalNotesPanel";
import { AttachmentUpload } from "@/components/inbox/AttachmentUpload";
import { AiActionsMenu } from "@/components/inbox/AiActionsMenu";
import { CreateTaskFromInboxModal } from "@/components/inbox/CreateTaskFromInboxModal";
import { CreateFollowupFromInboxModal } from "@/components/inbox/CreateFollowupFromInboxModal";
import Link from "next/link";

export default function InboxPage() {
  const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
  const [replyText, setReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [activeFolderId, setActiveFolderId] = useState<number | "all" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<MessageSource | "all">("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [showClientPanel, setShowClientPanel] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isConversationMinimized, setIsConversationMinimized] = useState(false);
  const [isReplyMinimized, setIsReplyMinimized] = useState(false);
  const [pendingReplyConversation, setPendingReplyConversation] = useState<InboxItem | null>(null);
  const [pendingReplyText, setPendingReplyText] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Sélectionner automatiquement la première conversation si disponible
      if (mockConversations.length > 0 && !selectedId) {
        setSelectedId(mockConversations[0].id);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Mock dossiers
  const [mockFolders, setMockFolders] = useState<InboxFolder[]>([
    {
      id: 1,
      name: "Archivé",
      type: "general",
      isSystem: true,
      conversationIds: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      name: "Spam",
      type: "general",
      isSystem: true,
      conversationIds: [],
      createdAt: new Date().toISOString(),
    },
    // Dossiers personnalisés (avec bouton d'édition)
    {
      id: 3,
      name: "Demande d'info/question",
      type: "info",
      color: "#3B82F6",
      isSystem: false,
      aiRules: {
        autoClassify: true,
        context: "Messages concernant des questions ou demandes d'information",
      },
      autoReply: {
        enabled: true,
        mode: "approval",
        template: "Bonjour, merci pour votre message. Nous vous répondrons dans les plus brefs délais.",
        aiGenerate: true,
        useCompanyKnowledge: true,
      },
      conversationIds: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 4,
      name: "Prise de RDV",
      type: "rdv",
      color: "#10B981",
      isSystem: false,
      aiRules: {
        autoClassify: true,
        context: "Messages pour planifier un rendez-vous",
      },
      autoReply: {
        enabled: true,
        mode: "auto",
        template: "Bonjour, nous avons bien reçu votre demande de rendez-vous. Nous vous contacterons sous peu pour confirmer.",
        aiGenerate: true,
        delay: 5,
      },
      conversationIds: [],
      createdAt: new Date().toISOString(),
    },
  ]);

  // Mock data avec toutes les nouvelles fonctionnalités
  const mockConversations: InboxItem[] = [
    {
      id: 1,
      client: "Boulangerie Soleil",
      clientId: 1,
      clientInfo: {
        id: 1,
        name: "Boulangerie Soleil",
        email: "contact@boulangerie-soleil.fr",
        phone: "01 23 45 67 89",
        address: "123 Rue de la Paix, 75001 Paris",
        status: "récurrent",
        totalPurchases: 12500,
        lastPurchaseDate: "2025-01-15",
        invoicesCount: 5,
        quotesCount: 2,
        projectsCount: 1,
        conversationsCount: 8,
      },
      subject: "Question sur la facture #2025-014",
      lastMessage: "Bonjour, j'aimerais avoir des précisions sur la facture...",
      status: "À répondre",
      date: "2025-01-20T10:00:00",
      source: "email",
      isUrgent: false,
      unreadCount: 1,
      messages: [
        {
          id: 1,
          from: "Boulangerie Soleil",
          fromEmail: "contact@boulangerie-soleil.fr",
          content: "Bonjour, j'aimerais avoir des précisions sur la facture #2025-014.",
          date: "2025-01-20T10:00:00",
          isFromClient: true,
          source: "email",
          read: false,
        },
      ],
      internalNotes: [],
    },
    {
      id: 2,
      client: "Mme Dupont",
      clientId: 3,
      clientInfo: {
        id: 3,
        name: "Mme Dupont",
        email: "dupont.marie@email.com",
        phone: "06 12 34 56 78",
        status: "nouveau",
        totalPurchases: 450,
        lastPurchaseDate: "2025-01-10",
        invoicesCount: 2,
        quotesCount: 1,
        projectsCount: 0,
        conversationsCount: 3,
      },
      subject: "Devis pour rénovation",
      lastMessage: "Merci pour le devis, je vais y réfléchir...",
      status: "En attente",
      date: "2025-01-19T14:30:00",
      source: "whatsapp",
      isUrgent: false,
      unreadCount: 0,
      messages: [
        {
          id: 1,
          from: "Mme Dupont",
          content: "Merci pour le devis, je vais y réfléchir et vous recontacter.",
          date: "2025-01-19T14:30:00",
          isFromClient: true,
          source: "whatsapp",
          read: true,
        },
        {
          id: 2,
          from: "Vous",
          content: "Parfait, n'hésitez pas si vous avez des questions !",
          date: "2025-01-19T14:35:00",
          isFromClient: false,
          source: "whatsapp",
          read: true,
        },
      ],
      internalNotes: [
        {
          id: 1,
          content: "Cette cliente est compliquée, attention 🧐",
          author: "Jean Dupont",
          createdAt: "2025-01-19T15:00:00",
        },
      ],
    },
    {
      id: 3,
      client: "M. Martin",
      clientId: 2,
      clientInfo: {
        id: 2,
        name: "M. Martin",
        email: "martin@example.com",
        phone: "06 98 76 54 32",
        status: "VIP",
        totalPurchases: 45000,
        lastPurchaseDate: "2025-01-18",
        invoicesCount: 12,
        quotesCount: 5,
        projectsCount: 3,
        conversationsCount: 15,
      },
      subject: "Confirmation RDV",
      lastMessage: "Parfait, je confirme le rendez-vous...",
      status: "Répondu",
      date: "2025-01-18T16:00:00",
      source: "messenger",
      isUrgent: false,
      unreadCount: 0,
      messages: [
        {
          id: 1,
          from: "M. Martin",
          content: "Parfait, je confirme le rendez-vous pour demain.",
          date: "2025-01-18T16:00:00",
          isFromClient: true,
          source: "messenger",
          read: true,
        },
        {
          id: 2,
          from: "Vous",
          content: "Parfait, à demain !",
          date: "2025-01-18T16:15:00",
          isFromClient: false,
          source: "messenger",
          read: true,
        },
      ],
      internalNotes: [],
    },
    {
      id: 4,
      client: "Nouveau Client",
      subject: "Demande de devis urgent",
      lastMessage: "Besoin urgent d'un devis pour...",
      status: "Urgent",
      date: "2025-01-20T09:00:00",
      source: "formulaire",
      isUrgent: true,
      unreadCount: 1,
      messages: [
        {
          id: 1,
          from: "Nouveau Client",
          content: "Besoin urgent d'un devis pour rénovation complète.",
          date: "2025-01-20T09:00:00",
          isFromClient: true,
          source: "formulaire",
          read: false,
          attachments: [
            {
              id: 1,
              name: "plan.pdf",
              type: "pdf",
              url: "#",
              size: 1024000,
              uploadedAt: "2025-01-20T09:00:00",
            },
          ],
        },
      ],
      internalNotes: [],
    },
  ];

  const mockEmployees = [
    { id: 1, name: "Jean Dupont" },
    { id: 2, name: "Marie Martin" },
    { id: 3, name: "Sophie Durand" },
  ];

  // Calculer les stats
  const stats = useMemo(() => {
    const pending = mockConversations.filter((c) => c.status === "À répondre").length;
    const urgent = mockConversations.filter((c) => c.status === "Urgent" || c.isUrgent).length;
    const waiting = mockConversations.filter((c) => c.status === "En attente").length;
    return {
      pending,
      urgent,
      waiting,
      total: mockConversations.length,
    };
  }, []);

  // Calculer les counts pour la sidebar (par dossier)
  const folderCounts = useMemo(() => {
    const result: Record<number | "all" | "pending", number> = {
      all: mockConversations.length,
      pending: mockConversations.filter(
        (c) => c.autoReplyPending && c.autoReplyMode === "approval"
      ).length,
    };

    // Counts par dossier
    mockFolders.forEach((folder) => {
      result[folder.id] = mockConversations.filter(
        (c) => c.folderId === folder.id
      ).length;
    });

    return result;
  }, [mockConversations, mockFolders]);

  // Filtrer les conversations
  const filteredConversations = useMemo(() => {
    let filtered = [...mockConversations];

    // Filtre par dossier
    if (activeFolderId === "pending") {
      filtered = filtered.filter(
        (c) => c.autoReplyPending && c.autoReplyMode === "approval"
      );
    } else if (activeFolderId !== "all") {
      filtered = filtered.filter((c) => c.folderId === activeFolderId);
    }

    // Recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.client.toLowerCase().includes(query) ||
          c.subject.toLowerCase().includes(query) ||
          c.lastMessage.toLowerCase().includes(query) ||
          c.clientInfo?.email?.toLowerCase().includes(query) ||
          c.clientInfo?.phone?.includes(query)
      );
    }

    // Filtre statut
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    // Filtre source
    if (sourceFilter !== "all") {
      filtered = filtered.filter((c) => c.source === sourceFilter);
    }

    // Filtre employé
    if (employeeFilter !== "all") {
      filtered = filtered.filter((c) => c.assignedTo === employeeFilter);
    }

    return filtered;
  }, [activeFolderId, searchQuery, statusFilter, sourceFilter, employeeFilter]);

  const selectedConversation = useMemo(() => {
    return mockConversations.find((c) => c.id === selectedId);
  }, [selectedId]);

  // Grouper les messages par jour pour l'affichage chat
  const groupedMessages = useMemo(() => {
    if (!selectedConversation) return [];
    const groups: Array<{ date: string; messages: typeof selectedConversation.messages }> = [];
    let currentDate = "";
    let currentGroup: typeof selectedConversation.messages = [];

    selectedConversation.messages.forEach((msg) => {
      const msgDate = new Date(msg.date).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      if (msgDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = msgDate;
        currentGroup = [msg];
      } else {
        currentGroup.push(msg);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  }, [selectedConversation]);

  const handleGenerateReply = () => {
    setReplyText(
      "(IA) Bonjour,\n\nMerci pour votre message concernant la facture #2025-014. Je vous envoie les détails demandés en pièce jointe.\n\nN'hésitez pas si vous avez d'autres questions.\n\nCordialement"
    );
  };

  const handleGenerateShort = () => {
    setReplyText("(IA - Courte) Merci pour votre message. Je reviens vers vous rapidement.");
  };

  const handleGenerateDetailed = () => {
    setReplyText(
      "(IA - Détaillée) Bonjour,\n\nMerci pour votre message concernant la facture #2025-014.\n\nVoici les détails que vous avez demandés :\n- Montant : XXX €\n- Date d'échéance : XX/XX/XXXX\n- Services : ...\n\nJe reste à votre disposition pour toute question supplémentaire.\n\nCordialement"
    );
  };

  const handleSummarize = () => {
    alert("Résumé du message : Le client demande des précisions sur la facture #2025-014.");
  };

  const handleIdentifyRequest = () => {
    alert("Demande identifiée : Question facture");
  };

  const handleAddNote = (content: string) => {
    if (!selectedConversation) return;
    // TODO: Appel API
    console.log("Add note:", content);
  };

  const handleAddAttachment = (file: File) => {
    const newAttachment: Attachment = {
      id: Date.now(),
      name: file.name,
      type: file.type.startsWith("image/") ? "image" : file.type === "application/pdf" ? "pdf" : "document",
      url: URL.createObjectURL(file),
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };
    setAttachments([...attachments, newAttachment]);
  };

  const handleRemoveAttachment = (id: number) => {
    setAttachments(attachments.filter((a) => a.id !== id));
  };

  const handleStatusChange = (newStatus: InboxStatus) => {
    if (!selectedConversation) return;
    // TODO: Appel API
    console.log("Change status:", newStatus);
  };

  return (
    <>
      <PageTitle title="Boîte de réception" />
      <div className="flex h-[calc(100vh-6rem)] bg-[#F9FAFB]">
        {/* Sidebar de dossiers */}
        <InboxFoldersSidebar
          folders={mockFolders}
          activeFolderId={activeFolderId}
          onFolderChange={setActiveFolderId}
          onFolderSave={(folder) => {
            // Mettre à jour le dossier dans mockFolders
            setMockFolders((prev) =>
              prev.map((f) => (f.id === folder.id ? folder : f))
            );
            console.log("Save folder:", folder);
          }}
          onFolderDelete={(folderId) => {
            // Supprimer le dossier de mockFolders
            setMockFolders((prev) => prev.filter((f) => f.id !== folderId));
            // Si le dossier supprimé était actif, revenir à "all"
            if (activeFolderId === folderId) {
              setActiveFolderId("all");
            }
            console.log("Delete folder:", folderId);
          }}
          counts={folderCounts}
        />

        {/* Contenu principal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header avec résumé */}
          <InboxHeader
            stats={stats}
            onNewMessage={() => console.log("New message")}
          />

          {/* Recherche et filtres */}
          <InboxSearchAndFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sourceFilter={sourceFilter}
            onSourceFilterChange={setSourceFilter}
            employeeFilter={employeeFilter}
            onEmployeeFilterChange={setEmployeeFilter}
            employees={mockEmployees}
          />

          {/* Corps principal */}
          <div className="flex-1 flex overflow-hidden">
            {/* Liste des conversations */}
            <div className="w-80 border-r border-[#E5E7EB] bg-white overflow-y-auto flex-shrink-0 h-full">
              {isLoading ? (
                <div className="p-4">
                  <Loader text="Chargement..." />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    title="Aucune conversation"
                    description="Aucune conversation ne correspond à vos filtres."
                    icon="📭"
                  />
                </div>
              ) : (
                <div className="p-2">
                  <InboxList
                    conversations={filteredConversations}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                  />
                </div>
              )}
            </div>

            {/* Vue conversation */}
            {selectedConversation ? (
              <>
                {!isConversationMinimized ? (
                  /* Vue conversation complète */
                  <div className="flex-1 flex flex-col overflow-hidden relative z-30 bg-white">
                    {/* Header conversation */}
                    <div className="bg-white border-b border-[#E5E7EB] p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setShowClientPanel(true)}
                              className="text-left hover:underline"
                            >
                              <h3 className="text-sm font-semibold text-[#0F172A]">
                                {selectedConversation.client}
                              </h3>
                              <p className="text-xs text-[#64748B]">
                                {selectedConversation.subject}
                              </p>
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Bouton minimiser */}
                            <button
                              onClick={() => setIsConversationMinimized(true)}
                              className="p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB]"
                              title="Minimiser"
                            >
                              ↓
                            </button>
                            {/* Statut */}
                            <select
                              value={selectedConversation.status}
                              onChange={(e) => handleStatusChange(e.target.value as InboxStatus)}
                              className="rounded-lg border border-[#E5E7EB] px-3 py-1 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                            >
                              <option value="À répondre">À répondre</option>
                              <option value="En attente">En attente</option>
                              <option value="Répondu">Répondu</option>
                              <option value="Résolu">Résolu</option>
                              <option value="Urgent">Urgent</option>
                              <option value="Archivé">Archivé</option>
                              <option value="Spam">Spam</option>
                            </select>
                            {/* Notes internes */}
                            <button
                              onClick={() => setShowNotesPanel(true)}
                              className="p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB]"
                              title="Notes internes"
                            >
                              📝
                            </button>
                          </div>
                    </div>
                  </div>

                  {/* Historique chat */}
                  <div
                    className="flex-1 overflow-y-auto p-4 bg-[#F9FAFB]"
                    onClick={(e) => {
                      // Si on clique dans le vide (pas sur un message), minimiser la zone de réponse
                      if (e.target === e.currentTarget) {
                        setIsReplyMinimized(true);
                      }
                    }}
                  >
                    {groupedMessages.map((group, groupIndex) =>
                      group.messages.map((message, msgIndex) => (
                        <ChatMessage
                          key={message.id}
                          message={message}
                          showDateSeparator={
                            msgIndex === 0 && groupIndex > 0
                          }
                          dateLabel={msgIndex === 0 ? group.date : undefined}
                        />
                      ))
                    )}
                  </div>

                  {/* Zone de réponse */}
                  {isReplyMinimized ? (
                    /* Barre minimisée de réponse */
                    <div
                      onClick={() => setIsReplyMinimized(false)}
                      className="bg-white border-t border-[#E5E7EB] p-2 cursor-pointer hover:bg-[#F9FAFB] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm text-[#64748B] bg-[#F9FAFB]">
                          {replyText || "Tapez votre réponse..."}
                        </div>
                        {replyText.trim() && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (replyText.trim()) {
                                console.log("Send message:", {
                                  to: selectedConversation?.client,
                                  subject: selectedConversation?.subject,
                                  content: replyText,
                                  attachments,
                                });
                                setReplyText("");
                                setAttachments([]);
                              }
                            }}
                            className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
                          >
                            Envoyer
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Zone de réponse complète */
                    <div className="bg-white border-t border-[#E5E7EB] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-[#0F172A]">
                          Réponse
                        </label>
                        <div className="flex items-center gap-2">
                          <AiActionsMenu
                            onGenerateShort={handleGenerateShort}
                            onGenerateDetailed={handleGenerateDetailed}
                            onSummarize={handleSummarize}
                            onIdentifyRequest={handleIdentifyRequest}
                          />
                        </div>
                      </div>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                        rows={4}
                        placeholder="Tapez votre réponse..."
                      />
                      <div className="mt-2">
                        <AttachmentUpload
                          attachments={attachments}
                          onAdd={handleAddAttachment}
                          onRemove={handleRemoveAttachment}
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => setIsTaskModalOpen(true)}
                            className="text-sm font-medium text-[#64748B] hover:text-[#0F172A]"
                          >
                            📋 Créer une tâche
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            onClick={() => setIsFollowupModalOpen(true)}
                            className="text-sm font-medium text-[#64748B] hover:text-[#0F172A]"
                          >
                            🔔 Créer une relance
                          </button>
                          <span className="text-slate-300">|</span>
                          <Link
                            href={`/app/projects?client=${encodeURIComponent(selectedConversation.client)}`}
                            className="text-sm font-medium text-[#64748B] hover:text-[#0F172A]"
                          >
                            📁 Associer à un projet
                          </Link>
                          <span className="text-slate-300">|</span>
                          <button
                            onClick={() => setShowClientPanel(true)}
                            className="text-sm font-medium text-[#64748B] hover:text-[#0F172A]"
                          >
                            👤 Fiche client
                          </button>
                        </div>
                        <button
                          onClick={async () => {
                            if (replyText.trim()) {
                              console.log("Send message:", {
                                to: selectedConversation?.client,
                                subject: selectedConversation?.subject,
                                content: replyText,
                                attachments,
                              });
                              setReplyText("");
                              setAttachments([]);
                            }
                          }}
                          disabled={!replyText.trim()}
                          className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
                        >
                          Envoyer
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                ) : (
                  /* Barre minimisée en bas */
                  <div
                    onClick={() => setIsConversationMinimized(false)}
                    className="fixed bottom-0 bg-white border-t border-l border-r border-[#E5E7EB] rounded-t-lg shadow-lg cursor-pointer hover:bg-[#F9FAFB] transition-all z-50"
                    style={{
                      left: "512px", // 192px (sidebar) + 320px (liste conversations)
                      right: "0",
                      height: "64px",
                    }}
                  >
                    <div className="p-3 flex items-center justify-between h-full">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#F97316] text-white flex items-center justify-center text-xs font-semibold">
                          {selectedConversation.clientInfo?.name
                            ? selectedConversation.clientInfo.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                            : selectedConversation.client
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#0F172A]">
                            {selectedConversation.client}
                          </p>
                          <p className="text-xs text-[#64748B]">
                            {selectedConversation.subject}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedId(undefined);
                          setIsConversationMinimized(false);
                        }}
                        className="text-[#64748B] hover:text-[#0F172A] p-1 text-xl"
                        title="Fermer"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  title="Sélectionnez une conversation"
                  description="Choisissez une conversation dans la liste pour commencer."
                  icon="💬"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panneaux latéraux */}
      {showClientPanel && selectedConversation?.clientInfo && (
        <ClientInfoPanel
          clientInfo={selectedConversation.clientInfo}
          onClose={() => setShowClientPanel(false)}
        />
      )}

      {showNotesPanel && selectedConversation && (
        <InternalNotesPanel
          notes={selectedConversation.internalNotes || []}
          onAddNote={handleAddNote}
          onClose={() => setShowNotesPanel(false)}
        />
      )}

      {/* Modals */}
      <CreateTaskFromInboxModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={(data) => {
          console.log("Create task:", data);
          setIsTaskModalOpen(false);
        }}
        defaultSubject={selectedConversation?.subject}
        defaultClient={selectedConversation?.client}
      />

      <CreateFollowupFromInboxModal
        isOpen={isFollowupModalOpen}
        onClose={() => setIsFollowupModalOpen(false)}
        onSubmit={(data) => {
          console.log("Create followup:", data);
          setIsFollowupModalOpen(false);
        }}
        defaultClient={selectedConversation?.client}
      />

      {/* Modal de réponse en attente */}
      {pendingReplyConversation && (
        <AutoReplyPreviewModal
          isOpen={!!pendingReplyConversation}
          onClose={() => {
            setPendingReplyConversation(null);
            setPendingReplyText("");
          }}
          conversation={pendingReplyConversation}
          folder={mockFolders.find((f) => f.id === pendingReplyConversation.folderId) || mockFolders[0]}
          generatedReply={pendingReplyText}
          onApprove={() => {
            // TODO: Appel API pour envoyer la réponse
            console.log("Approve and send reply:", pendingReplyText);
            setPendingReplyConversation(null);
            setPendingReplyText("");
          }}
          onEdit={(editedText) => {
            // TODO: Appel API pour envoyer la réponse modifiée
            console.log("Send edited reply:", editedText);
            setPendingReplyConversation(null);
            setPendingReplyText("");
          }}
          onReject={() => {
            // TODO: Appel API pour rejeter la réponse
            console.log("Reject reply");
            setPendingReplyConversation(null);
            setPendingReplyText("");
          }}
        />
      )}
    </>
  );
}
