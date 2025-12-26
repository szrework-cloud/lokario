"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PageTitle } from "@/components/layout/PageTitle";
import { InboxList } from "@/components/inbox/InboxList";
import { InboxItem, InboxStatus, MessageSource, ClientInfo, InternalNote, Attachment, InboxFolder, Message } from "@/components/inbox/types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loader } from "@/components/ui/Loader";
import { InboxFoldersSidebar } from "@/components/inbox/InboxFoldersSidebar";
import { ClassificationStatusBadge } from "@/components/inbox/ClassificationStatusBadge";
import { InboxHeader } from "@/components/inbox/InboxHeader";
import { InboxSearchAndFilters } from "@/components/inbox/InboxSearchAndFilters";
import { ChatMessage } from "@/components/inbox/ChatMessage";
import { ClientInfoPanel } from "@/components/inbox/ClientInfoPanel";
import { InternalNotesPanel } from "@/components/inbox/InternalNotesPanel";
import { AttachmentUpload } from "@/components/inbox/AttachmentUpload";
import { AiActionsMenu } from "@/components/inbox/AiActionsMenu";
import { CreateTaskFromInboxModal } from "@/components/inbox/CreateTaskFromInboxModal";
import { CreateFollowupFromInboxModal } from "@/components/inbox/CreateFollowupFromInboxModal";
import { CreateConversationModal } from "@/components/inbox/CreateConversationModal";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { PageTransition } from "@/components/ui/PageTransition";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { useToast } from "@/components/ui/Toast";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import {
  getConversations,
  getConversation,
  addMessage,
  updateConversation,
  deleteConversation,
  deleteConversationsBulk,
  getFolders,
} from "@/services/inboxService";
import Link from "next/link";

