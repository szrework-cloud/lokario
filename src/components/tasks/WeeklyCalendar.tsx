"use client";

import { useState } from "react";
import { Task } from "@/services/tasksService";

interface WeeklyCalendarProps {
  tasks: Task[];
  employees: Array<{ id: number; name: string; email: string }>;
  onTaskClick: (task: Task) => void;
  onToggleComplete: (id: number) => void;
  onUpdate?: (id: number, updates: { priority?: string; assigned_to_id?: number; due_date?: string; description?: string }) => void;
  onDelete?: (id: number) => void;
  selectionMode?: boolean;
  selectedTaskId?: number | null;
  onTaskSelect?: (task: Task | null) => void;
}

export function WeeklyCalendar({
  tasks,
  employees,
  onTaskClick,
  onToggleComplete,
  onUpdate,
  onDelete,
  selectionMode = false,
  selectedTaskId = null,
  onTaskSelect,
}: WeeklyCalendarProps) {
  const showHours = true; // Toujours afficher les heures
  const [weekOffset, setWeekOffset] = useState(0); // 0 = semaine actuelle, -1 = semaine précédente, +1 = semaine suivante

  // Obtenir le lundi de la semaine en cours
  const getMondayOfWeek = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajuster pour que lundi = 1
    return new Date(d.setDate(diff));
  };

  const today = new Date();
  const currentWeekMonday = getMondayOfWeek(today);
  
  // Calculer le lundi de la semaine à afficher selon l'offset
  const monday = new Date(currentWeekMonday);
  monday.setDate(currentWeekMonday.getDate() + (weekOffset * 7));
  
  // Générer les 7 jours de la semaine (Lundi à Dimanche)
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    weekDays.push(day);
  }

  // Formater une date en YYYY-MM-DD (sans timezone pour éviter les décalages)
  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Vérifier si une date est aujourd'hui
  const isToday = (date: Date): boolean => {
    const todayStr = formatDateKey(today);
    const dateStr = formatDateKey(date);
    return todayStr === dateStr;
  };

  // Obtenir le nom du jour (Lun, Mar, etc.)
  const getDayName = (date: Date): string => {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return days[date.getDay()];
  };

  // Obtenir le numéro du jour
  const getDayNumber = (date: Date): number => {
    return date.getDate();
  };

  // Vérifier si une tâche appartient à un jour donné
  const taskBelongsToDay = (task: Task, dayDate: Date): boolean => {
    // Si dueDateRaw existe, l'utiliser (plus fiable)
    if (task.dueDateRaw) {
      try {
        const taskDate = new Date(task.dueDateRaw);
        const dayKey = formatDateKey(dayDate);
        const taskKey = formatDateKey(taskDate);
        return dayKey === taskKey;
      } catch {
        // Si le parsing échoue, essayer avec dueDate formaté
      }
    }

    // Sinon, utiliser dueDate formaté ("Aujourd'hui", "Demain", date ISO, etc.)
    if (task.dueDate) {
      const dayKey = formatDateKey(dayDate);
      const todayKey = formatDateKey(today);
      
      // Si la tâche est "Aujourd'hui" et le jour est aujourd'hui
      if (task.dueDate === "Aujourd'hui" && dayKey === todayKey) {
        return true;
      }
      
      // Si c'est une date au format français (DD/MM/YYYY), la parser
      // Exemple: "07/12/2025"
      if (task.dueDate.includes('/')) {
        try {
          const parts = task.dueDate.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Les mois sont 0-indexés en JS
            const year = parseInt(parts[2], 10);
            const taskDate = new Date(year, month, day);
            if (!isNaN(taskDate.getTime())) {
              const taskKey = formatDateKey(taskDate);
              return dayKey === taskKey;
            }
          }
        } catch {
          // Ignorer les erreurs de parsing
        }
      }
      
      // Si c'est une date ISO, essayer de la parser
      try {
        const taskDate = new Date(task.dueDate);
        if (!isNaN(taskDate.getTime())) {
          const taskKey = formatDateKey(taskDate);
          return dayKey === taskKey;
        }
      } catch {
        // Ignorer les erreurs de parsing
      }
    }

    return false;
  };

  // Trier les tâches par heure si showHours est activé
  const sortTasksByTime = (tasks: Task[]): Task[] => {
    if (!showHours) {
      return tasks; // Pas de tri si les heures ne sont pas affichées
    }

    return [...tasks];
  };

  // Grouper les tâches par jour
  const tasksByDay: Record<string, Task[]> = {};
  const tasksWithoutDate: Task[] = [];

  weekDays.forEach((day) => {
    const dayKey = formatDateKey(day);
    tasksByDay[dayKey] = [];
  });

  // Calculer les dates limites de la semaine affichée
  const weekStart = weekDays[0];
  const weekEnd = weekDays[6];
  const weekStartKey = formatDateKey(weekStart);
  const weekEndKey = formatDateKey(weekEnd);

  // Fonction helper pour obtenir la date réelle d'une tâche
  const getTaskDate = (task: Task): Date | null => {
    // Essayer d'abord avec dueDateRaw (le plus fiable)
    if (task.dueDateRaw) {
      try {
        const dateStr = task.dueDateRaw;
        let date: Date;
        
        // Parser en ignorant le timezone pour éviter les décalages
        if (dateStr.includes('T')) {
          // Format ISO avec time: extraire seulement la date
          const dateOnly = dateStr.split('T')[0];
          const [year, month, day] = dateOnly.split('-').map(Number);
          date = new Date(year, month - 1, day); // month est 0-indexé
        } else if (dateStr.includes('-')) {
          // Format ISO date seulement: YYYY-MM-DD
          const [year, month, day] = dateStr.split('-').map(Number);
          date = new Date(year, month - 1, day);
        } else {
          // Autre format, utiliser le parsing standard
          date = new Date(dateStr);
        }
        
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch {
        // Ignorer les erreurs
      }
    }
    
    // Sinon, essayer de parser dueDate formaté
    if (task.dueDate) {
      // Format français DD/MM/YYYY (ex: "08/12/2025")
      if (task.dueDate.includes('/') && task.dueDate.length >= 8) {
        try {
          const parts = task.dueDate.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Les mois sont 0-indexés en JS
            const year = parseInt(parts[2], 10);
            
            // Validation basique
            if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2000) {
              const date = new Date(year, month, day);
              if (!isNaN(date.getTime())) {
                // Vérifier que la date correspond bien (éviter les problèmes de timezone)
                if (date.getDate() === day && date.getMonth() === month && date.getFullYear() === year) {
                  return date;
                }
              }
            }
          }
        } catch {
          // Ignorer les erreurs
        }
      } else if (task.dueDate === "Aujourd'hui") {
        return new Date(today);
      } else if (task.dueDate === "Demain") {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return tomorrow;
      } else if (task.dueDate === "Hier") {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        return yesterday;
      } else {
        // Essayer de parser comme date ISO
        try {
          const parsed = new Date(task.dueDate);
          if (!isNaN(parsed.getTime())) {
            return parsed;
          }
        } catch {
          // Ignorer les erreurs
        }
      }
    }
    
    return null;
  };

  tasks.forEach((task) => {
    // Obtenir la date réelle de la tâche
    const taskDate = getTaskDate(task);
    
    // Si la tâche n'a pas de date, la mettre dans "Sans date"
    if (!taskDate) {
      tasksWithoutDate.push(task);
      return;
    }

    // Vérifier si la date de la tâche est dans la semaine affichée
    const taskDateKey = formatDateKey(taskDate);
    const weekStartKey = formatDateKey(weekStart);
    const weekEndKey = formatDateKey(weekEnd);
    
    // Vérifier si la date de la tâche est dans la plage de la semaine affichée
    if (taskDateKey >= weekStartKey && taskDateKey <= weekEndKey) {
      // La tâche appartient à cette semaine, trouver le jour correspondant
      weekDays.forEach((day) => {
        const dayKey = formatDateKey(day);
        if (taskDateKey === dayKey) {
          if (!tasksByDay[dayKey]) {
            tasksByDay[dayKey] = [];
          }
          tasksByDay[dayKey].push(task);
        }
      });
    }
    // Si la date n'est pas dans la semaine affichée, ne pas l'afficher (elle apparaîtra quand on naviguera vers sa semaine)
  });

  // Obtenir la couleur selon la priorité
  const getPriorityColor = (priority?: string): string => {
    if (!priority) return "bg-gray-100 text-gray-800 border-gray-200";
    const p = priority.toLowerCase();
    if (p === "critical") return "bg-red-100 text-red-800 border-red-200";
    if (p === "high") return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-blue-100 text-blue-800 border-blue-200";
  };

  // Rendre une tâche compacte
  const renderTask = (task: Task) => {
    const priorityColor = getPriorityColor(task.priority);
    const isCompleted = task.status === "Terminé" || task.status === "Terminée";
    const isSelected = selectionMode && selectedTaskId === task.id;

    return (
      <div
        key={task.id}
        onClick={(e) => {
          e.stopPropagation();
          if (selectionMode && onTaskSelect) {
            // En mode sélection, sélectionner/désélectionner la tâche
            if (isSelected) {
              onTaskSelect(null);
            } else {
              onTaskSelect(task);
            }
          } else {
            // Mode normal : ouvrir les détails
            onTaskClick(task);
          }
        }}
        className={`mb-1 p-2 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity border ${priorityColor} ${
          isCompleted ? "opacity-60 line-through" : ""
        } ${isSelected ? "ring-2 ring-[#F97316] ring-offset-1" : ""}`}
      >
        <div className="flex items-start justify-between gap-1">
          <div className="flex-1 min-w-0">
            <span className="truncate block">{task.title}</span>
          </div>
          {selectionMode && isSelected && (
            <div className="mt-0.5 text-[#F97316]">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          )}
          {!selectionMode && (
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={(e) => {
                e.stopPropagation();
                onToggleComplete(task.id);
              }}
              className="mt-0.5 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* En-tête avec toggle heures */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Semaine précédente"
          >
            <svg className="w-5 h-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-[#0F172A] min-w-[300px] text-center">
            Semaine du {getDayNumber(weekDays[0])} au {getDayNumber(weekDays[6])} {weekDays[0].toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </h2>
          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="Semaine suivante"
          >
            <svg className="w-5 h-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="text-sm text-[#64748B] hover:text-[#0F172A] px-2 py-1 rounded border border-gray-200 hover:bg-gray-50"
            >
              Aujourd'hui
            </button>
          )}
        </div>
      </div>

      {/* Calendrier hebdomadaire */}
      <div className="grid grid-cols-8 gap-2">
        {/* Colonnes des jours */}
        {weekDays.map((day, index) => {
          const dayKey = formatDateKey(day);
          const dayTasks = sortTasksByTime(tasksByDay[dayKey] || []);
          const isTodayDay = isToday(day);

          return (
            <div
              key={dayKey}
              className={`border rounded-lg p-2 min-h-[400px] ${
                isTodayDay
                  ? "border-orange-400 bg-orange-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              {/* En-tête du jour */}
              <div className="mb-2 pb-2 border-b border-gray-200">
                <div className="text-xs text-[#64748B] font-medium">
                  {getDayName(day)}
                </div>
                <div className={`text-lg font-bold ${isTodayDay ? "text-orange-600" : "text-[#0F172A]"}`}>
                  {getDayNumber(day)}
                </div>
                {dayTasks.length > 0 && (
                  <div className="text-xs text-[#64748B] mt-1">
                    {dayTasks.length} tâche{dayTasks.length > 1 ? "s" : ""}
                  </div>
                )}
              </div>

              {/* Liste des tâches */}
              <div className="space-y-1">
                {dayTasks.length === 0 ? (
                  <div className="text-xs text-[#64748B] text-center py-4">
                    Aucune tâche
                  </div>
                ) : (
                  dayTasks.map((task) => renderTask(task))
                )}
              </div>
            </div>
          );
        })}

        {/* Colonne "Sans date" */}
        <div className="border border-gray-200 rounded-lg p-2 min-h-[400px] bg-gray-50">
          <div className="mb-2 pb-2 border-b border-gray-200">
            <div className="text-xs text-[#64748B] font-medium">Sans date</div>
            {tasksWithoutDate.length > 0 && (
              <div className="text-xs text-[#64748B] mt-1">
                {tasksWithoutDate.length} tâche{tasksWithoutDate.length > 1 ? "s" : ""}
              </div>
            )}
          </div>
          <div className="space-y-1">
            {tasksWithoutDate.length === 0 ? (
              <div className="text-xs text-[#64748B] text-center py-4">
                Aucune tâche
              </div>
            ) : (
              sortTasksByTime(tasksWithoutDate).map((task) => renderTask(task))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
