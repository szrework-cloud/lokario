"use client";

import { useState, useRef, useEffect } from "react";
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const statusChips = [
    { id: "all", label: "Tous" },
    { id: "À répondre", label: "À répondre" },
    { id: "En attente", label: "En attente" },
    { id: "Répondu", label: "Répondu" },
    { id: "Urgent", label: "Urgent" },
  ];

  const sourceChips = [
    { id: "all", label: "Message", icon: "📥" },
    { id: "email", label: "Email", icon: "✉️" },
  ];

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };

    if (isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isFilterOpen]);

  // Compter les filtres actifs
  const activeFiltersCount = [
    statusFilter !== "all",
    sourceFilter !== "all",
    employeeFilter !== "all",
  ].filter(Boolean).length;

  return (
    <div className="bg-white border-b border-[#E5E7EB] p-4">
      <div className="flex items-center gap-3">
        {/* Barre de recherche */}
        <div className="relative flex-1">
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

        {/* Bouton Filtre */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              isFilterOpen || activeFiltersCount > 0
                ? "bg-[#F97316] text-white border-[#F97316]"
                : "bg-white text-[#64748B] border-[#E5E7EB] hover:bg-[#F9FAFB] hover:text-[#0F172A]"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span>Filtre</span>
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
                {activeFiltersCount}
              </span>
            )}
            <svg
              className={`w-4 h-4 transition-transform ${isFilterOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Menu déroulant */}
          {isFilterOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-[#E5E7EB] rounded-lg shadow-lg z-50">
              <div className="p-4 space-y-4">
                {/* Section Statut */}
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-2">
                    Statut
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {statusChips.map((chip) => (
                      <button
                        key={chip.id}
                        onClick={() => {
                          onStatusFilterChange(chip.id);
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          statusFilter === chip.id
                            ? "bg-[#F97316] text-white"
                            : "bg-[#F9FAFB] text-[#64748B] hover:bg-[#E5E7EB] hover:text-[#0F172A]"
                        }`}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section Source */}
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-2">
                    Source
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {sourceChips.map((chip) => (
                      <button
                        key={chip.id}
                        onClick={() => {
                          onSourceFilterChange(chip.id as MessageSource | "all");
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                          sourceFilter === chip.id
                            ? "bg-[#F97316] text-white"
                            : "bg-[#F9FAFB] text-[#64748B] hover:bg-[#E5E7EB] hover:text-[#0F172A]"
                        }`}
                      >
                        <span>{chip.icon}</span>
                        <span>{chip.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section Employé */}
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-2">
                    Employé
                  </label>
                  <select
                    value={employeeFilter}
                    onChange={(e) => onEmployeeFilterChange(e.target.value)}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                  >
                    <option value="all">Tous</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.name}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bouton Réinitialiser */}
                {activeFiltersCount > 0 && (
                  <div className="pt-2 border-t border-[#E5E7EB]">
                    <button
                      onClick={() => {
                        onStatusFilterChange("all");
                        onSourceFilterChange("all");
                        onEmployeeFilterChange("all");
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium text-[#64748B] hover:bg-[#F9FAFB] hover:text-[#0F172A]"
                    >
                      Réinitialiser les filtres
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

