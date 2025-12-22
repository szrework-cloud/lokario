import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

// Helper pour construire l'URL API (copié de api.ts car buildApiUrl n'est pas exporté)
function buildApiUrl(path: string): string {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}
import type {
  InboxItem,
  InboxStatus,
  MessageSource,
  InboxFolder,
  Message,
  InternalNote,
  ClientInfo,
} from "@/components/inbox/types";

// Types API (réponses backend)
interface ConversationAPIResponse {
  id: number;
  company_id: number;
  subject: string | null;
  status: string;
  source: string;
  client_id: number | null;
  folder_id: number | null;
  assigned_to_id: number | null;
  is_urgent: boolean;
  ai_classified: boolean;
  classification_confidence: number | null;
  auto_reply_sent: boolean;
  auto_reply_pending: boolean;
  auto_reply_mode: string | null;
  unread_count: number;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  client_name: string | null;
  assigned_to_name: string | null;
  folder_name: string | null;
  client_email: string | null;
  client_phone: string | null;
}

interface MessageAPIResponse {
  id: number;
  conversation_id: number;
  from_name: string;
  from_email: string | null;
  from_phone: string | null;
  content: string;
  source: string;
  is_from_client: boolean;
  read: boolean;
  external_id: string | null;
  external_metadata: any;
  created_at: string;
  attachments: AttachmentAPIResponse[];
}

interface AttachmentAPIResponse {
  id: number;
  message_id: number;
  name: string;
  file_type: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  created_at: string;
}

interface ConversationDetailAPIResponse extends ConversationAPIResponse {
  messages: MessageAPIResponse[];
  internal_notes: InternalNoteAPIResponse[];
  pending_reply_content?: string | null;
}

interface InternalNoteAPIResponse {
  id: number;
  conversation_id: number;
  author_id: number;
  author_name: string | null;
  content: string;
  created_at: string;
}

interface FolderAPIResponse {
  id: number;
  company_id: number;
  name: string;
  color: string | null;
  folder_type: string;
  is_system: boolean;
  ai_rules: any;
  auto_reply: any;
  created_at: string;
  updated_at: string;
}

/**
 * Convertit une réponse API Conversation en InboxItem frontend
 */
function mapConversationToInboxItem(
  conv: ConversationAPIResponse,
  lastMessage?: string
): InboxItem {
  return {
    id: conv.id,
    client: conv.client_name || "Client inconnu",
    clientId: conv.client_id || undefined,
    clientEmail: conv.client_email || undefined,
    clientPhone: conv.client_phone || undefined,
    subject: conv.subject || "",
    lastMessage: lastMessage || "",
    status: conv.status as InboxStatus,
    date: conv.last_message_at || conv.created_at,
    source: conv.source as MessageSource,
    messages: [], // Sera chargé séparément si nécessaire
    assignedTo: conv.assigned_to_name || undefined,
    assignedToId: conv.assigned_to_id || undefined,
    isUrgent: conv.is_urgent,
    unreadCount: conv.unread_count,
    folderId: conv.folder_id || undefined,
    aiClassified: conv.ai_classified,
    classificationConfidence: conv.classification_confidence || undefined,
    autoReplySent: conv.auto_reply_sent,
    autoReplyPending: conv.auto_reply_pending,
    autoReplyMode: (conv.auto_reply_mode as any) || undefined,
  };
}

/**
 * Convertit une réponse API Message en Message frontend
 */
function mapMessageToFrontend(msg: MessageAPIResponse): Message {
  return {
    id: msg.id,
    from: msg.from_name,
    fromEmail: msg.from_email || undefined,
    content: msg.content,
    date: msg.created_at,
    isFromClient: msg.is_from_client,
    source: msg.source as MessageSource,
    read: msg.read,
      attachments: msg.attachments.map((att) => {
        // Générer l'URL complète pour télécharger le fichier
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const fileUrl = apiUrl 
          ? `${apiUrl}/inbox/attachments/${att.file_path}`
          : att.file_path;
        
        return {
          id: att.id,
          name: att.name,
          type: att.file_type as "image" | "pdf" | "document" | "other",
          url: fileUrl,
          size: att.file_size,
          uploadedAt: att.created_at,
        };
      }),
  };
}

/**
 * Récupère la liste des conversations
 */
