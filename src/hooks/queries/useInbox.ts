import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  getConversations,
  getConversation,
  addMessage,
  updateConversation,
  deleteConversation,
  getFolders,
  MessageSource,
} from "@/services/inboxService";
import type { InboxItem, InboxFolder } from "@/components/inbox/types";

interface ConversationFilters {
  folderId?: number | "all" | "pending";
  status?: string;
  source?: MessageSource | "all";
  search?: string;
  limit?: number;
}

/**
 * Hook pour récupérer les conversations avec filtres
 */
export function useConversations(filters: ConversationFilters = {}) {
  const { token } = useAuth();

  return useQuery<InboxItem[]>({
    queryKey: ["inbox", "conversations", filters],
    queryFn: () => getConversations(token, filters),
    enabled: !!token,
    staleTime: 1000 * 30, // 30 secondes - l'inbox change souvent
  });
}

/**
 * Hook pour récupérer une conversation spécifique
 */
export function useConversation(conversationId?: number) {
  const { token } = useAuth();

  return useQuery<InboxItem>({
    queryKey: ["inbox", "conversation", conversationId],
    queryFn: () => getConversation(conversationId!, token),
    enabled: !!token && !!conversationId,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook pour récupérer les dossiers
 */
export function useFolders() {
  const { token } = useAuth();

  return useQuery<InboxFolder[]>({
    queryKey: ["inbox", "folders"],
    queryFn: () => getFolders(token),
    enabled: !!token,
    staleTime: 1000 * 60 * 10, // 10 minutes - les dossiers changent rarement
  });
}

/**
 * Hook pour ajouter un message (avec optimistic update)
 */
export function useAddMessage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      content,
      source = "email",
      attachments,
    }: {
      conversationId: number;
      content: string;
      source?: MessageSource;
      attachments?: File[];
    }) =>
      addMessage(
        conversationId,
        {
          fromName: "Vous", // Sera remplacé par le backend
          content,
          source,
          isFromClient: false,
          attachments: attachments?.map((file) => ({
            name: file.name,
            file_path: "", // Sera rempli par le backend
            file_type: file.type.startsWith("image/")
              ? "image"
              : file.type === "application/pdf"
              ? "pdf"
              : "document",
            file_size: file.size,
            mime_type: file.type,
          })),
        },
        token
      ),
    onMutate: async ({ conversationId, content }) => {
      // Annuler les requêtes en cours pour éviter les conflits
      await queryClient.cancelQueries({
        queryKey: ["inbox", "conversation", conversationId],
      });

      // Snapshot de la valeur précédente
      const previousConversation = queryClient.getQueryData<InboxItem>([
        "inbox",
        "conversation",
        conversationId,
      ]);

      // Optimistic update
      if (previousConversation) {
        queryClient.setQueryData<InboxItem>(
          ["inbox", "conversation", conversationId],
          {
            ...previousConversation,
            messages: [
              ...previousConversation.messages,
              {
                id: Date.now(), // ID temporaire
                content,
                sender: "user",
                timestamp: new Date().toISOString(),
                source: previousConversation.source,
              },
            ],
          }
        );
      }

      return { previousConversation };
    },
    onError: (err, variables, context) => {
      // Rollback en cas d'erreur
      if (context?.previousConversation) {
        queryClient.setQueryData(
          ["inbox", "conversation", variables.conversationId],
          context.previousConversation
        );
      }
    },
    onSettled: (data, error, variables) => {
      // Revalidation après la mutation
      queryClient.invalidateQueries({
        queryKey: ["inbox", "conversation", variables.conversationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["inbox", "conversations"],
      });
    },
  });
}

/**
 * Hook pour supprimer une conversation
 */
export function useDeleteConversation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      deleteOnImap = true,
    }: {
      conversationId: number;
      deleteOnImap?: boolean;
    }) => deleteConversation(conversationId, token, deleteOnImap),
    onSuccess: () => {
      // Invalider les listes de conversations
      queryClient.invalidateQueries({
        queryKey: ["inbox", "conversations"],
      });
    },
  });
}

