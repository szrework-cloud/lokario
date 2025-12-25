"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { NotificationsDropdown } from "@/components/notifications/NotificationsDropdown";
import { SubscriptionStatusBadge } from "@/components/subscription/SubscriptionStatusBadge";
import { MobileMenu } from "@/components/layout/MobileMenu";

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-[#E5E7EB] bg-white">
        <div className="flex h-16 items-center justify-between px-4 md:px-8">
          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden p-2 text-[#64748B] hover:text-[#0F172A] hover:bg-[#F9FAFB] rounded-lg transition-colors"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Title - hidden on mobile if button is visible, shown on desktop */}
          <div 
            className="hidden lg:block"
            data-tutorial={title === "Dashboard" ? "dashboard-overview" : undefined}
          >
            <p className="text-sm text-[#64748B]">{subtitle}</p>
            <h2 className="text-2xl font-semibold text-[#0F172A]">{title}</h2>
          </div>

          {/* Mobile title - shown when menu button is visible */}
          <div 
            className="lg:hidden flex-1 ml-3"
            data-tutorial={title === "Dashboard" ? "dashboard-overview" : undefined}
          >
            <h2 className="text-lg font-semibold text-[#0F172A] truncate">{title}</h2>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <SubscriptionStatusBadge />
            <NotificationsDropdown />
            {rightContent && <div className="hidden sm:block">{rightContent}</div>}
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </>
  );
}