export async function getConversations(
  token: string | null,
  options?: {
    folderId?: number | "all" | "pending";
    status?: string;
    source?: MessageSource | "all";
    search?: string;
    limit?: number;  // Limite de conversations à récupérer
  }
): Promise<InboxItem[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] getConversations", options);
    return [];
  }

  // Construire les paramètres de requête
  const params = new URLSearchParams();
  if (options?.folderId && options.folderId !== "all" && options.folderId !== "pending") {
    params.append("folder_id", options.folderId.toString());
  }
  if (options?.status && options.status !== "all") {
    params.append("status", options.status);
  }
  if (options?.source && options.source !== "all") {
    params.append("source", options.source);
  }
  if (options?.search) {
    params.append("search", options.search);
  }
  // Ajouter la limite (1000 par défaut pour éviter la limitation)
  params.append("limit", (options?.limit || 1000).toString());

  const conversations = await apiGet<ConversationAPIResponse[]>(
    `/inbox/conversations?${params.toString()}`,
    token
  );

  // Convertir et enrichir avec le dernier message (on devra peut-être charger les messages séparément)
  return conversations.map((conv) => mapConversationToInboxItem(conv));
}

/**
 * Récupère une conversation avec tous ses messages
 */
export async function getConversation(
  conversationId: number,
  token: string | null
): Promise<InboxItem> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] getConversation", conversationId);
    return {
      id: conversationId,
      client: "Client mock",
      subject: "Sujet mock",
      lastMessage: "Message mock",
      status: "À répondre",
      date: new Date().toISOString(),
      source: "email",
      messages: [],
    };
  }

  const conversation = await apiGet<ConversationDetailAPIResponse>(
    `/inbox/conversations/${conversationId}`,
    token
  );

  // Convertir les messages
  const messages = conversation.messages.map(mapMessageToFrontend);

  return {
    id: conversation.id,
    client: conversation.client_name || "Client inconnu",
    clientId: conversation.client_id || undefined,
    clientEmail: conversation.client_email || undefined,
    clientPhone: conversation.client_phone || undefined,
    subject: conversation.subject || "",
    lastMessage: messages.length > 0 ? messages[messages.length - 1].content : "",
    status: conversation.status as InboxStatus,
    date: conversation.last_message_at || conversation.created_at,
    source: conversation.source as MessageSource,
    messages: messages,
    assignedTo: conversation.assigned_to_name || undefined,
    assignedToId: conversation.assigned_to_id || undefined,
    isUrgent: conversation.is_urgent,
    unreadCount: conversation.unread_count,
    folderId: conversation.folder_id || undefined,
    aiClassified: conversation.ai_classified,
    classificationConfidence: conversation.classification_confidence || undefined,
    autoReplySent: conversation.auto_reply_sent,
    autoReplyPending: conversation.auto_reply_pending,
    autoReplyMode: (conversation.auto_reply_mode as any) || undefined,
    pendingReplyContent: conversation.pending_reply_content || undefined,
    internalNotes: conversation.internal_notes.map((note) => ({
      id: note.id,
      content: note.content,
      author: note.author_name || "Auteur inconnu",
      createdAt: note.created_at,
    })),
  };
}

/**
 * Crée une nouvelle conversation
 */
export async function createConversation(
  conversationData: {
    subject?: string;
    status: InboxStatus;
    source: MessageSource;
    clientId?: number;
    folderId?: number;
    firstMessage: {
      fromName: string;
      fromEmail?: string;
      fromPhone?: string;
      content: string;
      source: MessageSource;
      isFromClient: boolean;
    };
  },
  token: string | null
): Promise<InboxItem> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] createConversation", conversationData);
    return {
      id: Date.now(),
      client: "Nouveau client",
      subject: conversationData.subject || "",
      lastMessage: conversationData.firstMessage.content,
      status: conversationData.status,
      date: new Date().toISOString(),
      source: conversationData.source,
      messages: [],
    };
  }

  const payload = {
    subject: conversationData.subject,
    status: conversationData.status,
    source: conversationData.source,
    client_id: conversationData.clientId,
    folder_id: conversationData.folderId,
    first_message: {
      from_name: conversationData.firstMessage.fromName,
      from_email: conversationData.firstMessage.fromEmail,
      from_phone: conversationData.firstMessage.fromPhone,
      content: conversationData.firstMessage.content,
      source: conversationData.firstMessage.source,
      is_from_client: conversationData.firstMessage.isFromClient,
    },
  };

  const conversation = await apiPost<ConversationAPIResponse>(
    "/inbox/conversations",
    payload,
    token
  );

  return mapConversationToInboxItem(conversation, conversationData.firstMessage.content);
}

