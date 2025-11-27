export type InboxStatus = "À répondre" | "En attente" | "Répondu" | "Résolu" | "Urgent" | "Archivé" | "Spam";
export type MessageSource = "email" | "whatsapp" | "messenger" | "formulaire";
export type ClientStatus = "nouveau" | "récurrent" | "VIP";

export interface Attachment {
  id: number;
  name: string;
  type: "image" | "pdf" | "document" | "other";
  url: string;
  size: number; // en bytes
  uploadedAt: string;
}

export interface Message {
  id: number;
  from: string;
  fromEmail?: string;
  content: string;
  date: string;
  isFromClient: boolean;
  source: MessageSource;
  attachments?: Attachment[];
  read: boolean;
}

export interface InternalNote {
  id: number;
  content: string;
  author: string;
  createdAt: string;
}

export interface ClientInfo {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  status: ClientStatus;
  totalPurchases?: number;
  lastPurchaseDate?: string;
  invoicesCount?: number;
  quotesCount?: number;
  projectsCount?: number;
  conversationsCount?: number;
}

export interface InboxItem {
  id: number;
  client: string;
  clientId?: number;
  clientInfo?: ClientInfo;
  subject: string;
  lastMessage: string;
  status: InboxStatus;
  date: string;
  source: MessageSource;
  messages: Message[];
  internalNotes?: InternalNote[];
  assignedTo?: string;
  assignedToId?: number;
  isUrgent?: boolean;
  unreadCount?: number;
}

