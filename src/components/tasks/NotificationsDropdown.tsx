"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";

interface Notification {
  id: number;
  type: "task_late" | "checklist_incomplete" | "task_critical" | "task_completed" | "task_assigned";
  title: string;
  message: string;
  time: string;
  read: boolean;
  link?: string;
}

interface NotificationsDropdownProps {
  notifications: Notification[];
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: () => void;
}

export function NotificationsDropdown({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

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

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "task_late":
        return "⚠️";
      case "checklist_incomplete":
        return "📋";
      case "task_critical":
        return "🔥";
      case "task_completed":
        return "✅";
      case "task_assigned":
        return "📌";
      default:
        return "🔔";
    }
  };

  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "task_late":
      case "task_critical":
        return "bg-red-50 border-red-200";
      case "checklist_incomplete":
        return "bg-orange-50 border-orange-200";
      default:
        return "bg-blue-50 border-blue-200";
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
                onClick={onMarkAllAsRead}
                className="text-xs text-[#F97316] hover:text-[#EA580C]"
              >
                Tout marquer comme lu
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
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
                    onClick={() => {
                      if (!notification.read) {
                        onMarkAsRead(notification.id);
                      }
                      setIsOpen(false);
                    }}
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
                          {notification.time}
                        </p>
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

