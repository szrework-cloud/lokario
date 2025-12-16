"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ModuleLink } from "@/components/ui/ModuleLink";
import { useModuleAccess } from "@/hooks/useModuleAccess";

interface ClientInfo {
  id: number;
  name: string;
  type?: "Client" | "Fournisseur";
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  sector?: string;
}

interface TaskCardProps {
  id: number;
  title: string;
  description?: string;
  assignedTo: string;
  assignedToId?: number;
  assignedToAvatar?: string;
  category: string;
  priority: "normal" | "high" | "critical";  // MVP V1: 3 priorités uniquement
  dueDate: string;
  dueDateRaw?: string; // Date ISO brute pour éviter les problèmes de parsing
  dueTime?: string;
  status: "À faire" | "En cours" | "Terminé" | "En retard";
  isLate?: boolean;
  comment?: string;
  employees?: Array<{ id: number; name: string; email: string }>;
  clientId?: number;
  clientInfo?: ClientInfo;
  projectId?: number;
  projectName?: string;
  onToggleComplete?: (id: number) => void;
  onUpdate?: (id: number, updates: { priority?: string; assigned_to_id?: number; due_date?: string; description?: string }) => void;
  onDelete?: (id: number) => void;
}

export function TaskCard({
  id,
  title,
  description,
  assignedTo,
  assignedToId,
  assignedToAvatar,
  category,
  priority,
  dueDate,
  dueDateRaw,
  dueTime,
  status,
  isLate = false,
  comment,
  employees = [],
  clientId,
  clientInfo,
  projectId,
  projectName,
  onToggleComplete,
  onUpdate,
  onDelete,
}: TaskCardProps) {
  const { user } = useAuth();
  const { isModuleEnabled } = useModuleAccess();
  const [isEditing, setIsEditing] = useState(false);
  const [editedPriority, setEditedPriority] = useState<"normal" | "high" | "critical">(priority);
  const [editedAssignedToId, setEditedAssignedToId] = useState<number | undefined>(assignedToId);
  
  // Fonction pour convertir la date formatée (français ou texte) en ISO
  const parseDateToISO = (dateStr: string): string => {
    if (dateStr === "Aujourd'hui") {
      return new Date().toISOString().split('T')[0];
    }
    if (dateStr === "Demain") {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    // Parser le format français DD/MM/YYYY ou DD/MM/YY
    if (dateStr.includes('/')) {
      try {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1; // Les mois sont 0-indexés
          let year = parseInt(parts[2], 10);
          // Si l'année est sur 2 chiffres, convertir en 4 chiffres (assumer 2000-2099)
          if (year < 100) {
            year = 2000 + year;
          }
          const date = new Date(year, month, day);
          // Vérifier que la date est valide
          if (!isNaN(date.getTime()) && date.getDate() === day && date.getMonth() === month) {
            return date.toISOString().split('T')[0];
          }
        }
      } catch {}
    }
    // Essayer de parser comme date ISO ou autre format
    try {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    } catch {}
    return dateStr;
  };
  
  // Utiliser dueDateRaw si disponible (plus fiable), sinon parser dueDate
  const originalDueDateISO = dueDateRaw || parseDateToISO(dueDate);
  // Extraire uniquement la partie date (yyyy-MM-dd) pour l'input date
  const getDateOnly = (dateStr: string): string => {
    if (!dateStr) return "";
    // Si c'est déjà au format yyyy-MM-dd, le retourner tel quel
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    // Sinon, extraire la partie date d'une valeur ISO (avant le "T")
    const datePart = dateStr.split('T')[0];
    return datePart || dateStr;
  };
  const [editedDueDate, setEditedDueDate] = useState<string>(getDateOnly(originalDueDateISO));
  const [editedComment, setEditedComment] = useState<string>(comment || description || "");

  const isCompleted = status === "Terminé" || status === "Terminée";

  const priorityColors: Record<TaskCardProps["priority"], string> = {
    normal: "bg-blue-100 text-blue-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
  };

  const priorityLabels: Record<TaskCardProps["priority"], string> = {
    normal: "Normale",
    high: "Haute",
    critical: "Critique",
  };

  const handleToggle = () => {
    onToggleComplete?.(id);
  };

  const handleSave = () => {
    if (onUpdate) {
      const updates: any = {};
      if (editedPriority !== priority) {
        updates.priority = editedPriority;
      }
      if (editedAssignedToId !== assignedToId) {
        updates.assigned_to_id = editedAssignedToId;
      }
      // Comparer les dates en ISO pour éviter d'envoyer la date si elle n'a pas changé
      // Comparer les dates normalisées (format yyyy-MM-dd uniquement)
      const normalizedEditedDate = getDateOnly(editedDueDate);
      const normalizedOriginalDate = getDateOnly(originalDueDateISO);
      if (normalizedEditedDate !== normalizedOriginalDate) {
        updates.due_date = normalizedEditedDate;
      }
      if (editedComment !== (comment || description)) {
        updates.description = editedComment;
      }
      if (Object.keys(updates).length > 0) {
        onUpdate(id, updates);
      }
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedPriority(priority);
    setEditedAssignedToId(assignedToId);
    setEditedDueDate(getDateOnly(originalDueDateISO));
    setEditedComment(comment || description || "");
    setIsEditing(false);
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
              {/* Commentaire/Description affiché */}
              {(comment || description) && !isEditing && (
                <p className="text-xs text-[#64748B] mt-1 line-clamp-2">
                  {comment || description}
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
            {/* Priorité - éditable */}
            {isEditing ? (
              <select
                value={editedPriority}
                onChange={(e) => setEditedPriority(e.target.value as "normal" | "high" | "critical")}
                className={`px-2 py-1 rounded-full text-xs font-semibold border ${priorityColors[editedPriority]}`}
              >
                <option value="normal">Normale</option>
                <option value="high">Haute</option>
                <option value="critical">Critique</option>
              </select>
            ) : (
              <span
                className={`px-2 py-1 rounded-full text-xs font-semibold ${priorityColors[priority]}`}
              >
                {priorityLabels[priority]}
              </span>
            )}

            {/* Personne assignée - éditable */}
            {isEditing ? (
              <select
                value={editedAssignedToId || ""}
                onChange={(e) => setEditedAssignedToId(e.target.value ? parseInt(e.target.value) : undefined)}
                className="text-xs rounded border border-[#E5E7EB] px-2 py-1 focus:border-[#F97316] focus:outline-none"
              >
                <option value="">Non assigné</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name || emp.email}
                  </option>
                ))}
              </select>
            ) : (
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
            )}

            {/* Date - éditable */}
            {isEditing ? (
              <input
                type="date"
                value={getDateOnly(editedDueDate)}
                onChange={(e) => setEditedDueDate(e.target.value)}
                className="text-xs rounded border border-[#E5E7EB] px-2 py-1 focus:border-[#F97316] focus:outline-none"
              />
            ) : (
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
            )}
          </div>

          {/* Commentaire éditable */}
          {isEditing && (
            <textarea
              value={editedComment}
              onChange={(e) => setEditedComment(e.target.value)}
              placeholder="Ajouter un commentaire..."
              className="mt-2 w-full text-xs rounded border border-[#E5E7EB] px-2 py-1 focus:border-[#F97316] focus:outline-none resize-none"
              rows={2}
            />
          )}

          {/* Informations du client si la tâche est liée à un client */}
          {clientId && clientInfo && (
            <div className="mt-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-slate-700">
                  Informations du client
                </h4>
                {isModuleEnabled("clients") && (
                  <ModuleLink
                    href={`/app/clients/${clientId}`}
                    className="text-xs text-[#F97316] hover:text-[#EA580C] font-medium"
                    showTooltip
                  >
                    Voir le client →
                  </ModuleLink>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-500 mb-0.5">Nom</p>
                  <p className="font-medium text-slate-900">{clientInfo.name}</p>
                </div>
                {clientInfo.type && (
                  <div>
                    <p className="text-slate-500 mb-0.5">Type</p>
                    <p className="font-medium text-slate-900">{clientInfo.type}</p>
                  </div>
                )}
                {clientInfo.contactEmail && (
                  <div>
                    <p className="text-slate-500 mb-0.5">Email</p>
                    <p className="font-medium text-slate-900">{clientInfo.contactEmail}</p>
                  </div>
                )}
                {clientInfo.contactPhone && (
                  <div>
                    <p className="text-slate-500 mb-0.5">Téléphone</p>
                    <p className="font-medium text-slate-900">{clientInfo.contactPhone}</p>
                  </div>
                )}
                {clientInfo.sector && (
                  <div>
                    <p className="text-slate-500 mb-0.5">Secteur</p>
                    <p className="font-medium text-slate-900">{clientInfo.sector}</p>
                  </div>
                )}
                {clientInfo.address && (
                  <div className="md:col-span-2">
                    <p className="text-slate-500 mb-0.5">Adresse</p>
                    <p className="font-medium text-slate-900">{clientInfo.address}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lien vers le projet si la tâche est liée à un projet */}
          {projectId && projectName && (
            <div className="mt-3 p-2 rounded-lg border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Projet lié</p>
                  {isModuleEnabled("projects") ? (
                    <ModuleLink
                      href={`/app/projects?projectId=${projectId}`}
                      className="text-xs font-medium text-[#F97316] hover:text-[#EA580C]"
                      showTooltip
                    >
                      {projectName} →
                    </ModuleLink>
                  ) : (
                    <p className="text-xs font-medium text-slate-700">{projectName}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="text-xs text-green-600 hover:text-green-700 transition-colors"
                >
                  Enregistrer
                </button>
                <button
                  onClick={handleCancel}
                  className="text-xs text-[#64748B] hover:text-[#0F172A] transition-colors"
                >
                  Annuler
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Modifier
                </button>
                {onDelete && (
                  <button
                    onClick={() => onDelete(id)}
                    className="text-xs text-red-600 hover:text-red-700 transition-colors flex items-center gap-1"
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    Supprimer
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
