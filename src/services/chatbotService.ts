import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export interface ChatbotMessage {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  tokens_used?: number;
  model_used?: string;
  context_snapshot?: any;
  created_at: string;
  updated_at?: string;
}

export interface ChatbotConversation {
  id: number;
  company_id: number;
  user_id: number;
  title?: string;
  status: "active" | "archived" | "deleted";
  created_at: string;
  updated_at: string;
  last_message_at?: string;
  messages?: ChatbotMessage[];
}

export interface SendMessageRequest {
  message: string;
  conversation_id?: number;
  model?: string;
  max_tokens?: number;
  temperature?: number;
}

export interface SendMessageResponse {
  conversation_id: number;
  message: ChatbotMessage;
  response: ChatbotMessage;
}

export async function getConversations(
  token: string | null,
  statusFilter: string = "active"
): Promise<ChatbotConversation[]> {
  return apiGet<ChatbotConversation[]>(
    `/chatbot/conversations?status_filter=${statusFilter}`,
    token
  );
}

export async function getConversation(
  conversationId: number,
  token: string | null
): Promise<ChatbotConversation> {
  return apiGet<ChatbotConversation>(
    `/chatbot/conversations/${conversationId}`,
    token
  );
}

export async function createConversation(
  title?: string,
  token?: string | null
): Promise<ChatbotConversation> {
  return apiPost<ChatbotConversation>(
    "/chatbot/conversations",
    { title },
    token
  );
}

export async function updateConversation(
  conversationId: number,
  data: { title?: string; status?: string },
  token?: string | null
): Promise<ChatbotConversation> {
  return apiPatch<ChatbotConversation>(
    `/chatbot/conversations/${conversationId}`,
    data,
    token
  );
}

export async function deleteConversation(
  conversationId: number,
  token?: string | null
): Promise<void> {
  return apiDelete<void>(
    `/chatbot/conversations/${conversationId}`,
    token
  );
}

export async function sendMessage(
  request: SendMessageRequest,
  token?: string | null
): Promise<SendMessageResponse> {
  return apiPost<SendMessageResponse>(
    "/chatbot/send-message",
    request,
    token
  );
}

