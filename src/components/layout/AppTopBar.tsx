"use client";

import { NotificationsDropdown } from "@/components/notifications/NotificationsDropdown";
import { SubscriptionStatusBadge } from "@/components/subscription/SubscriptionStatusBadge";

interface AppTopBarProps {
  subtitle?: string;
  title?: string;
  rightContent?: React.ReactNode;
}

export function AppTopBar({
  subtitle = "Assistant administratif",
  title = "Vue générale",
  rightContent,
}: AppTopBarProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-[#E5E7EB] bg-white">
      <div className="flex h-16 items-center justify-between px-8">
        <div data-tutorial={title === "Dashboard" ? "dashboard-overview" : undefined}>
          <p className="text-sm text-[#64748B]">{subtitle}</p>
          <h2 className="text-2xl font-semibold text-[#0F172A]">{title}</h2>
        </div>
        <div className="flex items-center gap-4">
          <SubscriptionStatusBadge />
          <NotificationsDropdown />
          {rightContent && <div>{rightContent}</div>}
        </div>
      </div>
    </header>
  );
}

