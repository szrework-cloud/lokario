import { apiGet, apiPatch } from "@/lib/api";

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  link_url?: string | null;
  link_text?: string | null;
  source_type?: string | null;
  source_id?: number | null;
  read: boolean;
  created_at: string;
}

export interface UnreadCount {
  count: number;
}

export async function getNotifications(
  skip: number = 0,
  limit: number = 50,
  unreadOnly: boolean = false,
  token: string
): Promise<Notification[]> {
  const params = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
    unread_only: unreadOnly.toString(),
  });

  return apiGet<Notification[]>(`/notifications?${params}`, token);
}

export async function getUnreadCount(token: string): Promise<UnreadCount> {
  return apiGet<UnreadCount>("/notifications/unread-count", token);
}

export async function markNotificationAsRead(
  notificationId: number,
  token: string
): Promise<Notification> {
  return apiPatch<Notification>(
    `/notifications/${notificationId}/read`,
    {},
    token
  );
}

export async function markAllNotificationsAsRead(
  token: string
): Promise<{ updated: number }> {
  return apiPatch<{ updated: number }>("/notifications/mark-all-read", {}, token);
}