/**
 * Upload un fichier pour une conversation
 */
export async function uploadAttachment(
  conversationId: number,
  file: File,
  token: string | null
): Promise<{
  filename: string;
  file_path: string;
  file_type: string;
  file_size: number;
  mime_type: string | null;
}> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] uploadAttachment", conversationId, file.name);
    return {
      filename: file.name,
      file_path: `mock/${file.name}`,
      file_type: file.type.startsWith("image/") ? "image" : file.type === "application/pdf" ? "pdf" : "document",
      file_size: file.size,
      mime_type: file.type,
    };
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${apiUrl}/inbox/conversations/${conversationId}/messages/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Erreur lors de l'upload" }));
    throw new Error(error.detail || "Erreur lors de l'upload du fichier");
  }

  return response.json();
}

/**
 * Ajoute un message à une conversation
 */
export async function addMessage(
  conversationId: number,
  messageData: {
    fromName: string;
    fromEmail?: string;
    fromPhone?: string;
    content: string;
    source: MessageSource;
    isFromClient: boolean;
    attachments?: Array<{
      name: string;
      file_path: string;
      file_type: string;
      file_size: number;
      mime_type?: string | null;
    }>;
  },
  token: string | null
): Promise<Message> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] addMessage", conversationId, messageData);
    return {
      id: Date.now(),
      from: messageData.fromName,
      fromEmail: messageData.fromEmail,
      content: messageData.content,
      date: new Date().toISOString(),
      isFromClient: messageData.isFromClient,
      source: messageData.source,
      read: !messageData.isFromClient,
    };
  }

  const payload: any = {
    conversation_id: conversationId, // Requis par le schéma MessageCreate
    from_name: messageData.fromName,
    from_email: messageData.fromEmail,
    from_phone: messageData.fromPhone,
    content: messageData.content,
    source: messageData.source,
    is_from_client: messageData.isFromClient,
  };

  // Ajouter les attachments si fournis
  if (messageData.attachments && messageData.attachments.length > 0) {
    payload.attachments = messageData.attachments.map((att) => ({
      name: att.name,
      file_path: att.file_path,
      file_type: att.file_type,
      file_size: att.file_size,
      mime_type: att.mime_type,
    }));
  }

  const message = await apiPost<MessageAPIResponse>(
    `/inbox/conversations/${conversationId}/messages`,
    payload,
    token
  );

  return mapMessageToFrontend(message);
}

/**
 * Met à jour une conversation
 */
export async function updateConversation(
  conversationId: number,
  updates: {
    status?: InboxStatus;
    folderId?: number | null;
    assignedToId?: number | null;
    isUrgent?: boolean;
    clientId?: number | null;
  },
  token: string | null
): Promise<InboxItem> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] updateConversation", conversationId, updates);
    return {
      id: conversationId,
      client: "Client",
      subject: "Sujet",
      lastMessage: "Message",
      status: updates.status || "À répondre",
      date: new Date().toISOString(),
      source: "email",
      messages: [],
    };
  }

  const payload: any = {};
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.folderId !== undefined) payload.folder_id = updates.folderId;
  if (updates.assignedToId !== undefined) payload.assigned_to_id = updates.assignedToId;
  if (updates.isUrgent !== undefined) payload.is_urgent = updates.isUrgent;
  if (updates.clientId !== undefined) payload.client_id = updates.clientId;

  const conversation = await apiPatch<ConversationAPIResponse>(
    `/inbox/conversations/${conversationId}`,
    payload,
    token
  );

  return mapConversationToInboxItem(conversation);
}

/**
 * Supprime plusieurs conversations en une seule opération
 */