export default function InboxPage() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const conversationIdFromUrl = searchParams?.get("conversationId");
  const clientIdFromUrl = searchParams?.get("clientId");
  const [selectedId, setSelectedId] = useState<number | undefined>(
    conversationIdFromUrl ? Number(conversationIdFromUrl) : undefined
  );
  const [replyText, setReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [conversations, setConversations] = useState<InboxItem[]>([]);
  const [allConversations, setAllConversations] = useState<InboxItem[]>([]); // Toutes les conversations pour calculer les compteurs
  const [selectedConversation, setSelectedConversation] = useState<InboxItem | null>(null);
  const [folders, setFolders] = useState<InboxFolder[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<number | "all" | "pending">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<MessageSource | "all">("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [showClientPanel, setShowClientPanel] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false);
  const [isNewConversationModalOpen, setIsNewConversationModalOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isConversationMinimized, setIsConversationMinimized] = useState(false);
  const [isReplyMinimized, setIsReplyMinimized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [selectedConversationIds, setSelectedConversationIds] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Charger les conversations et dossiers
  useEffect(() => {
    // Ne pas charger si pas de token
    if (!token) {
      setIsLoading(false);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Charger toutes les conversations pour calculer les compteurs correctement
        // (même si on filtre ensuite par dossier)
        const [allConversationsData, foldersData] = await Promise.all([
          getConversations(token, {
            // Ne pas filtrer par dossier pour avoir tous les compteurs
            folderId: undefined,
            status: statusFilter === "all" ? undefined : statusFilter,
            source: sourceFilter === "all" ? undefined : sourceFilter,
            search: searchQuery || undefined,
          }),
          getFolders(token),
        ]);
        
        // Filtrer les conversations selon le dossier actif pour l'affichage
        let conversationsData = allConversationsData;
        if (activeFolderId === "pending") {
          conversationsData = allConversationsData.filter(
            (c) => c.autoReplyPending && c.autoReplyMode === "approval"
          );
        } else if (activeFolderId === "all") {
          // Inbox principal : afficher uniquement les conversations SANS dossier
          conversationsData = allConversationsData.filter((c) => !c.folderId);
        } else if (typeof activeFolderId === "number") {
          conversationsData = allConversationsData.filter((c) => c.folderId === activeFolderId);
        }
        
        setConversations(conversationsData);
        // Stocker toutes les conversations pour calculer les compteurs
        setAllConversations(allConversationsData);
        setFolders(foldersData);
        
        // Sélectionner automatiquement la conversation depuis l'URL si disponible
        if (conversationIdFromUrl) {
          const conversationId = Number(conversationIdFromUrl);
          const conversation = conversationsData.find(c => c.id === conversationId);
          if (conversation) {
            setSelectedId(conversationId);
          }
        } else if (clientIdFromUrl) {
          // Si clientId est fourni, sélectionner la première conversation de ce client
          const clientId = Number(clientIdFromUrl);
          const clientConversation = conversationsData.find(c => c.clientId === clientId);
          if (clientConversation) {
            setSelectedId(clientConversation.id);
          }
        } else if (conversationsData.length > 0 && !selectedId) {
          // Sinon, sélectionner automatiquement la première conversation si disponible
          setSelectedId(conversationsData[0].id);
        }
      } catch (err: any) {
        console.error("Erreur lors du chargement:", err);
        
        // Détecter les erreurs d'authentification
        if (err.isAuthError || err.status === 401 || err.message?.includes("Could not validate credentials") || err.message?.includes("session a expiré")) {
          // Rediriger vers la page de login
          if (typeof window !== "undefined") {
            // Nettoyer le token invalide
            import("@/lib/auth-storage").then(({ clearAuthStorage }) => {
              clearAuthStorage();
              setTimeout(() => {
                window.location.href = "/login";
              }, 1000);
            });
          }
          setError("Votre session a expiré. Redirection vers la page de connexion...");
        } else {
          setError(err.message || "Erreur lors du chargement des conversations");
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce de la recherche
    const timeoutId = setTimeout(() => {
      loadData();
    }, searchQuery ? 300 : 0);

    return () => clearTimeout(timeoutId);
  }, [token, activeFolderId, statusFilter, sourceFilter, searchQuery]);

  // Charger la conversation sélectionnée
  useEffect(() => {
    if (!selectedId) {
      setSelectedConversation(null);
      return;
    }

    const loadConversation = async () => {
      try {
        const conversation = await getConversation(selectedId, token);
        setSelectedConversation(conversation);
        
        // Si la conversation a une réponse en attente, l'afficher dans le textarea
        logger.debug("[DEBUG] Conversation chargée:", {
          id: conversation.id,
          autoReplyPending: conversation.autoReplyPending,
          autoReplyMode: conversation.autoReplyMode,
          pendingReplyContent: conversation.pendingReplyContent || null,
          fullPendingReplyContent: conversation.pendingReplyContent || null
        });
        
        // Afficher la réponse en attente dans le textarea si mode approval
        if (conversation.autoReplyPending && conversation.autoReplyMode === "approval" && conversation.pendingReplyContent) {
          logger.debug("[DEBUG] Affichage de la réponse dans le textarea:", conversation.pendingReplyContent);
          setReplyText(conversation.pendingReplyContent);
        } else {
          logger.debug("[DEBUG] Pas de réponse en attente ou conditions non remplies");
          setReplyText("");
        }
      } catch (err: any) {
        console.error("Erreur lors du chargement de la conversation:", err);
        setError(err.message || "Erreur lors du chargement de la conversation");
      }
    };

    loadConversation();
  }, [selectedId, token]);

  // Mettre à jour le textarea quand selectedConversation change
  useEffect(() => {
    if (selectedConversation?.autoReplyPending && selectedConversation?.autoReplyMode === "approval" && selectedConversation?.pendingReplyContent) {
      logger.debug("[DEBUG] useEffect: Affichage de la réponse dans le textarea:", selectedConversation.pendingReplyContent);
      setReplyText(selectedConversation.pendingReplyContent);
    } else if (!selectedConversation?.autoReplyPending) {
      // Si pas de réponse en attente, vider le textarea
      setReplyText("");
    }
  }, [selectedConversation]);

  // Calculer les stats
  const stats = useMemo(() => {
    const pending = conversations.filter((c) => c.status === "À répondre").length;
    const urgent = conversations.filter((c) => c.status === "Urgent" || c.isUrgent).length;
    const waiting = conversations.filter((c) => c.status === "En attente").length;
    return {
      pending,
      urgent,
      waiting,
      total: conversations.length,
    };
  }, [conversations]);

  // Calculer les counts pour la sidebar (par dossier)
  // Utiliser allConversations pour avoir les vrais compteurs, pas seulement les conversations filtrées
  const folderCounts = useMemo(() => {
    const conversationsForCounts = allConversations.length > 0 ? allConversations : conversations;
    
    const result: Record<number | "all" | "pending", number> = {
      // "all" = conversations SANS dossier
      all: conversationsForCounts.filter((c) => !c.folderId).length,
      pending: conversationsForCounts.filter(
        (c) => c.autoReplyPending && c.autoReplyMode === "approval"
      ).length,
    };

    // Counts par dossier
    folders.forEach((folder) => {
      result[folder.id] = conversationsForCounts.filter(
        (c) => c.folderId === folder.id
      ).length;
    });

    return result;
  }, [allConversations, conversations, folders]);

  // Filtrer les conversations (déjà fait côté API, mais on peut ajouter des filtres frontend si nécessaire)
  const filteredConversations = useMemo(() => {
    let filtered = [...conversations];

    // Filtre par dossier (déjà fait côté API, mais on garde pour compatibilité)
    if (activeFolderId === "pending") {
      filtered = filtered.filter(
        (c) => c.autoReplyPending && c.autoReplyMode === "approval"
      );
    } else if (activeFolderId === "all") {
      // Inbox principal : afficher uniquement les conversations SANS dossier
      filtered = filtered.filter((c) => !c.folderId);
    } else if (typeof activeFolderId === "number") {
      filtered = filtered.filter((c) => c.folderId === activeFolderId);
    }

    // Filtre par statut (déjà fait côté API)
    if (statusFilter !== "all") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    // Filtre par source (déjà fait côté API)
    if (sourceFilter !== "all") {
      filtered = filtered.filter((c) => c.source === sourceFilter);
    }

    // Filtre par employé (à faire côté frontend pour l'instant)
    if (employeeFilter !== "all") {
      filtered = filtered.filter(
        (c) => c.assignedToId?.toString() === employeeFilter
      );
    }

    return filtered;
  }, [conversations, activeFolderId, statusFilter, sourceFilter, employeeFilter]);

  // TODO: Charger les employés depuis l'API
  const mockEmployees = [
    { id: 1, name: "Jean Dupont" },
    { id: 2, name: "Marie Martin" },
    { id: 3, name: "Sophie Durand" },
  ];

  // selectedConversation est maintenant chargé depuis l'API dans useEffect

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

  const handleGenerateReply = async () => {
    if (!selectedConversation || !token) return;
    try {
      const { generateAIReply } = await import("@/services/inboxService");
      setReplyText("Génération en cours...");
      const response = await generateAIReply(selectedConversation.id, token);
      setReplyText(response);
    } catch (err: any) {
      console.error("Erreur lors de la génération de la réponse:", err);
      setError(err.message || "Erreur lors de la génération de la réponse");
      setReplyText("");
    }
  };

  const handleSummarize = async () => {
    if (!selectedConversation || !token) return;
    try {
      const { summarizeConversation } = await import("@/services/inboxService");
      const summary = await summarizeConversation(selectedConversation.id, token);
      showToast(`Résumé : ${summary}`, "info", 10000);
    } catch (err: any) {
      console.error("Erreur lors du résumé:", err);
      setError(err.message || "Erreur lors du résumé");
    }
  };

  const handleAddNote = async (content: string) => {
    if (!selectedConversation || !token) return;
    try {
      const { addInternalNote } = await import("@/services/inboxService");
      const note = await addInternalNote(selectedConversation.id, content, token);
      // Recharger la conversation pour avoir la note
      const updated = await getConversation(selectedConversation.id, token);
      setSelectedConversation(updated);
    } catch (err: any) {
      console.error("Erreur lors de l'ajout de la note:", err);
      setError(err.message || "Erreur lors de l'ajout de la note");
    }
  };

  const handleAddAttachment = async (file: File) => {
    if (!selectedConversation || !token) return;
    
    try {
      const { uploadAttachment } = await import("@/services/inboxService");
      const uploadedFile = await uploadAttachment(selectedConversation.id, file, token);
      
      const newAttachment: Attachment = {
        id: Date.now(),
        name: uploadedFile.filename,
        type: uploadedFile.file_type as "image" | "pdf" | "document" | "other",
        url: uploadedFile.file_path, // Sera utilisé pour récupérer le fichier
        size: uploadedFile.file_size,
        uploadedAt: new Date().toISOString(),
        // Stocker les infos pour l'envoi
        filePath: uploadedFile.file_path,
        mimeType: uploadedFile.mime_type || undefined,
      };
      setAttachments([...attachments, newAttachment]);
    } catch (err: any) {
      console.error("Erreur lors de l'upload du fichier:", err);
      setError(err.message || "Erreur lors de l'upload du fichier");
    }
  };

  const handleRemoveAttachment = (id: number) => {
    setAttachments(attachments.filter((a) => a.id !== id));
  };

  const handleDeleteConversation = () => {
    if (!selectedConversation) return;
    setShowDeleteConfirm(true);
  };

  const confirmDeleteConversation = async () => {
    if (!selectedConversation || !token) return;
    
    setIsDeleting(true);
    setError(null);
    
    try {
      await deleteConversation(selectedConversation.id, token);
      
      // Retirer de la liste des conversations
      setConversations((prev) => prev.filter((c) => c.id !== selectedConversation.id));
      
      // Fermer la conversation sélectionnée
      setSelectedId(undefined);
      setSelectedConversation(null);
      
      // Fermer le modal et afficher un message de succès
      setShowDeleteConfirm(false);
      setDeleteSuccess("Email supprimé");
      
      // Cacher le message de succès après 3 secondes
      setTimeout(() => setDeleteSuccess(null), 3000);
    } catch (err: any) {
      console.error("Erreur lors de la suppression:", err);
      setError(err.message || "Erreur lors de la suppression de la conversation");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (newStatus: InboxStatus) => {
    if (!selectedConversation || !token) return;
    try {
      const updated = await updateConversation(
        selectedConversation.id,
        { status: newStatus },
        token
      );
      setSelectedConversation(updated);
      // Mettre à jour aussi dans la liste
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedConversation.id ? updated : c))
      );
      setAllConversations((prev) =>
        prev.map((c) => (c.id === selectedConversation.id ? updated : c))
      );
    } catch (err: any) {
      console.error("Erreur lors du changement de statut:", err);
      setError(err.message || "Erreur lors du changement de statut");
    }
  };

  const handleFolderChange = async (newFolderId: number | null) => {
    if (!selectedConversation || !token) return;
    try {
      const updated = await updateConversation(
        selectedConversation.id,
        { folderId: newFolderId },
        token
      );
      setSelectedConversation(updated);
      // Mettre à jour aussi dans la liste
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedConversation.id ? updated : c))
      );
      setAllConversations((prev) =>
        prev.map((c) => (c.id === selectedConversation.id ? updated : c))
      );
      showToast("Dossier mis à jour avec succès", "success");
    } catch (err: any) {
      console.error("Erreur lors du changement de dossier:", err);
      showToast(err.message || "Erreur lors du changement de dossier", "error");
    }
  };

  // Gestion de la sélection multiple
  const toggleSelection = (conversationId: number) => {
    setSelectedConversationIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedConversationIds.size === filteredConversations.length) {
      setSelectedConversationIds(new Set());
    } else {
      setSelectedConversationIds(new Set(filteredConversations.map((c) => c.id)));
    }
  };

  const handleBulkDeleteClick = () => {
    if (selectedConversationIds.size === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const handleBulkDelete = async () => {
    if (selectedConversationIds.size === 0 || !token) return;
    
    const idsArray = Array.from(selectedConversationIds);
    setIsDeleting(true);
    setShowBulkDeleteConfirm(false);
    
    try {
      const result = await deleteConversationsBulk(idsArray, token);
      setDeleteSuccess(result.message);
      
      // Retirer les conversations supprimées de la liste
      setConversations((prev) => prev.filter((c) => !selectedConversationIds.has(c.id)));
      setAllConversations((prev) => prev.filter((c) => !selectedConversationIds.has(c.id)));
      
      // Réinitialiser la sélection
      setSelectedConversationIds(new Set());
      setIsSelectionMode(false);
      
      // Si la conversation sélectionnée était supprimée, la désélectionner
      if (selectedId && selectedConversationIds.has(selectedId)) {
        setSelectedId(undefined);
        setSelectedConversation(null);
      }
      
      showToast(result.message, "success");
    } catch (err: any) {
      console.error("Erreur lors de la suppression en masse:", err);
      showToast(err.message || "Erreur lors de la suppression en masse", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PageTransition>
      <PageTitle title="Boîte de réception" />
      
      {/* Message de succès */}
      {deleteSuccess && (
        <div className="fixed top-20 right-4 z-50 bg-green-500 text-white px-3 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm">
          <span>✅</span>
          <span>{deleteSuccess}</span>
          <button
            onClick={() => setDeleteSuccess(null)}
            className="ml-2 hover:text-gray-200 text-xs"
          >
            ✕
          </button>
        </div>
      )}
      
      <div className="flex h-[calc(100vh-6rem)] bg-[#F9FAFB]">
        {/* Sidebar de dossiers */}
        <InboxFoldersSidebar
          folders={folders}
          activeFolderId={activeFolderId}
          onFolderChange={setActiveFolderId}
          onFolderSave={async (folder) => {
            if (!token) return;
            try {
              logger.debug("[InboxPage] Saving folder:", folder);
              const { updateFolder, createFolder } = await import("@/services/inboxService");
              const updated = "id" in folder && folder.id
                ? await updateFolder(folder.id, folder, token)
                : await createFolder(folder, token);
              logger.debug("[InboxPage] Folder saved:", updated);
              // Recharger les dossiers
              const foldersData = await getFolders(token);
              logger.debug("[InboxPage] Reloaded folders:", foldersData.length, foldersData);
              setFolders(foldersData);
            } catch (err: any) {
              console.error("Erreur lors de la sauvegarde du dossier:", err);
              const errorMessage = err.message || "Erreur lors de la sauvegarde du dossier";
              
              // Détecter l'erreur d'authentification
              if (errorMessage.includes("Could not validate credentials") || 
                  errorMessage.includes("credentials") || 
                  err.message?.includes("401")) {
                setError("Votre session a expiré. Veuillez vous reconnecter.");
                // Rediriger vers la page de login après 2 secondes
                setTimeout(() => {
                  window.location.href = "/login";
                }, 2000);
              } else {
                setError(errorMessage);
              }
            }
          }}
          onFolderDelete={async (folderId) => {
            if (!token) return;
            try {
              const { deleteFolder } = await import("@/services/inboxService");
              await deleteFolder(folderId, token);
              // Recharger les dossiers
              const foldersData = await getFolders(token);
              setFolders(foldersData);
              // Si le dossier supprimé était actif, revenir à "all"
              if (activeFolderId === folderId) {
                setActiveFolderId("all");
              }
            } catch (err: any) {
              console.error("Erreur lors de la suppression du dossier:", err);
              setError(err.message || "Erreur lors de la suppression du dossier");
            }
          }}
          counts={folderCounts}
          />
        </div>

        {/* Contenu principal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header avec résumé */}
          <InboxHeader
            stats={stats}
            onNewMessage={() => setIsNewConversationModalOpen(true)}
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

          {/* Barre d'actions de sélection multiple */}
          {isSelectionMode && (
            <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F9FAFB]">
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleSelectAll}
                  className="text-sm text-[#64748B] hover:text-[#0F172A] font-medium"
                >
                  {selectedConversationIds.size === filteredConversations.length
                    ? "Tout désélectionner"
                    : "Tout sélectionner"}
                </button>
                <span className="text-sm text-[#64748B]">
                  {selectedConversationIds.size} conversation(s) sélectionnée(s)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsSelectionMode(false);
                    setSelectedConversationIds(new Set());
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-sm text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#0F172A]"
                >
                  Annuler
                </button>
                <button
                  onClick={handleBulkDeleteClick}
                  disabled={selectedConversationIds.size === 0 || isDeleting}
                  className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? "Suppression..." : `Supprimer (${selectedConversationIds.size})`}
                </button>
              </div>
            </div>
          )}

          {/* Corps principal */}
          <div 
            className="flex-1 flex overflow-hidden"
            onClick={(e) => {
              // Annuler la sélection si on clique en dehors d'une conversation
              if (isSelectionMode && (e.target as HTMLElement).closest('.conversation-item') === null) {
                setIsSelectionMode(false);
                setSelectedConversationIds(new Set());
              }
            }}
          >
            {/* Liste des conversations */}
            {/* Liste des conversations - pleine largeur sur mobile si pas de conversation sélectionnée, sinon cachée */}
            <div className={cn(
              "border-r border-[#E5E7EB] bg-white overflow-y-auto flex-shrink-0 h-full",
              selectedId ? "hidden lg:block lg:w-80" : "w-full lg:w-80"
            )}>
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
                <div className="p-2 relative">
                  {/* Bouton pour activer le mode sélection */}
                  {!isSelectionMode && (
                    <button
                      onClick={() => setIsSelectionMode(true)}
                      className="absolute top-2 right-2 z-10 px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-sm text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#0F172A] shadow-sm"
                    >
                      Sélectionner
                    </button>
                  )}
                  <InboxList
                    conversations={filteredConversations}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    isSelectionMode={isSelectionMode}
                    selectedIds={selectedConversationIds}
                    onToggleSelection={toggleSelection}
                  />
                </div>
              )}
            </div>

            {/* Vue conversation - pleine largeur sur mobile, sinon flex-1 */}
            {selectedConversation ? (
              <>
                {!isConversationMinimized ? (
                  /* Vue conversation complète */
                  <div className={cn(
                    "flex flex-col overflow-hidden relative z-30 bg-white",
                    "w-full lg:flex-1"
                  )}>
                    {/* Header conversation */}
                    <div className="bg-white border-b border-[#E5E7EB] p-3">
                      <div className="flex items-center justify-between gap-2">
                        {/* Bouton retour sur mobile */}
                        <button
                          onClick={() => setSelectedId(undefined)}
                          className="lg:hidden p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F9FAFB] rounded-lg transition-colors flex-shrink-0"
                          aria-label="Retour à la liste"
                        >
                          ←
                        </button>
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button
                            onClick={() => setShowClientPanel(true)}
                            className="text-left hover:underline flex-1 min-w-0"
                          >
                            <h3 className="text-sm font-semibold text-[#0F172A] truncate">
                              {selectedConversation.client}
                            </h3>
                            <p className="text-xs text-[#64748B] truncate">
                              {selectedConversation.subject}
                            </p>
                          </button>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Dossier */}
                          <select
                            value={selectedConversation.folderId || ""}
                            onChange={(e) => handleFolderChange(e.target.value ? Number(e.target.value) : null)}
                            className="rounded-lg border border-[#E5E7EB] px-3 py-1 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                          >
                            <option value="">Aucun dossier</option>
                            {folders.map((folder) => (
                              <option key={folder.id} value={folder.id}>
                                {folder.name}
                              </option>
                            ))}
                          </select>
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
                          {/* Bouton supprimer */}
                          <button
                            onClick={handleDeleteConversation}
                            className="p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                            title="Supprimer la conversation"
                          >
                            🗑️
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
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!replyText.trim() || !selectedConversation || !token) return;
                                try {
                                  // Préparer les attachments pour l'envoi
                                  const messageAttachments = attachments
                                    .filter((att) => att.filePath)
                                    .map((att) => ({
                                      name: att.name,
                                      file_path: att.filePath!,
                                      file_type: att.type,
                                      file_size: att.size,
                                      mime_type: att.mimeType,
                                    }));

                                  const message = await addMessage(
                                    selectedConversation.id,
                                    {
                                      fromName: user?.full_name || user?.email || "Vous",
                                      content: replyText,
                                      source: selectedConversation.source,
                                      isFromClient: false,
                                      attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
                                    },
                                    token
                                  );
                                  const updated = await getConversation(selectedConversation.id, token);
                                  setSelectedConversation(updated);
                                  setConversations((prev) =>
                                    prev.map((c) => (c.id === selectedConversation.id ? updated : c))
                                  );
                                  setReplyText("");
                                  setAttachments([]);
                                } catch (err: any) {
                                  console.error("Erreur lors de l'envoi du message:", err);
                                  setError(err.message || "Erreur lors de l'envoi du message");
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
                              onGenerateReply={handleGenerateReply}
                              onSummarize={handleSummarize}
                            />
                          </div>
                        </div>
                        {/* Badge si réponse automatique en attente */}
                        {selectedConversation?.autoReplyPending && selectedConversation?.autoReplyMode === "approval" && replyText && (
                          <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-xs text-yellow-800">
                              ⏳ Réponse automatique générée - Vous pouvez la modifier avant d'envoyer
                            </p>
                          </div>
                        )}
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
                          {/* Bouton pour ignorer la réponse auto si elle est en attente */}
                          {selectedConversation?.autoReplyPending && selectedConversation?.autoReplyMode === "approval" && replyText && (
                            <button
                              onClick={() => {
                                // Ignorer la réponse = vider le texte
                                setReplyText("");
                              }}
                              className="px-4 py-2 text-sm font-medium text-[#64748B] hover:text-[#0F172A]"
                            >
                              Ignorer
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              if (!replyText.trim() || !selectedConversation || !token) return;
                              try {
                                // Préparer les attachments pour l'envoi
                                const messageAttachments = attachments
                                  .filter((att) => att.filePath)
                                  .map((att) => ({
                                    name: att.name,
                                    file_path: att.filePath!,
                                    file_type: att.type,
                                    file_size: att.size,
                                    mime_type: att.mimeType,
                                  }));

                                const message = await addMessage(
                                  selectedConversation.id,
                                  {
                                    fromName: user?.full_name || user?.email || "Vous",
                                    content: replyText,
                                    source: selectedConversation.source,
                                    isFromClient: false,
                                    attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
                                  },
                                  token
                                );
                                // Recharger la conversation pour avoir le nouveau message
                                const updated = await getConversation(selectedConversation.id, token);
                                setSelectedConversation(updated);
                                // Mettre à jour aussi dans la liste
                                setConversations((prev) =>
                                  prev.map((c) => (c.id === selectedConversation.id ? updated : c))
                                );
                                setReplyText("");
                                setAttachments([]);
                              } catch (err: any) {
                                console.error("Erreur lors de l'envoi du message:", err);
                                setError(err.message || "Erreur lors de l'envoi du message");
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

      {/* Modal de création de conversation */}
      <CreateConversationModal
        isOpen={isNewConversationModalOpen}
        onClose={() => setIsNewConversationModalOpen(false)}
        onSuccess={async () => {
          // Recharger les conversations
          try {
            const [conversationsData, foldersData] = await Promise.all([
              getConversations(token, {
                folderId: activeFolderId === "all" ? undefined : activeFolderId === "pending" ? undefined : activeFolderId,
                status: statusFilter === "all" ? undefined : statusFilter,
                source: sourceFilter === "all" ? undefined : sourceFilter,
                search: searchQuery || undefined,
              }),
              getFolders(token),
            ]);
            setConversations(conversationsData);
            setFolders(foldersData);
          } catch (err: any) {
            console.error("Erreur lors du rechargement:", err);
          }
        }}
      />

      {/* Modals */}
      <CreateTaskFromInboxModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={(data) => {
          logger.debug("Create task:", data);
          setIsTaskModalOpen(false);
        }}
        defaultSubject={selectedConversation?.subject}
        defaultClient={selectedConversation?.client}
      />

      <CreateFollowupFromInboxModal
        isOpen={isFollowupModalOpen}
        onClose={() => setIsFollowupModalOpen(false)}
        onSubmit={(data) => {
          logger.debug("Create followup:", data);
          setIsFollowupModalOpen(false);
        }}
        defaultClient={selectedConversation?.client}
      />

      {/* Modal de confirmation de suppression en masse */}
      {showBulkDeleteConfirm && (
        <>
          {/* Overlay noir */}
          <div 
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => !isDeleting && setShowBulkDeleteConfirm(false)}
          />
          {/* Modal centré au milieu de l'écran */}
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="bg-white rounded-lg shadow-xl p-6 text-center pointer-events-auto max-w-md w-full mx-4"
            >
              <h3 className="text-lg font-semibold text-[#0F172A] mb-4">
                Confirmer la suppression
              </h3>
              <p className="text-sm text-[#64748B] mb-6">
                Êtes-vous sûr de vouloir supprimer <strong>{selectedConversationIds.size}</strong> conversation(s) ? Cette action est irréversible.
              </p>
              
              <div className="flex justify-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-4 py-2"
                >
                  Annuler
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="px-4 py-2"
                >
                  {isDeleting ? "Suppression..." : "Supprimer"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de confirmation de suppression */}
      {showDeleteConfirm && (
        <>
          {/* Overlay noir */}
          <div 
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => !isDeleting && setShowDeleteConfirm(false)}
          />
          {/* Modal centré au milieu de l'écran */}
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="bg-white rounded-lg shadow-xl p-4 text-center pointer-events-auto w-64"
            >
              <p className="text-xs text-[#64748B] mb-3">
                Supprimer cet email ?
              </p>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-2 py-1.5 rounded-lg text-xs mb-3">
                  {error}
                </div>
              )}
              
              <div className="flex justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setError(null);
                  }}
                  disabled={isDeleting}
                  className="text-xs px-3 py-1"
                >
                  Annuler
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={confirmDeleteConversation}
                  disabled={isDeleting}
                  className="text-xs px-3 py-1"
                >
                  {isDeleting ? "Suppression..." : "Supprimer"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </PageTransition>
  );
}
