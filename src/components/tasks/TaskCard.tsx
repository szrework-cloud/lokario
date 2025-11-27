"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

interface TaskCardProps {
  id: number;
  title: string;
  description?: string;
  assignedTo: string;
  assignedToAvatar?: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical" | "urgent";
  dueDate: string;
  dueTime?: string;
  status: "À faire" | "En cours" | "Terminé" | "En retard";
  isLate?: boolean;
  onToggleComplete?: (id: number) => void;
  onViewDetails?: (id: number) => void;
  onAddComment?: (id: number) => void;
}

export function TaskCard({
  id,
  title,
  description,
  assignedTo,
  assignedToAvatar,
  category,
  priority,
  dueDate,
  dueTime,
  status,
  isLate = false,
  onToggleComplete,
  onViewDetails,
  onAddComment,
}: TaskCardProps) {
  const { user } = useAuth();
  const [isCompleted, setIsCompleted] = useState(status === "Terminé");

  const priorityColors: Record<TaskCardProps["priority"], string> = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
    urgent: "bg-red-100 text-red-800",
  };

  const priorityLabels: Record<TaskCardProps["priority"], string> = {
    low: "Faible",
    medium: "Moyenne",
    high: "Haute",
    critical: "Critique",
    urgent: "Urgent",
  };

  const handleToggle = () => {
    setIsCompleted(!isCompleted);
    onToggleComplete?.(id);
  };

  return (
    <div
      className={`p-4 rounded-lg border ${
        isLate
          ? "border-red-300 bg-red-50"
          : "border-[#E5E7EB] bg-white hover:bg-[#F9FAFB]"
      } transition-colors`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isCompleted}
          onChange={handleToggle}
          className="mt-1 rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3
                className={`text-sm font-medium ${
                  isCompleted ? "text-[#64748B] line-through" : "text-[#0F172A]"
                }`}
              >
                {title}
              </h3>
              {description && (
                <p className="text-xs text-[#64748B] mt-1 line-clamp-2">
                  {description}
                </p>
              )}
            </div>
            {isLate && (
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200 whitespace-nowrap">
                En retard
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span
              className={`px-2 py-1 rounded-full text-xs font-semibold ${priorityColors[priority]}`}
            >
              {priorityLabels[priority]}
            </span>
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
              {category}
            </span>
            <div className="flex items-center gap-1 text-xs text-[#64748B]">
              {assignedToAvatar ? (
                <div className="w-5 h-5 rounded-full bg-[#F97316] text-white text-xs flex items-center justify-center font-medium">
                  {assignedToAvatar}
                </div>
              ) : (
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              )}
              <span>{assignedTo}</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-[#64748B]">
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
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>
                {dueTime ? `${dueTime} • ` : ""}
                {dueDate}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => onAddComment?.(id)}
              className="text-xs text-[#64748B] hover:text-[#0F172A] flex items-center gap-1"
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
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              Commentaire
            </button>
            <button
              onClick={() => onViewDetails?.(id)}
              className="text-xs text-[#F97316] hover:text-[#EA580C]"
            >
              Détails
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