export async function deleteConversationsBulk(
  conversationIds: number[],
  token: string | null
): Promise<{ message: string; deleted_count: number }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] deleteConversationsBulk", conversationIds);
    return {
      message: `${conversationIds.length} conversation(s) supprimée(s) avec succès`,
      deleted_count: conversationIds.length
    };
  }

  // Utiliser un body JSON pour DELETE (FastAPI supporte les body pour DELETE)
  const response = await fetch(buildApiUrl("/inbox/conversations/bulk"), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      conversation_ids: conversationIds,
      delete_on_imap: false  // Par défaut, ne pas supprimer sur IMAP pour la suppression en masse
    }),
  });

  if (!response.ok) {
    let message = "Erreur serveur";
    try {
      const errorBody = await response.json();
      if (errorBody.detail) {
        message = Array.isArray(errorBody.detail)
          ? errorBody.detail[0].msg ?? message
          : errorBody.detail;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return await response.json();
}

/**
 * Supprime une conversation
 */
export async function deleteConversation(
  conversationId: number,
  token: string | null,
  deleteOnImap: boolean = true
): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] deleteConversation", conversationId);
    return;
  }

  // Passer le paramètre delete_on_imap dans l'URL
  const params = new URLSearchParams();
  params.append("delete_on_imap", deleteOnImap.toString());
  
  await apiDelete(`/inbox/conversations/${conversationId}?${params.toString()}`, token);
}

/**
 * Ajoute une note interne à une conversation
 */
export async function addInternalNote(
  conversationId: number,
  content: string,
  token: string | null
): Promise<InternalNote> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] addInternalNote", conversationId, content);
    return {
      id: Date.now(),
      content,
      author: "Utilisateur",
      createdAt: new Date().toISOString(),
    };
  }

  const note = await apiPost<InternalNoteAPIResponse>(
    `/inbox/conversations/${conversationId}/notes`,
    { content },
    token
  );

  return {
    id: note.id,
    content: note.content,
    author: note.author_name || "Auteur inconnu",
    createdAt: note.created_at,
  };
}

/**
 * Récupère tous les dossiers
 */
export async function getFolders(
  token: string | null
): Promise<InboxFolder[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] getFolders");
    return [];
  }

  const folders = await apiGet<FolderAPIResponse[]>("/inbox/folders", token);

  return folders.map((folder) => ({
    id: folder.id,
    name: folder.name,
    color: folder.color || undefined,
    type: folder.folder_type as any,
    isSystem: folder.is_system,
    aiRules: folder.ai_rules
      ? {
          autoClassify: folder.ai_rules.autoClassify || false,
          priority: folder.ai_rules.priority,
          filters: folder.ai_rules.filters
            ? {
                keywords: folder.ai_rules.filters.keywords,
                keywords_location: folder.ai_rules.filters.keywords_location,
                sender_email: folder.ai_rules.filters.sender_email,
                sender_domain: folder.ai_rules.filters.sender_domain,
                sender_phone: folder.ai_rules.filters.sender_phone,
                match_type: folder.ai_rules.filters.match_type,
              }
            : undefined,
          // Anciens champs pour compatibilité
          keywords: folder.ai_rules.keywords || [],
          context: folder.ai_rules.context,
        }
      : undefined,
    autoReply: folder.auto_reply
      ? {
          enabled: folder.auto_reply.enabled || false,
          template: folder.auto_reply.template,
          aiGenerate: folder.auto_reply.aiGenerate || false,
          mode: folder.auto_reply.mode as any,
          delay: folder.auto_reply.delay,
          useCompanyKnowledge: folder.auto_reply.useCompanyKnowledge || false,
        }
      : undefined,
    conversationIds: [], // Sera calculé côté frontend si nécessaire
    createdAt: folder.created_at,
  }));
}

/**
 * Crée un dossier
 */
export async function createFolder(
  folderData: {
    name: string;
    color?: string;
    type: string;
    aiRules?: any;
    autoReply?: any;
  },
  token: string | null
): Promise<InboxFolder> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] createFolder", folderData);
    return {
      id: Date.now(),
      name: folderData.name,
      color: folderData.color,
      type: folderData.type as any,
      isSystem: false,
      aiRules: folderData.aiRules,
      autoReply: folderData.autoReply,
      conversationIds: [],
      createdAt: new Date().toISOString(),
    };
  }

  const payload = {
    name: folderData.name,
    color: folderData.color,
    folder_type: folderData.type,
    is_system: false,
    ai_rules: folderData.aiRules,
    auto_reply: folderData.autoReply,
  };

  const folder = await apiPost<FolderAPIResponse>("/inbox/folders", payload, token);

  return {
    id: folder.id,
    name: folder.name,
    color: folder.color || undefined,
    type: folder.folder_type as any,
    isSystem: folder.is_system,
    aiRules: folder.ai_rules
      ? {
          autoClassify: folder.ai_rules.autoClassify || false,
          priority: folder.ai_rules.priority,
          filters: folder.ai_rules.filters
            ? {
                keywords: folder.ai_rules.filters.keywords,
                keywords_location: folder.ai_rules.filters.keywords_location,
                sender_email: folder.ai_rules.filters.sender_email,
                sender_domain: folder.ai_rules.filters.sender_domain,
                sender_phone: folder.ai_rules.filters.sender_phone,
                match_type: folder.ai_rules.filters.match_type,
              }
            : undefined,
          // Anciens champs pour compatibilité
          keywords: folder.ai_rules.keywords || [],
          context: folder.ai_rules.context,
        }
      : undefined,
    autoReply: folder.auto_reply
      ? {
          enabled: folder.auto_reply.enabled || false,
          template: folder.auto_reply.template,
          aiGenerate: folder.auto_reply.aiGenerate || false,
          mode: folder.auto_reply.mode as any,
          delay: folder.auto_reply.delay,
          useCompanyKnowledge: folder.auto_reply.useCompanyKnowledge || false,
        }
      : undefined,
    conversationIds: [],
    createdAt: folder.created_at,
  };
}

