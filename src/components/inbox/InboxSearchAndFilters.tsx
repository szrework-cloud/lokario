"use client";

import { MessageSource } from "./types";

interface InboxSearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  sourceFilter: MessageSource | "all";
  onSourceFilterChange: (source: MessageSource | "all") => void;
  employeeFilter: string;
  onEmployeeFilterChange: (employee: string) => void;
  employees: Array<{ id: number; name: string }>;
}

export function InboxSearchAndFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sourceFilter,
  onSourceFilterChange,
  employeeFilter,
  onEmployeeFilterChange,
  employees,
}: InboxSearchAndFiltersProps) {
  const statusChips = [
    { id: "all", label: "Tous" },
    { id: "À répondre", label: "À répondre" },
    { id: "En attente", label: "En attente" },
    { id: "Répondu", label: "Répondu" },
    { id: "Urgent", label: "Urgent" },
  ];

  const sourceChips = [
    { id: "all", label: "Toutes", icon: "📥" },
    { id: "email", label: "Email", icon: "✉️" },
    { id: "whatsapp", label: "WhatsApp", icon: "📱" },
    { id: "messenger", label: "Messenger", icon: "💬" },
    { id: "formulaire", label: "Formulaire", icon: "📝" },
  ];

  return (
    <div className="bg-white border-b border-[#E5E7EB] p-4 space-y-3">
      {/* Barre de recherche */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Rechercher un client, un mot-clé, une facture, un téléphone..."
          className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2 pl-10 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
        />
        <svg
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#64748B]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Filtres rapides */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Chips statut */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748B] font-medium">Statut:</span>
          {statusChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => onStatusFilterChange(chip.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                statusFilter === chip.id
                  ? "bg-[#F97316] text-white"
                  : "bg-[#F9FAFB] text-[#64748B] hover:bg-[#E5E7EB]"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Chips source */}
        <div className="flex items-center gap-2 ml-4">
          <span className="text-xs text-[#64748B] font-medium">Source:</span>
          {sourceChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => onSourceFilterChange(chip.id as MessageSource | "all")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                sourceFilter === chip.id
                  ? "bg-[#F97316] text-white"
                  : "bg-[#F9FAFB] text-[#64748B] hover:bg-[#E5E7EB]"
              }`}
            >
              <span>{chip.icon}</span>
              <span>{chip.label}</span>
            </button>
          ))}
        </div>

        {/* Filtre employé */}
        <div className="flex items-center gap-2 ml-4">
          <span className="text-xs text-[#64748B] font-medium">Employé:</span>
          <select
            value={employeeFilter}
            onChange={(e) => onEmployeeFilterChange(e.target.value)}
            className="rounded-lg border border-[#E5E7EB] px-2 py-1 text-xs focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
          >
            <option value="all">Tous</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.name}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

