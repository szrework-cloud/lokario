"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Task, ChecklistTemplate } from "@/services/tasksService";
import { Button } from "@/components/ui/Button";

interface RecurringTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  templates: ChecklistTemplate[];
  onDeleteAllOccurrences: (taskId: number) => Promise<void>;
  onDeleteTask: (taskId: number) => Promise<void>;
}

export function RecurringTasksModal({
  isOpen,
  onClose,
  tasks,
  templates,
  onDeleteAllOccurrences,
  onDeleteTask,
}: RecurringTasksModalProps) {
  const [expandedTemplate, setExpandedTemplate] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const weekDays = [
    { value: 0, label: "Dimanche" },
    { value: 1, label: "Lundi" },
    { value: 2, label: "Mardi" },
    { value: 3, label: "Mercredi" },
    { value: 4, label: "Jeudi" },
    { value: 5, label: "Vendredi" },
    { value: 6, label: "Samedi" },
  ];

  // Filtrer les templates actifs (comme avant) + ceux qui ont des tâches même s'ils sont inactifs
  const activeTemplates = templates.filter((template) => {
    // Afficher tous les templates actifs (même sans tâches)
    if (template.isActive !== false) {
      return true;
    }
    
    // Afficher aussi les templates inactifs qui ont des tâches
    const hasTasks = tasks.some((task) => {
      // Méthode 1: Vérifier par checklistTemplateId
      if (task.checklistTemplateId === template.id) {
        return true;
      }
      
      // Méthode 2: Vérifier par titre si checklistTemplateId est null (template supprimé)
      if ((task.isChecklistItem || task.origin === "checklist") && template.items && template.items.length > 0) {
        const templateItemTitles = template.items.map(item => item.trim().toLowerCase());
        const taskTitleLower = task.title.trim().toLowerCase();
        if (templateItemTitles.includes(taskTitleLower)) {
          return true;
        }
        
        // Vérifier aussi la description
        if (task.description?.toLowerCase().includes(template.name.toLowerCase())) {
          return true;
        }
      }
      
      return false;
    });
    
    return hasTasks;
  });

  // Trouver les tâches récurrentes créées manuellement (avec recurrence !== "none")
  const manualRecurringTasks = tasks.filter((task) => {
    // Tâches récurrentes créées manuellement (pas de checklist)
    // Vérifier si recurrence existe et n'est pas "none" ou undefined
    const hasRecurrence = task.recurrence && task.recurrence !== "none" && task.recurrence !== undefined && task.recurrence !== null;
    if (hasRecurrence && (task.origin === "manual" || (!task.isChecklistItem && !task.checklistTemplateId))) {
      return true;
    }
    return false;
  });
  
  // Trouver les tâches orphelines de checklist (sans template, checklistTemplateId undefined)
  const orphanChecklistTasks = tasks.filter((task) => {
    // Tâches de checklist sans template associé
    if (!(task.isChecklistItem || task.origin === "checklist")) {
      return false;
    }
    
    // Si checklistTemplateId est undefined/null, c'est une tâche orpheline
    if (!task.checklistTemplateId) {
      return true;
    }
    
    // Vérifier si le template existe encore
    const templateExists = templates.some(t => t.id === task.checklistTemplateId);
    return !templateExists;
  });
  
  // Combiner les deux types de tâches orphelines
  const orphanTasks = [...manualRecurringTasks, ...orphanChecklistTasks];
  
  // Grouper les tâches orphelines par titre
  const orphanTasksGrouped = (() => {
    const grouped = new Map<string, Task[]>();
    orphanTasks.forEach((task) => {
      const key = task.title;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(task);
    });
    return Array.from(grouped.entries()).map(([title, taskList]) => ({
      title,
      tasks: taskList,
      firstTask: taskList[0],
      totalCount: taskList.length,
    }));
  })();

  const handleDelete = async () => {
    if (!selectedTask) return;

    setIsDeleting(true);
    try {
      await onDeleteAllOccurrences(selectedTask.id);
      setShowDeleteConfirm(false);
      setSelectedTask(null);
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Grouper les tâches par template et par titre
  const getTasksByTemplate = (templateId: number) => {
    // Filtrer les tâches de ce template
    // Si checklistTemplateId n'est pas disponible, utiliser isChecklistItem + matching par titre avec les items du template
    const template = templates.find(t => t.id === templateId);
    
    if (!template) return [];
    
    // Méthode 1: Filtrer par checklistTemplateId si disponible
    let templateTasks = tasks.filter((task) => {
      const hasCorrectTemplateId = task.checklistTemplateId === templateId;
      const isFromChecklist = task.isChecklistItem || task.origin === "checklist";
      return hasCorrectTemplateId && isFromChecklist;
    });
    
    // Méthode 2: Si aucune tâche trouvée, essayer de matcher par titre avec les items du template
    // Cette méthode est nécessaire car les tâches peuvent ne pas avoir checklistTemplateId si le template a été supprimé
    if (templateTasks.length === 0 && template.items && template.items.length > 0) {
      const templateItemTitles = template.items.map(item => item.trim().toLowerCase());
      templateTasks = tasks.filter((task) => {
        // Vérifier si c'est une tâche de checklist
        const isFromChecklist = task.isChecklistItem || task.origin === "checklist";
        if (!isFromChecklist) return false;
        
        // Vérifier si le titre de la tâche correspond à un item du template
        const taskTitleLower = task.title.trim().toLowerCase();
        const matchesItem = templateItemTitles.includes(taskTitleLower);
        
        // Aussi vérifier si la description contient le nom du template (fallback supplémentaire)
        const descriptionMatches = task.description?.toLowerCase().includes(template.name.toLowerCase()) || false;
        
        return matchesItem || descriptionMatches;
      });
      
    }

    // Grouper par titre pour éviter les doublons
    const grouped = new Map<string, Task[]>();
    templateTasks.forEach((task) => {
      const key = task.title;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(task);
    });

    return Array.from(grouped.entries()).map(([title, taskList]) => ({
      title,
      tasks: taskList,
      firstTask: taskList[0],
      totalCount: taskList.length,
    }));
  };


  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#0F172A]">
                Sélection multiple
              </h2>
              <button
                onClick={onClose}
                className="text-[#64748B] hover:text-[#0F172A]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {activeTemplates.length === 0 && orphanTasksGrouped.length === 0 ? (
              <div className="text-center py-8 text-[#64748B]">
                <p>Aucun modèle de routine actif trouvé.</p>
                <p className="text-sm mt-2">
                  Les modèles de routines sont créés dans la section "Modèles de routines".
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Templates actifs */}
                {activeTemplates.map((template) => {
                  const isExpanded = expandedTemplate === template.id;
                  const templateTasks = getTasksByTemplate(template.id);
                  
                  return (
                    <div
                      key={template.id}
                      className="rounded-lg border border-[#E5E7EB] bg-white overflow-hidden"
                    >
                      {/* En-tête du modèle */}
                      <div
                        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => setExpandedTemplate(isExpanded ? null : template.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-3">
                              <h3 className="font-semibold text-[#0F172A] text-lg">
                                {template.name}
                              </h3>
                              <span className="text-[#64748B] text-sm">
                                ({templateTasks.length} type(s) de tâche)
                              </span>
                            </div>
                            
                            {template.description && (
                              <p className="text-sm text-[#64748B] mb-3">
                                {template.description}
                              </p>
                            )}

                            {/* Récurrence */}
                            <div className="mb-2">
                              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                                Récurrence *
                              </label>
                              <div className="text-sm text-[#64748B]">
                                {template.recurrence === "daily" && "Quotidienne"}
                                {template.recurrence === "weekly" && "Hebdomadaire"}
                                {template.recurrence === "monthly" && "Mensuelle"}
                                {!template.recurrence && "Aucune"}
                              </div>
                            </div>

                            {/* Jours de la semaine si hebdomadaire */}
                            {template.recurrence === "weekly" && template.recurrenceDays && template.recurrenceDays.length > 0 && (
                              <div>
                                <label className="block text-sm font-medium text-[#0F172A] mb-2">
                                  Jours de la semaine
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  {weekDays.map((day) => {
                                    const isDaySelected = template.recurrenceDays?.includes(day.value) || false;
                                    return (
                                      <span
                                        key={day.value}
                                        className={`px-3 py-1 rounded text-sm ${
                                          isDaySelected
                                            ? "bg-[#F97316] text-white"
                                            : "bg-gray-100 text-gray-600"
                                        }`}
                                      >
                                        {day.label}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                          <button className="ml-4 text-[#64748B] hover:text-[#0F172A]">
                            <svg
                              className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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
                        </div>
                      </div>

                      {/* Liste des tâches du modèle (expandable) */}
                      {isExpanded && (
                        <div className="border-t border-[#E5E7EB] bg-gray-50 p-4">
                          {(() => {
                            const tasksForTemplate = getTasksByTemplate(template.id);
                            
                            if (tasksForTemplate.length === 0) {
                              return (
                                <p className="text-sm text-[#64748B] text-center py-4">
                                  Aucune tâche créée pour ce modèle.
                                </p>
                              );
                            }
                            
                            return (
                            <div className="space-y-2">
                              {tasksForTemplate.map((taskGroup, index) => {
                                const isTaskSelected = selectedTask?.id === taskGroup.firstTask.id;
                                
                                return (
                                  <div
                                    key={index}
                                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                      isTaskSelected
                                        ? "border-[#F97316] bg-orange-50"
                                        : "border-[#E5E7EB] bg-white hover:border-[#F97316]"
                                    }`}
                                    onClick={() => setSelectedTask(isTaskSelected ? null : taskGroup.firstTask)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <h4 className="font-medium text-[#0F172A]">
                                            {taskGroup.title}
                                          </h4>
                                          {isTaskSelected && (
                                            <span className="text-[#F97316]">
                                              <svg
                                                className="w-4 h-4"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                              >
                                                <path
                                                  fillRule="evenodd"
                                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                  clipRule="evenodd"
                                                />
                                              </svg>
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs text-[#64748B] mt-1">
                                          {taskGroup.totalCount} occurrence(s)
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Section pour les tâches orphelines (sans template) */}
                {orphanTasksGrouped.length > 0 && (
                  <div className="mt-6 pt-6 border-t-2 border-[#E5E7EB]">
                    <h3 className="text-lg font-semibold text-[#0F172A] mb-4">
                      Tâches sans modèle ({orphanTasks.length} tâche(s))
                    </h3>
                    <div className="space-y-3">
                      {orphanTasksGrouped.map((taskGroup) => {
                        const isSelected = selectedTask?.id === taskGroup.firstTask.id;
                        return (
                          <div
                            key={taskGroup.title}
                            className={`p-4 rounded-lg border ${
                              isSelected
                                ? "border-[#F97316] bg-orange-50"
                                : "border-[#E5E7EB] bg-white hover:bg-gray-50"
                            } cursor-pointer transition-colors`}
                            onClick={() => setSelectedTask(taskGroup.firstTask)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-medium text-[#0F172A]">
                                    {taskGroup.title}
                                  </h4>
                                  {isSelected && (
                                    <span className="text-[#F97316]">
                                      <svg
                                        className="w-4 h-4"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-[#64748B] mt-1">
                                  {taskGroup.totalCount} occurrence(s)
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedTask && (
              <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#64748B]">
                      Tâche sélectionnée: <strong className="text-[#0F172A]">{selectedTask.title}</strong>
                    </p>
                    <p className="text-xs text-[#64748B] mt-1">
                      Toutes les occurrences de cette tâche seront supprimées
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2"
                  >
                    Supprimer toutes les occurrences
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de confirmation */}
      {showDeleteConfirm && selectedTask && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/50"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 pointer-events-auto"
            >
              <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
                Supprimer toutes les occurrences
              </h3>
              <p className="text-xs text-[#64748B] mb-3">
                Êtes-vous sûr de vouloir supprimer toutes les occurrences de la tâche{" "}
                <strong>"{selectedTask.title}"</strong> ? Cette action supprimera toutes les
                occurrences (présentes et futures) de cette tâche.
              </p>

              <div className="flex justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="text-xs px-3 py-1"
                  disabled={isDeleting}
                >
                  Annuler
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  className="text-xs px-3 py-1"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Suppression..." : "Supprimer toutes les occurrences"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

