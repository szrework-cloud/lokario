"use client";

import { InboxStatus } from "./types";

interface InboxSidebarProps {
  activeFilter: InboxStatus | "all";
  onFilterChange: (filter: InboxStatus | "all") => void;
  counts: {
    all: number;
    "À répondre": number;
    "En attente": number;
    "Répondu": number;
    "Résolu": number;
    "Urgent": number;
    "Archivé": number;
    "Spam": number;
  };
}

export function InboxSidebar({ activeFilter, onFilterChange, counts }: InboxSidebarProps) {
  const filters: Array<{ id: InboxStatus | "all"; label: string }> = [
    { id: "all", label: "Inbox" },
    { id: "À répondre", label: "À répondre" },
    { id: "En attente", label: "En attente" },
    { id: "Répondu", label: "Répondu" },
    { id: "Résolu", label: "Résolu" },
    { id: "Urgent", label: "Urgent" },
    { id: "Archivé", label: "Archivés" },
    { id: "Spam", label: "Spam / Non pertinent" },
  ];

  return (
    <div className="w-48 border-r border-[#E5E7EB] bg-white h-full overflow-y-auto">
      <div className="p-2 space-y-0.5">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.id;
          const count = counts[filter.id] || 0;
          
          return (
            <button
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              className={`w-full text-left px-2 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                isActive
                  ? "bg-[#F97316] text-white"
                  : "text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#0F172A]"
              }`}
            >
              <span className="truncate">{filter.label}</span>
              {count > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ml-2 flex-shrink-0 ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[#E5E7EB] text-[#64748B]"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

