"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Notification, getNotifications, getUnreadCount, markNotificationAsRead, markAllNotificationsAsRead } from "@/services/notificationsService";
import { useAuth } from "@/hooks/useAuth";

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { token } = useAuth();
  const router = useRouter();

  // Charger les notifications
  const loadNotifications = async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const [notifs, count] = await Promise.all([
        getNotifications(0, 50, false, token),
        getUnreadCount(token),
      ]);
      setNotifications(notifs);
      setUnreadCount(count.count);
    } catch (error) {
      console.error("Erreur lors du chargement des notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les notifications au montage et quand le dropdown s'ouvre
  useEffect(() => {
    loadNotifications();
    
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, token]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (notificationId: number) => {
    if (!token) return;

    try {
      await markNotificationAsRead(notificationId, token);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Erreur lors du marquage comme lu:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;

    try {
      await markAllNotificationsAsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Erreur lors du marquage de toutes comme lues:", error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Marquer comme lu
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }

    // Naviguer vers le lien si disponible
    if (notification.link_url) {
      router.push(notification.link_url);
      setIsOpen(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "followup_completed":
        return "✅";
      case "quote_signed":
        return "✍️";
      case "invoice_paid":
        return "💰";
      case "followup_failed":
        return "❌";
      case "quote_rejected":
        return "🚫";
      case "invoice_overdue":
        return "⚠️";
      case "task_overdue":
        return "🔴";
      case "task_critical":
        return "🔥";
      case "appointment_reminder":
        return "⏰";
      case "appointment_cancelled":
        return "🚫";
      case "appointment_modified":
        return "📝";
      case "appointment_created":
        return "📅";
      default:
        return "🔔";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "followup_failed":
      case "invoice_overdue":
      case "task_overdue":
      case "appointment_cancelled":
        return "bg-red-50 border-red-200";
      case "quote_rejected":
      case "task_critical":
        return "bg-orange-50 border-orange-200";
      case "appointment_reminder":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "à l'instant";
      if (diffMins < 60) return `il y a ${diffMins} min`;
      if (diffHours < 24) return `il y a ${diffHours}h`;
      if (diffDays < 7) return `il y a ${diffDays}j`;
      return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    } catch {
      return "récemment";
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#64748B] hover:text-[#0F172A] transition-colors"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-[#E5E7EB] z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#0F172A]">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-[#F97316] hover:text-[#EA580C]"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-[#64748B]">
                Chargement...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#64748B]">
                Aucune notification
              </div>
            ) : (
              <div className="divide-y divide-[#E5E7EB]">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-[#F9FAFB] cursor-pointer transition-colors ${
                      !notification.read ? "bg-blue-50" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{getNotificationIcon(notification.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0F172A]">
                          {notification.title}
                        </p>
                        <p className="text-xs text-[#64748B] mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-[#64748B] mt-1">
                          {formatTime(notification.created_at)}
                        </p>
                        {notification.link_text && (
                          <p className="text-xs text-[#F97316] mt-1 font-medium">
                            {notification.link_text} →
                          </p>
                        )}
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-[#F97316] rounded-full mt-2" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