/**
 * Met à jour un dossier
 */
export async function updateFolder(
  folderId: number,
  updates: {
    name?: string;
    color?: string;
    type?: string;
    aiRules?: any;
    autoReply?: any;
  },
  token: string | null
): Promise<InboxFolder> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] updateFolder", folderId, updates);
    return {
      id: folderId,
      name: updates.name || "Dossier",
      color: updates.color,
      type: (updates.type as any) || "general",
      isSystem: false,
      aiRules: updates.aiRules,
      autoReply: updates.autoReply,
      conversationIds: [],
      createdAt: new Date().toISOString(),
    };
  }

  const payload: any = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.color !== undefined) payload.color = updates.color;
  if (updates.type !== undefined) payload.folder_type = updates.type;
  if (updates.aiRules !== undefined) payload.ai_rules = updates.aiRules;
  if (updates.autoReply !== undefined) payload.auto_reply = updates.autoReply;

  const folder = await apiPatch<FolderAPIResponse>(
    `/inbox/folders/${folderId}`,
    payload,
    token
  );

  return {
    id: folder.id,
    name: folder.name,
    color: folder.color || undefined,
    type: folder.folder_type as any,
    isSystem: folder.is_system,
    aiRules: folder.ai_rules
      ? {
          autoClassify: folder.ai_rules.autoClassify || false,
          priority: folder.ai_rules.priority,
          filters: folder.ai_rules.filters
            ? {
                keywords: folder.ai_rules.filters.keywords,
                keywords_location: folder.ai_rules.filters.keywords_location,
                sender_email: folder.ai_rules.filters.sender_email,
                sender_domain: folder.ai_rules.filters.sender_domain,
                sender_phone: folder.ai_rules.filters.sender_phone,
                match_type: folder.ai_rules.filters.match_type,
              }
            : undefined,
          // Anciens champs pour compatibilité
          keywords: folder.ai_rules.keywords || [],
          context: folder.ai_rules.context,
        }
      : undefined,
    autoReply: folder.auto_reply
      ? {
          enabled: folder.auto_reply.enabled || false,
          template: folder.auto_reply.template,
          aiGenerate: folder.auto_reply.aiGenerate || false,
          mode: folder.auto_reply.mode as any,
          delay: folder.auto_reply.delay,
          useCompanyKnowledge: folder.auto_reply.useCompanyKnowledge || false,
        }
      : undefined,
    conversationIds: [],
    createdAt: folder.created_at,
  };
}

/**
 * Supprime un dossier
 */
export async function deleteFolder(
  folderId: number,
  token: string | null
): Promise<void> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  const isMockMode = !apiUrl || apiUrl.trim() === "";

  if (isMockMode) {
    logger.log("[MOCK] deleteFolder", folderId);
    return;
  }

  await apiDelete(`/inbox/folders/${folderId}`, token);
}

// Fonctions IA pour l'inbox
export async function generateAIReply(
  conversationId: number,
  token: string
): Promise<string> {
  const response = await apiPost<{ reply: string }>(
    `/inbox/conversations/${conversationId}/generate-reply`,
    {},
    token
  );
  return response.reply;
}

export async function summarizeConversation(
  conversationId: number,
  token: string
): Promise<string> {
  const response = await apiPost<{ summary: string }>(
    `/inbox/conversations/${conversationId}/summarize`,
    {},
    token
  );
  return response.summary;
}

