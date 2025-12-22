"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { PageTitle } from "@/components/layout/PageTitle";
import { TasksTable, Task as TaskTableType } from "@/components/tasks/TasksTable";
import { TaskCard } from "@/components/tasks/TaskCard";
import { WeeklyCalendar } from "@/components/tasks/WeeklyCalendar";
import { TaskRow } from "@/components/dashboard/TaskRow";
import { StatCard } from "@/components/dashboard/StatCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { CreateTaskModal, TaskFormData } from "@/components/tasks/CreateTaskModal";
import { CreateChecklistModal, ChecklistFormData } from "@/components/tasks/CreateChecklistModal";
import { RecurringTasksModal } from "@/components/tasks/RecurringTasksModal";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";
import {
  getTasks,
  getTodayTasks,
  getPriorityTasks,
  getTaskStats,
  getEmployees,
  getChecklists,
  getChecklistTemplates,
  createChecklistTemplate,
  updateChecklistTemplate,
  deleteChecklistTemplate,
  createTask as createTaskAPI,
  updateTask as updateTaskAPI,
  completeTask as completeTaskAPI,
  deleteTask as deleteTaskAPI,
  deleteAllTaskOccurrences,
  executeChecklistTemplate,
  Task as TaskType,
  Employee,
  ChecklistTemplate as ChecklistTemplateType,
  ChecklistInstance,
  TaskStats,
} from "@/services/tasksService";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { getClients, Client } from "@/services/clientsService";
import { ModuleLink } from "@/components/ui/ModuleLink";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { PageTransition } from "@/components/ui/PageTransition";
import { AnimatedButton } from "@/components/ui/AnimatedButton";

type PriorityTask = {
  id: number;
  title: string;
  description?: string;
  type: string;
  priority: "normal" | "high" | "critical";  // MVP V1: 3 priorités uniquement
  dueDate: string;
  assignedTo: string;
  assignedToAvatar?: string;
  status: string;
  isLate?: boolean;
};

type ChecklistTemplate = {
  id: number;
  name: string;
  description: string;
  items: string[];
  recurrence?: "daily" | "weekly" | "monthly";
  recurrenceDays?: number[];
  executionTime?: string;
};

type Checklist = {
  id: number;
  templateId: number;
  templateName: string;
  completedItems: number;
  totalItems: number;
  status: "en_cours" | "termine";
  startedAt: string;
  executionTime?: string;
};

type Notification = {
  id: number;
  type: "task_late" | "checklist_incomplete" | "task_critical" | "task_completed" | "task_assigned";
  title: string;
  message: string;
  time: string;
  read: boolean;
  link?: string;
};

export default function TasksPage() {
  const { user, token, refreshUserFromAPI } = useAuth();
  const { isModuleEnabled } = useModuleAccess();
  const searchParams = useSearchParams();
  const taskIdFromUrl = searchParams?.get("taskId");
  const clientIdFromUrl = searchParams?.get("clientId");
  const [activeTab, setActiveTab] = useState<"today" | "tasks" | "checklists">("today");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<TaskType | null>(null);
  const [editingChecklistTemplate, setEditingChecklistTemplate] = useState<ChecklistTemplateType | null>(null);
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // États pour les données depuis l'API
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [todayTasks, setTodayTasks] = useState<TaskType[]>([]);
  const [priorityTasksData, setPriorityTasksData] = useState<Record<string, TaskType[]>>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [checklists, setChecklists] = useState<ChecklistInstance[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplateType[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showUncompleteConfirm, setShowUncompleteConfirm] = useState(false);
  const [taskToUncomplete, setTaskToUncomplete] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null);
  const [showDeleteTemplateConfirm, setShowDeleteTemplateConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<number | null>(null);
  const [showRecurringTasksModal, setShowRecurringTasksModal] = useState(false);

  // Les employés peuvent maintenant voir tous les onglets (mais avec restrictions sur les actions)

  // Fonction helper pour trouver les informations d'un client
  const getClientInfo = (clientId?: number) => {
    if (!clientId) return undefined;
    const client = clients.find(c => c.id === clientId);
    if (!client) return undefined;
    return {
      id: client.id,
      name: client.name,
      type: client.type,
      contactEmail: client.contactEmail,
      contactPhone: client.contactPhone,
      address: client.address,
      sector: client.sector,
    };
  };

  // Fonction pour charger les données
  const loadData = useCallback(async () => {
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Charger en parallèle
      const [
        employeesData,
        clientsData,
        todayTasksData,
        priorityTasksDataResult,
        checklistsData,
        templatesData,
        statsData,
      ] = await Promise.all([
        getEmployees(token),
        getClients(token),
        getTodayTasks(token),
        getPriorityTasks(token),
        getChecklists(token, "en_cours"),
        getChecklistTemplates(token),
        getTaskStats(token),
      ]);
      
      // Mettre à jour les états de manière atomique pour éviter les problèmes de synchronisation
      
      setEmployees(employeesData);
      setClients(clientsData);
      setTodayTasks(todayTasksData);
      
      // S'assurer que priorityTasksDataResult est bien un objet valide
      if (priorityTasksDataResult && typeof priorityTasksDataResult === 'object') {
        // Vérifier qu'il contient bien les clés attendues
        const hasValidKeys = 'critical' in priorityTasksDataResult || 
                            'high' in priorityTasksDataResult || 
                            'normal' in priorityTasksDataResult;
        if (hasValidKeys) {
          setPriorityTasksData(priorityTasksDataResult);
        } else {
          setPriorityTasksData({});
        }
      } else {
        setPriorityTasksData({});
      }
      
      setChecklists(checklistsData);
      setTemplates(templatesData);
      setStats(statsData);
      
      // Charger toutes les tâches pour l'onglet "tasks"
      const employeeId = employeeFilter !== "all" ? parseInt(employeeFilter) : undefined;
      const allTasksData = await getTasks(token, {
        status: statusFilter !== "all" ? statusFilter : undefined,
        category: categoryFilter !== "all" ? categoryFilter : undefined,
        priority: priorityFilter !== "all" ? priorityFilter : undefined,
        assigned_to_id: employeeId && !isNaN(employeeId) ? employeeId : undefined,
        search: searchQuery || undefined,
      });
      setTasks(allTasksData);
      
      // Si taskId est dans l'URL, ouvrir automatiquement cette tâche
      if (taskIdFromUrl) {
        const taskId = Number(taskIdFromUrl);
        const allTasks = [...allTasksData, ...todayTasksData, ...Object.values(priorityTasksDataResult).flat()];
        const task = allTasks.find(t => t.id === taskId);
        if (task) {
          // selectedTaskForDetails attend un TaskType (de tasksService)
          setSelectedTaskForDetails(task);
          setActiveTab("tasks"); // Basculer vers l'onglet tasks pour voir la tâche
        }
      } else if (clientIdFromUrl) {
        // Si clientId est fourni, filtrer les tâches pour ce client
        const clientId = Number(clientIdFromUrl);
        const clientTasks = allTasksData.filter(t => t.clientId === clientId);
        if (clientTasks.length > 0) {
          setActiveTab("tasks");
          // Optionnel : sélectionner la première tâche du client
          // setSelectedTaskForDetails(clientTasks[0]);
        }
      }
    } catch (err: any) {
      console.error("Erreur lors du chargement des données:", err);
      setError(err.message || "Erreur lors du chargement des données");
    } finally {
      setIsLoading(false);
    }
  }, [token, statusFilter, categoryFilter, priorityFilter, employeeFilter, searchQuery]);

  // Charger les données depuis l'API
  useEffect(() => {
    loadData();
    // Rafraîchir les permissions utilisateur à chaque chargement de page
    if (refreshUserFromAPI) {
      refreshUserFromAPI();
    }
  }, [loadData, refreshUserFromAPI]);

  // S'assurer que les données sont bien synchronisées quand on change d'onglet
  // Ne recharger que si les données semblent manquantes
  // Supprimé : logique pour l'onglet "Priorités"

  // Handlers pour les actions de tâches
  const handleToggleComplete = async (taskId: number) => {
    if (!token) return;
    
    // Vérifier si c'est un ID artificiel de checklist (ID >= 1000 et multiple de 1000 ou proche)
    // Les IDs artificiels sont de la forme: checklist.id * 1000 + index
    // Donc si taskId >= 1000 et taskId % 1000 < 100, c'est probablement un ID artificiel
    if (taskId >= 1000 && taskId % 1000 < 100) {
      // C'est une tâche de checklist avec ID artificiel
      // Ces tâches ne peuvent pas être cochées directement car elles n'existent pas en base
      // TODO: Implémenter la gestion des items de checklist via l'API checklist
      setError("Les items de checklist sont gérés automatiquement lors de l'exécution d'un modèle");
      return;
    }
    
    // Trouver la tâche pour vérifier son statut actuel
    const task = [...tasks, ...todayTasks, ...Object.values(priorityTasksData).flat()].find(t => t.id === taskId);
    const isCurrentlyCompleted = task?.status === "Terminé" || task?.status === "Terminée";
    
    // Si on décoche (la tâche est terminée), ouvrir la modal de confirmation
    if (isCurrentlyCompleted) {
      setTaskToUncomplete(taskId);
      setShowUncompleteConfirm(true);
      return;
    }
    
    // Cocher : marquer comme terminée (sans confirmation)
    try {
      await completeTaskAPI(token, taskId);
      await loadData();
    } catch (err: any) {
      console.error("Erreur lors de la complétion de la tâche:", err);
      setError(err.message || "Erreur lors de la complétion de la tâche");
    }
  };

  const confirmUncompleteTask = async () => {
    if (!token || !taskToUncomplete) return;
    
    try {
      // Décocher : remettre à "À faire"
      await updateTaskAPI(token, taskToUncomplete, {
        status: "À faire"
      });
      await loadData();
      setShowUncompleteConfirm(false);
      setTaskToUncomplete(null);
    } catch (err: any) {
      console.error("Erreur lors du décochage de la tâche:", err);
      setError(err.message || "Erreur lors du décochage de la tâche");
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!token) return;
    
    // Ouvrir la modal de confirmation
    setTaskToDelete(taskId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTask = async () => {
    if (!token || !taskToDelete) return;
    
    try {
      await deleteTaskAPI(token, taskToDelete);
      await loadData();
      setShowDeleteConfirm(false);
      setTaskToDelete(null);
    } catch (err: any) {
      console.error("Erreur lors de la suppression de la tâche:", err);
      setError(err.message || "Erreur lors de la suppression de la tâche");
    }
  };

  const handleDeleteAllOccurrences = async (taskId: number) => {
    if (!token) return;
    
    try {
      const result = await deleteAllTaskOccurrences(token, taskId);
      setSuccessMessage(`${result.deleted_count} occurrence(s) supprimée(s) avec succès`);
      await loadData();
    } catch (err: any) {
      console.error("Erreur lors de la suppression de toutes les occurrences:", err);
      setError(err.message || "Erreur lors de la suppression de toutes les occurrences");
      throw err; // Re-throw pour que le modal puisse gérer l'erreur
    }
  };

  const handleAddComment = (taskId: number) => {
    // TODO: Implémenter l'ajout de commentaires
  };

  const handleDeleteTemplate = (templateId: number) => {
    if (!token) return;
    
    // Ouvrir la modal de confirmation
    setTemplateToDelete(templateId);
    setShowDeleteTemplateConfirm(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!token || !templateToDelete) return;
    
    try {
      await deleteChecklistTemplate(token, templateToDelete);
      await loadData();
      setShowDeleteTemplateConfirm(false);
      setTemplateToDelete(null);
      setSuccessMessage("Modèle de routine supprimé avec succès");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error("Erreur lors de la suppression du modèle:", err);
      setError(err.message || "Erreur lors de la suppression du modèle de routine");
    }
  };

  const handleUpdateTask = async (taskId: number, updates: { priority?: string; assigned_to_id?: number; due_date?: string; description?: string }) => {
    if (!token) return;
    
    try {
      await updateTaskAPI(token, taskId, updates);
      await loadData();
    } catch (err: any) {
      console.error("Erreur lors de la mise à jour de la tâche:", err);
      setError(err.message || "Erreur lors de la mise à jour de la tâche");
    }
  };

  const handleExecuteChecklist = async (templateId: number, assignedToId?: number) => {
    if (!token) return;
    
    setError(null);
    setSuccessMessage(null);
    
    try {
      const result = await executeChecklistTemplate(token, templateId, assignedToId);
      
      // Petit délai pour s'assurer que les tâches sont bien commitées en base
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadData();
      
      // Données rechargées avec succès
      
      // Vérifier si des tâches ont été créées ou si c'était déjà exécuté aujourd'hui
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setSuccessMessage(`Checklist "${template.name}" exécutée avec succès ! Les tâches sont maintenant disponibles dans la section "Aujourd'hui".`);
        // Effacer le message après 5 secondes
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err: any) {
      console.error("Erreur lors de l'exécution de la checklist:", err);
      setError(err.message || "Erreur lors de l'exécution de la checklist");
    }
  };

  // Date du jour formatée
  const today = new Date();
  const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
  const monthNames = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
  ];
  const formattedDate = `${dayNames[today.getDay()]} ${today.getDate()} ${monthNames[today.getMonth()]}`;

  // Convertir les tâches API en format frontend
  const convertTaskToFrontend = (task: TaskType): any => ({
    id: task.id,
    title: task.title,
    description: (task as any).description,
    assignedTo: task.assignedTo,
    assignedToId: (task as any).assignedToId,
    assignedToAvatar: task.assignedToAvatar,
    type: task.category as any,
    category: task.category,
    priority: (task as any).priority as any,
    dueDate: task.dueDate || "",
    dueDateRaw: (task as any).dueDateRaw,
    dueTime: (task as any).dueTime,
    status: task.status as any,
    clientId: task.clientId,
    clientName: task.clientName,
    projectId: task.projectId,
    projectName: task.projectName,
    conversationId: task.conversationId,
    origin: (task as any).origin as "manual" | "checklist" | undefined,
    checklistName: (task as any).checklistName,
    isLate: (task as any).isLate,
    // Inclure les champs de checklist pour le filtrage
    checklistTemplateId: (task as any).checklistTemplateId,
    checklistTemplateName: (task as any).checklistTemplateName,
    checklistInstanceId: (task as any).checklistInstanceId,
    isChecklistItem: (task as any).isChecklistItem,
    // Préserver recurrence et recurrenceDays
    recurrence: (task as any).recurrence,
    recurrenceDays: (task as any).recurrenceDays,
  });

  const frontendTasks: TaskTableType[] = tasks.map(convertTaskToFrontend);
  const frontendTodayTasks: TaskTableType[] = todayTasks.map(convertTaskToFrontend);

  // Combiner toutes les tâches (les tâches de checklist sont déjà dans todayTasks)
  // Dédupliquer par ID pour éviter les doublons (une tâche peut être dans frontendTasks ET frontendTodayTasks)
  const allTasksMap = new Map<number, TaskTableType>();
  
  // Ajouter les tâches de frontendTasks (préserver recurrence et recurrenceDays)
  frontendTasks.forEach((t) => {
    allTasksMap.set(t.id, { 
      ...t, 
      origin: "manual" as any,
      checklistName: undefined as any,
      recurrence: (t as any).recurrence,
      recurrenceDays: (t as any).recurrenceDays,
    } as any);
  });

  // Ajouter les tâches de frontendTodayTasks (écrase les doublons si présents, préserver recurrence)
  frontendTodayTasks.forEach((t) => {
    allTasksMap.set(t.id, { 
      ...t, 
      origin: ((t as any).origin || "manual") as any,
      recurrence: (t as any).recurrence,
      recurrenceDays: (t as any).recurrenceDays,
    } as any);
  });
  
  const allTasks = Array.from(allTasksMap.values());

  // Fonction pour vérifier si une date correspond à aujourd'hui
  const isToday = (task: TaskTableType): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // Utiliser la date brute si disponible (plus fiable)
    if ((task as any).dueDateRaw) {
      try {
        // Parser en ignorant le timezone pour éviter les décalages
        const dateStr = (task as any).dueDateRaw;
        let taskDate: Date;
        
        if (dateStr.includes('T')) {
          const dateOnly = dateStr.split('T')[0];
          const [year, month, day] = dateOnly.split('-').map(Number);
          taskDate = new Date(year, month - 1, day);
        } else if (dateStr.includes('-')) {
          const [year, month, day] = dateStr.split('-').map(Number);
          taskDate = new Date(year, month - 1, day);
        } else {
          taskDate = new Date(dateStr);
        }
        
        taskDate.setHours(0, 0, 0, 0);
        const taskKey = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, '0')}-${String(taskDate.getDate()).padStart(2, '0')}`;
        return taskKey === todayKey;
      } catch {
        // Si la date brute ne peut pas être parsée, utiliser le formaté
      }
    }
    
    // Sinon, utiliser la date formatée
    const dateStr = task.dueDate;
    if (!dateStr) return false;
    if (dateStr === "Aujourd'hui") return true;
    
    // Parser le format français DD/MM/YYYY
    if (dateStr.includes('/')) {
      try {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          const taskDate = new Date(year, month, day);
          taskDate.setHours(0, 0, 0, 0);
          const taskKey = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, '0')}-${String(taskDate.getDate()).padStart(2, '0')}`;
          return taskKey === todayKey;
        }
      } catch {
        // Ignorer les erreurs
      }
    }
    
    // Essayer de parser comme date ISO
    try {
      const taskDate = new Date(dateStr);
      taskDate.setHours(0, 0, 0, 0);
      const taskKey = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, '0')}-${String(taskDate.getDate()).padStart(2, '0')}`;
      return taskKey === todayKey;
    } catch {
      return false;
    }
  };

  // Filtrer les tâches d'aujourd'hui depuis allTasks (pour cohérence avec le calendrier)
  // Cela garantit que les tâches affichées dans "Aujourd'hui" sont les mêmes que dans le calendrier
  // IMPORTANT: Pour les employés (role "user"), on affiche TOUTES leurs tâches assignées, pas seulement celles d'aujourd'hui
  const allTasksToday = Array.from(allTasksMap.values()).filter((t) => {
    // Si l'utilisateur est un employé, afficher toutes ses tâches assignées
    if (user?.role === "user") {
      const isAssigned = (t as any).assignedToId === user?.id;
      return isAssigned;
    }
    // Pour les admins/owners : afficher les tâches d'aujourd'hui OU les tâches en retard (même si date passée)
    const isTodayTask = isToday(t);
    const isLate = t.status === "En retard";
    return isTodayTask || isLate;
  });
  
  // Appliquer le filtre employé aux tâches d'aujourd'hui (si on est dans l'onglet "today" en mode admin)
  const allTasksTodayFiltered = allTasksToday.filter((task) => {
    if (activeTab === "today" && employeeFilter !== "all") {
      const employeeId = parseInt(employeeFilter);
      if (!isNaN(employeeId) && (task as any).assignedToId !== employeeId) return false;
    }
    return true;
  });
  
  // Filtrer les tâches en retard (seulement celles d'aujourd'hui)
  // Vérifier aussi si la date d'échéance est passée pour détecter les tâches en retard
  const lateTasks = allTasksTodayFiltered.filter((t) => {
    if (t.status === "En retard") return true;
    // Vérifier aussi si la date d'échéance est passée et la tâche n'est pas terminée
    const statusStr = String(t.status);
    if (statusStr === "Terminée" || statusStr === "Terminé") return false;
    try {
      const dueDateRaw = (t as any).dueDateRaw;
      if (dueDateRaw) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let taskDate: Date;
        if (dueDateRaw.includes('T')) {
          const dateOnly = dueDateRaw.split('T')[0];
          const [year, month, day] = dateOnly.split('-').map(Number);
          taskDate = new Date(year, month - 1, day);
        } else if (dueDateRaw.includes('-')) {
          const [year, month, day] = dueDateRaw.split('-').map(Number);
          taskDate = new Date(year, month - 1, day);
        } else {
          taskDate = new Date(dueDateRaw);
        }
        taskDate.setHours(0, 0, 0, 0);
        return taskDate < today;
      }
    } catch {
      // Ignorer les erreurs de parsing
    }
    return false;
  });

  // Toutes les tâches du jour (manuelles + checklist) pour l'affichage - SEULEMENT celles d'aujourd'hui
  // Exclure les tâches en retard pour éviter les doublons
  const todayTasksFiltered = allTasksTodayFiltered.filter((t) => {
    // Exclure les tâches en retard
    if (t.status === "En retard") return false;
    // Exclure aussi les tâches dont la date d'échéance est passée (sauf si terminées)
    const statusStr = String(t.status);
    if (statusStr.includes("Termin")) return true;
    try {
      const dueDateRaw = (t as any).dueDateRaw;
      if (dueDateRaw) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let taskDate: Date;
        if (dueDateRaw.includes('T')) {
          const dateOnly = dueDateRaw.split('T')[0];
          const [year, month, day] = dateOnly.split('-').map(Number);
          taskDate = new Date(year, month - 1, day);
        } else if (dueDateRaw.includes('-')) {
          const [year, month, day] = dueDateRaw.split('-').map(Number);
          taskDate = new Date(year, month - 1, day);
        } else {
          taskDate = new Date(dueDateRaw);
        }
        taskDate.setHours(0, 0, 0, 0);
        // Si la date est passée, c'est une tâche en retard, donc l'exclure
        if (taskDate < today) return false;
      }
    } catch {
      // Ignorer les erreurs de parsing
    }
    return true;
  });
  
  // Total des tâches d'aujourd'hui (uniquement les non en retard, car les en retard sont dans une section séparée)
  const totalTodayTasks = todayTasksFiltered.length;

  // Permissions : vérifier les permissions de l'utilisateur
  // Les owners/admins ont tous les droits par défaut, les users utilisent leurs permissions
  const canEditTasks = user?.role === "super_admin" || user?.role === "owner" || (user?.role === "user" && user?.can_edit_tasks === true);
  const canDeleteTasks = user?.role === "super_admin" || user?.role === "owner" || (user?.role === "user" && user?.can_delete_tasks === true);
  const canCreateTasks = user?.role === "super_admin" || user?.role === "owner" || (user?.role === "user" && user?.can_create_tasks === true);

  // Convertir priorityTasksData en PriorityTask[] (MVP V1: 3 priorités)
  const normalizeTaskPriority = (priority?: string): "normal" | "high" | "critical" => {
    if (!priority) return "normal";
    const p = priority.toLowerCase();
    if (p === "critical") return "critical";
    if (p === "high" || p === "urgent") return "high";
    return "normal";  // low, medium, ou autre → normal
  };

  const priorityTasks: PriorityTask[] = priorityTasksData && typeof priorityTasksData === 'object'
    ? Object.entries(priorityTasksData)
        .filter(([priority]) => priority !== "admin_alerts")  // Exclure admin_alerts de la conversion
        .flatMap(([priority, tasks]) => {
          if (!Array.isArray(tasks)) return [];
          return tasks.map((task) => ({
            id: task.id,
            title: task.title,
            description: (task as any).description,
            type: task.category,
            priority: normalizeTaskPriority((task as any).priority),
            dueDate: task.dueDate || "",
            dueTime: (task as any).dueTime,
            assignedTo: task.assignedTo || "",
            assignedToAvatar: task.assignedToAvatar,
            status: task.status,
            isLate: task.isLate,
          }));
        })
    : [];

  // Convertir checklists API en format frontend
  const activeChecklists: Checklist[] = Array.isArray(checklists)
    ? checklists.map((checklist) => ({
        id: checklist.id,
        templateId: checklist.templateId,
        templateName: checklist.templateName,
        completedItems: Array.isArray(checklist.completedItems) ? checklist.completedItems.length : 0,
        totalItems: checklist.totalItems || 0,
        status: checklist.status,
        startedAt: checklist.startedAt,
        executionTime: checklist.executionTime,
      }))
    : [];

  const todayChecklists = activeChecklists.filter((c) => {
    const startDate = new Date(c.startedAt);
    return startDate.toDateString() === today.toDateString();
  });




  // lateTasks et todayTasksFiltered sont maintenant définis plus haut

  // Utiliser les templates depuis l'API
  const frontendTemplates: ChecklistTemplate[] = Array.isArray(templates)
    ? templates.map((template) => ({
        id: template.id,
        name: template.name,
        description: template.description,
        items: Array.isArray(template.items) ? template.items : [],
        recurrence: template.recurrence,
        recurrenceDays: template.recurrenceDays || [],
        executionTime: template.executionTime,
      }))
    : [];

  // Historique des checklists (pour l'instant vide, à implémenter si besoin)
  const checklistHistory: any[] = [];

  // Notifications mock
  useEffect(() => {
    setNotifications([
      {
        id: 1,
        type: "task_late",
        title: "Tâche en retard",
        message: "Nettoyage salle n'a pas été complétée",
        time: "Il y a 2 heures",
        read: false,
      },
      {
        id: 2,
        type: "checklist_incomplete",
        title: "Checklist incomplète",
        message: "Ouverture magasin - 2 items restants",
        time: "Il y a 3 heures",
        read: false,
      },
      {
        id: 3,
        type: "task_critical",
        title: "Tâche critique",
        message: "Relancer facture impayée - Boulangerie Soleil",
        time: "Il y a 5 heures",
        read: false,
      },
      {
        id: 4,
        type: "task_completed",
        title: "Tâche complétée",
        message: "Vérifier stock farine a été complétée par Marie",
        time: "Il y a 1 jour",
        read: true,
      },
    ]);
  }, []);

  const priorityColors = {
    urgent: "bg-red-100 text-red-800 border-red-200",
    high: "bg-orange-100 text-orange-800 border-orange-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-blue-100 text-blue-800 border-blue-200",
    critical: "bg-red-100 text-red-800 border-red-200",
  };

  const priorityLabels = {
    urgent: "Urgent",
    high: "Haute",
    medium: "Moyenne",
    low: "Basse",
    critical: "Critique",
  };

  // MVP V1: 3 priorités uniquement (critical, high, normal)
  // Mapper les anciennes priorités pour compatibilité
  const normalizePriority = (priority?: string): "critical" | "high" | "normal" => {
    if (!priority) return "normal";
    const p = priority.toLowerCase();
    if (p === "critical") return "critical";
    if (p === "high" || p === "urgent") return "high";
    return "normal";  // low, medium, ou autre → normal
  };

  const groupedTasks = {
    critical: [] as PriorityTask[],
    high: [] as PriorityTask[],
    normal: [] as PriorityTask[],
  };

  // Grouper les tâches par priorité normalisée
      // Toutes les tâches sont affichées dans "Tâches du jour"
  if (priorityTasksData && typeof priorityTasksData === 'object' && Object.keys(priorityTasksData).length > 0) {
    // Si les données viennent directement de l'API avec les nouvelles priorités
    if (priorityTasksData.critical && Array.isArray(priorityTasksData.critical)) {
      groupedTasks.critical = ((priorityTasksData.critical as any[]) || []).filter((t: any) => {
        // Exclure les tâches de checklist (vérifier origin, is_checklist_item, ou checklist_instance_id)
        const isChecklist = t.origin === "checklist" || 
                           t.is_checklist_item === true || 
                           (t.checklist_instance_id !== null && t.checklist_instance_id !== undefined);
        return !isChecklist;
      });
    }
    if (priorityTasksData.high && Array.isArray(priorityTasksData.high)) {
      groupedTasks.high = (priorityTasksData.high as any[]).filter((t: any) => {
        const isChecklist = t.origin === "checklist" || 
                           t.is_checklist_item === true || 
                           (t.checklist_instance_id !== null && t.checklist_instance_id !== undefined);
        return !isChecklist;
      });
    }
    if (priorityTasksData.normal && Array.isArray(priorityTasksData.normal)) {
      groupedTasks.normal = (priorityTasksData.normal as any[]).filter((t: any) => {
        // Vérifier si c'est une tâche de checklist
        const isChecklist = t.origin === "checklist" || 
                           t.is_checklist_item === true || 
                           t.isChecklistItem === true ||
                           (t.checklist_instance_id !== null && t.checklist_instance_id !== undefined) ||
                           (t.checklistInstanceId !== null && t.checklistInstanceId !== undefined);
        return !isChecklist;
      });
    }
  } else if (Array.isArray(priorityTasks)) {
    // Fallback: grouper manuellement si c'est un tableau
    priorityTasks.forEach((task) => {
      // Exclure les tâches de checklist
      const isChecklist = (task as any).origin === "checklist" || 
                         (task as any).is_checklist_item === true ||
                         ((task as any).checklist_instance_id !== null && (task as any).checklist_instance_id !== undefined);
      if (isChecklist) return;
      const normalized = normalizePriority((task as any).priority);
      groupedTasks[normalized].push(task);
    });
  }

  // allTasksMap et allTasks sont maintenant définis plus haut (après frontendTasks et frontendTodayTasks)

  const filteredTasks = allTasks.filter((task) => {
    if (employeeFilter !== "all") {
      const employeeId = parseInt(employeeFilter);
      if (!isNaN(employeeId) && (task as any).assignedToId !== employeeId) return false;
    }
    if (categoryFilter !== "all" && task.type !== categoryFilter) return false;
    if (statusFilter !== "all" && task.status !== statusFilter) return false;
    if (originFilter !== "all" && ("origin" in task ? task.origin : "manual") !== originFilter) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleMarkNotificationAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Header content selon l'onglet
  const getHeaderContent = () => {
    if (activeTab === "today") {
      return {
        title: "Aujourd'hui",
        subtitle: formattedDate,
      };
    }

    return {
      title: activeTab === "tasks" ? "Toutes les tâches" : "Modèles de routines",
      subtitle: activeTab === "checklists" ? "Vos routines internes" : undefined,
    };
  };

  const header = getHeaderContent();

  // Actions communes pour toutes les pages (en haut à droite)
  // Afficher uniquement si l'utilisateur a les permissions
  const pageActions = canCreateTasks ? (
    <div className="flex items-center gap-3">
      {activeTab === "checklists" ? (
        <AnimatedButton
          variant="primary"
          onClick={() => setIsChecklistModalOpen(true)}
        >
          + Ajouter une checklist
        </AnimatedButton>
      ) : (
        <AnimatedButton
          variant="primary"
          onClick={() => setIsTaskModalOpen(true)}
        >
          + Ajouter une tâche
        </AnimatedButton>
      )}
    </div>
  ) : null;


  // Afficher le loader pendant le chargement
  if (isLoading) {
    return (
      <PageTransition>
        <PageTitle title="Tâches" />
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader />
        </div>
      </PageTransition>
    );
  }

  // Afficher l'erreur si présente
  if (error) {
    return (
      <PageTransition>
        <PageTitle title="Tâches" />
        <Card>
          <EmptyState
            title="Erreur"
            description={error}
            icon="❌"
          />
        </Card>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageTitle
        title={header.title}
        subtitle={header.subtitle}
      />
      <div className="space-y-6">
        {/* Header avec badge pour Aujourd'hui */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A]">{header.title}</h1>
            {header.subtitle && (
              <p className="mt-2 text-[#64748B]">{header.subtitle}</p>
            )}
            {activeTab === "today" && (header as any).badge && (
              <div className="mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#F97316] text-white">
                  {(header as any).badge}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Filtres pour Aujourd'hui (uniquement pour admin/owner) */}
        {activeTab === "today" && (user?.role === "super_admin" || user?.role === "owner") && (
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
            >
              <option value="all">Tous les employés</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id.toString()}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-[#E5E7EB]">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("today")}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === "today"
                  ? "border-[#F97316] text-[#F97316]"
                  : "border-transparent text-[#64748B] hover:border-[#FDBA74] hover:text-[#F97316]"
              }`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                activeTab === "tasks"
                  ? "border-[#F97316] text-[#F97316]"
                  : "border-transparent text-[#64748B] hover:border-[#FDBA74] hover:text-[#F97316]"
              }`}
            >
              Toutes les tâches
            </button>
            {/* Les modèles sont réservés aux admins/owners pour l'instant */}
            {(user?.role === "super_admin" || user?.role === "owner") && (
              <button
                onClick={() => setActiveTab("checklists")}
                className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                  activeTab === "checklists"
                    ? "border-[#F97316] text-[#F97316]"
                    : "border-transparent text-[#64748B] hover:border-[#FDBA74] hover:text-[#F97316]"
                }`}
              >
                Modèles
              </button>
            )}
          </nav>
        </div>

        {/* Messages d'erreur et de succès */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">
            {successMessage}
          </div>
        )}

        {/* Contenu selon l'onglet actif */}
        {activeTab === "today" && (
          <div className="space-y-8">
            {/* Actions en haut à droite */}
            <div className="flex justify-end">
              {pageActions}
            </div>

            {/* VUE UNIFIÉE : Même interface pour tous, avec restrictions selon les permissions */}
            {/* TODO: Ajouter un système de permissions depuis les paramètres */}
            {/* Pour l'instant, les users ne peuvent pas modifier/supprimer les tâches */}
            <>
                {/* SECTION 1 — Tâches en retard (prioritaire) */}
                {lateTasks.length > 0 && (
                  <SectionCard
                    title="⚠️ En retard"
                  >
                    <div className="space-y-3">
                      {lateTasks.map((task) => (
                        <TaskCard
                          key={`late-${task.id}`}
                          id={task.id}
                          title={task.title}
                          description={(task as any).description}
                          assignedTo={task.assignedTo || "Non assigné"}
                          assignedToId={(task as any).assignedToId}
                          category={task.type || "Interne"}
                          priority={normalizeTaskPriority((task as any).priority) || "high"}
                          dueDate={task.dueDate}
                          dueDateRaw={(task as any).dueDateRaw}
                          status={(task.status === "Terminée" ? "Terminé" : task.status) as "À faire" | "En cours" | "Terminé" | "En retard"}
                          isLate={true}
                          comment={(task as any).description}
                          employees={employees}
                          clientId={(task as any).clientId}
                          clientInfo={getClientInfo((task as any).clientId)}
                          projectId={(task as any).projectId}
                          projectName={(task as any).projectName}
                          onToggleComplete={handleToggleComplete}
                          onUpdate={canEditTasks ? handleUpdateTask : undefined}
                          onDelete={canDeleteTasks ? handleDeleteTask : undefined}
                        />
                      ))}
                    </div>
                  </SectionCard>
                )}

                {/* SECTION 2 — Tâches du jour */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-[#0F172A]">Tâches du jour</h2>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                        {totalTodayTasks} tâche{totalTodayTasks !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveTab("tasks")}
                        className="text-sm font-medium text-[#64748B] hover:text-[#0F172A]"
                      >
                        Voir tout
                      </button>
                    </div>
                  </div>
                  <SectionCard title="Tâches du jour">
                    <div className="space-y-3">
                    {/* Afficher uniquement les tâches du jour (sans les tâches en retard) */}
                    {todayTasksFiltered.map((task) => {
                      const priorityTask = priorityTasks.find((pt) => pt.title === task.title);
                      return (
                        <TaskCard
                          key={`today-admin-${task.id}`}
                          id={task.id}
                          title={task.title}
                          description={(task as any).description}
                          assignedTo={task.assignedTo || "Non assigné"}
                          assignedToId={(task as any).assignedToId}
                          assignedToAvatar={priorityTask?.assignedToAvatar}
                          category={task.type || "Interne"}
                          priority={normalizeTaskPriority((priorityTask as any)?.priority) || "normal"}
                          dueDate={task.dueDate}
                          dueDateRaw={(task as any).dueDateRaw}
                          status={(task.status === "Terminée" ? "Terminé" : task.status) as "À faire" | "En cours" | "Terminé" | "En retard"}
                          comment={(task as any).description}
                          employees={employees}
                          clientId={(task as any).clientId}
                          clientInfo={getClientInfo((task as any).clientId)}
                          projectId={(task as any).projectId}
                          projectName={(task as any).projectName}
                          onToggleComplete={handleToggleComplete}
                          onUpdate={canEditTasks ? handleUpdateTask : undefined}
                          onDelete={canDeleteTasks ? handleDeleteTask : undefined}
                        />
                      );
                    })}
                  </div>
                  </SectionCard>
                </div>

                {/* SECTION 3 — Statistiques rapides (MVP V1: 3 stats uniquement) */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold text-[#0F172A] mb-2">Total du jour</h3>
                      <p className="text-2xl font-bold text-[#0F172A]">
                        {totalTodayTasks}
                      </p>
                      <p className="text-xs text-[#64748B] mt-1">tâches aujourd'hui</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold text-[#0F172A] mb-2">Terminées</h3>
                      <p className="text-2xl font-bold text-green-600">
                        {todayTasksFiltered.filter((t) => t.status === "Terminée").length}
                      </p>
                      <p className="text-xs text-[#64748B] mt-1">faites / non faites</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold text-[#0F172A] mb-2">En retard</h3>
                      <p className="text-2xl font-bold text-red-600">
                        {lateTasks.length}
                      </p>
                      <p className="text-xs text-[#64748B] mt-1">tâches en retard</p>
                    </CardContent>
                  </Card>
                </div>
              </>
          </div>
        )}

        {/* Onglet "Priorités" supprimé */}

        {activeTab === "tasks" && (
          <div className="space-y-6">
            {/* Actions en haut à droite */}
            <div className="flex justify-end">
              {pageActions}
            </div>

            {/* Bouton pour ouvrir l'interface de sélection multiple */}
            {canDeleteTasks && (
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setShowRecurringTasksModal(true)}
                  className="px-4 py-2 rounded-lg bg-[#F97316] text-white text-sm font-medium hover:bg-[#EA580C] transition-colors"
                >
                  Sélection multiple
                </button>
              </div>
            )}

            {/* Calendrier hebdomadaire */}
            <WeeklyCalendar
              tasks={allTasks as any}
              employees={employees}
              onTaskClick={(task) => setSelectedTaskForDetails(task as any)}
              onToggleComplete={handleToggleComplete}
              onUpdate={canEditTasks ? handleUpdateTask : undefined}
              onDelete={canDeleteTasks ? handleDeleteTask : undefined}
            />
          </div>
        )}

        {activeTab === "checklists" && (
          <div className="space-y-6">
            {/* Actions en haut à droite */}
            <div className="flex justify-end">
              {pageActions}
            </div>

            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold text-[#0F172A]">Modèles de routines</h2>
              <p className="mt-2 text-[#64748B]">
                Créez et gérez vos modèles de checklists. Ces modèles génèrent automatiquement les tâches quotidiennes qui apparaissent dans "Aujourd'hui" et "Toutes les tâches".
              </p>
              {user?.role === "user" && (
                <p className="mt-1 text-xs text-[#64748B] italic">
                  ⚠️ Vous pouvez consulter les modèles mais pas les modifier.
                </p>
              )}
            </div>

            {/* Liste des modèles */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {frontendTemplates.map((template) => (
                <Card key={template.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-[#0F172A]">{template.name}</h3>
                        <p className="text-sm text-[#64748B] mt-1">{template.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#64748B]">Items</span>
                        <span className="font-medium text-[#0F172A]">{template.items.length}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#64748B]">Récurrence</span>
                        <span className="font-medium text-[#0F172A]">
                          {template.recurrence === "daily" && "Quotidienne"}
                          {template.recurrence === "weekly" && "Hebdomadaire"}
                          {template.recurrence === "monthly" && "Mensuelle"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {canCreateTasks && (
                        <button
                          onClick={() => handleExecuteChecklist(template.id)}
                          className="flex-1 rounded-lg bg-[#F97316] px-3 py-2 text-sm font-medium text-white hover:bg-[#EA580C] transition-colors"
                        >
                          Exécuter
                        </button>
                      )}
                      {(user?.role === "super_admin" || user?.role === "owner") && (
                        <>
                          <button
                            onClick={() => {
                              setEditingChecklistTemplate(template as any);
                              setIsChecklistModalOpen(true);
                            }}
                            className="flex-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                            title="Supprimer"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Message si aucun modèle */}
            {frontendTemplates.length === 0 && (
              <Card>
                <EmptyState
                  title="Aucun modèle de routine"
                  description="Créez votre premier modèle de checklist pour générer automatiquement des tâches quotidiennes."
                  icon="📋"
                />
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Modales */}
      <CreateTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        employees={employees}
        onSubmit={async (data: TaskFormData) => {
          if (!token) return;
          
          try {
            // Mapper les données du formulaire vers l'API
            await createTaskAPI(token, {
              title: data.title,
              description: data.description,
              priority: data.priority,
              assigned_to_id: data.assigned_to_id,
              due_date: data.due_date,
              recurrence: data.recurrence || "none",
              recurrence_days: data.recurrence_days,
            });
            
            // Recharger les données après création
            await loadData();
            
            // Rafraîchir les permissions utilisateur
            if (refreshUserFromAPI) {
              await refreshUserFromAPI();
            }
            
            // Afficher le message de succès
            setSuccessMessage("Tâche créée avec succès !");
            setTimeout(() => setSuccessMessage(null), 5000);
            
            setIsTaskModalOpen(false);
          } catch (err: any) {
            console.error("Erreur lors de la création de la tâche:", err);
            setError(err.message || "Erreur lors de la création de la tâche");
          }
        }}
      />

      <CreateChecklistModal
        isOpen={isChecklistModalOpen}
        onClose={() => {
          setIsChecklistModalOpen(false);
          setEditingChecklistTemplate(null);
        }}
        employees={employees}
        initialData={editingChecklistTemplate ? (() => {
          const recurrenceDays = Array.isArray(editingChecklistTemplate.recurrenceDays) 
            ? editingChecklistTemplate.recurrenceDays 
            : (editingChecklistTemplate.recurrenceDays ? [editingChecklistTemplate.recurrenceDays] : []);
          
          return {
            name: editingChecklistTemplate.name,
            description: editingChecklistTemplate.description,
            items: editingChecklistTemplate.items,
            recurrence: editingChecklistTemplate.recurrence || "daily",
            recurrence_days: recurrenceDays,
            assigned_to_id: editingChecklistTemplate.defaultAssignedToId,
          };
        })() : undefined}
        onSubmit={async (data: ChecklistFormData) => {
          if (!token) return;
          
          try {
            if (editingChecklistTemplate) {
              // Mode édition
              await updateChecklistTemplate(token, editingChecklistTemplate.id, {
                name: data.name,
                description: data.description,
                items: data.items,
                recurrence: data.recurrence,
                recurrenceDays: data.recurrence_days,
                defaultAssignedToId: data.assigned_to_id,
              });
            } else {
              // Mode création
              await createChecklistTemplate(token, {
                name: data.name,
                description: data.description || "",
                items: data.items,
                recurrence: data.recurrence,
                recurrenceDays: data.recurrence_days,
                isActive: true,
                defaultAssignedToId: data.assigned_to_id,
              });
            }
            
            // Recharger les données après création/modification
            await loadData();
            
            setIsChecklistModalOpen(false);
            setEditingChecklistTemplate(null);
          } catch (err: any) {
            console.error(`Erreur lors de la ${editingChecklistTemplate ? 'modification' : 'création'} de la checklist:`, err);
            setError(err.message || `Erreur lors de la ${editingChecklistTemplate ? 'modification' : 'création'} de la checklist`);
          }
        }}
      />

      {/* Modal de détails/édition d'une tâche depuis le calendrier */}
      {selectedTaskForDetails && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setSelectedTaskForDetails(null)}
          />
          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="bg-white rounded-lg shadow-xl p-6 pointer-events-auto w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#0F172A]">Détails de la tâche</h2>
                <button
                  onClick={() => setSelectedTaskForDetails(null)}
                  className="text-[#64748B] hover:text-[#0F172A]"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Afficher TaskCard en mode édition */}
              <TaskCard
                id={selectedTaskForDetails.id}
                title={selectedTaskForDetails.title}
                description={(selectedTaskForDetails as any).description}
                assignedTo={selectedTaskForDetails.assignedTo || "Non assigné"}
                assignedToId={(selectedTaskForDetails as any).assignedToId}
                category={selectedTaskForDetails.type || "Interne"}
                priority={normalizeTaskPriority((selectedTaskForDetails as any).priority) || "normal"}
                dueDate={selectedTaskForDetails.dueDate || ""}
                dueDateRaw={(selectedTaskForDetails as any).dueDateRaw}
                status={(selectedTaskForDetails.status === "Terminée" ? "Terminé" : selectedTaskForDetails.status) as "À faire" | "En cours" | "Terminé" | "En retard"}
                isLate={selectedTaskForDetails.status === "En retard"}
                comment={(selectedTaskForDetails as any).description}
                employees={employees}
                clientId={(selectedTaskForDetails as any).clientId}
                clientInfo={getClientInfo((selectedTaskForDetails as any).clientId)}
                projectId={(selectedTaskForDetails as any).projectId}
                projectName={(selectedTaskForDetails as any).projectName}
                onToggleComplete={async (id) => {
                  await handleToggleComplete(id);
                  await loadData();
                  // Recharger la tâche sélectionnée
                  const allTasksForUpdate = [...tasks, ...todayTasks, ...Object.values(priorityTasksData).flat()];
                  const updatedTask = allTasksForUpdate.find(t => t.id === id);
                  if (updatedTask) setSelectedTaskForDetails(updatedTask);
                }}
                onUpdate={async (id, updates) => {
                  await handleUpdateTask(id, updates);
                  await loadData();
                  // Recharger la tâche sélectionnée
                  const allTasksForUpdate = [...tasks, ...todayTasks, ...Object.values(priorityTasksData).flat()];
                  const updatedTask = allTasksForUpdate.find(t => t.id === id);
                  if (updatedTask) setSelectedTaskForDetails(updatedTask);
                }}
                onDelete={async (id) => {
                  await handleDeleteTask(id);
                  setSelectedTaskForDetails(null);
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* Modal de confirmation pour décocher une tâche */}
      {showUncompleteConfirm && (
        <>
          {/* Overlay noir */}
          <div 
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setShowUncompleteConfirm(false)}
          />
          {/* Modal centré au milieu de l'écran */}
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="bg-white rounded-lg shadow-xl p-4 text-center pointer-events-auto w-64"
            >
              <p className="text-xs text-[#64748B] mb-3">
                Décocher cette tâche ?
              </p>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-2 py-1.5 rounded-lg text-xs mb-3">
                  {error}
                </div>
              )}
              
              <div className="flex justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowUncompleteConfirm(false);
                    setTaskToUncomplete(null);
                    setError(null);
                  }}
                  className="text-xs px-3 py-1"
                >
                  Annuler
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={confirmUncompleteTask}
                  className="text-xs px-3 py-1"
                >
                  Décocher
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de confirmation pour supprimer un modèle de routine */}
      {showDeleteTemplateConfirm && (
        <>
          {/* Overlay noir */}
          <div 
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setShowDeleteTemplateConfirm(false)}
          />
          {/* Modal centré au milieu de l'écran */}
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="bg-white rounded-lg shadow-xl p-4 text-center pointer-events-auto w-64"
            >
              <p className="text-xs text-[#64748B] mb-3">
                Supprimer ce modèle de routine ?
              </p>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-2 py-1.5 rounded-lg text-xs mb-3">
                  {error}
                </div>
              )}
              
              <div className="flex justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowDeleteTemplateConfirm(false);
                    setTemplateToDelete(null);
                    setError(null);
                  }}
                  className="text-xs px-3 py-1"
                >
                  Annuler
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={confirmDeleteTemplate}
                  className="text-xs px-3 py-1"
                >
                  Supprimer
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal de sélection multiple */}
      <RecurringTasksModal
        isOpen={showRecurringTasksModal}
        onClose={() => setShowRecurringTasksModal(false)}
        tasks={allTasks as any}
        templates={templates}
        onDeleteAllOccurrences={handleDeleteAllOccurrences}
        onDeleteTask={async (taskId: number) => {
          if (!token) return;
          try {
            await deleteTaskAPI(token, taskId);
            await loadData();
          } catch (err: any) {
            console.error("Erreur lors de la suppression de la tâche:", err);
            throw err;
          }
        }}
      />

      {/* Modal de confirmation pour supprimer une tâche */}
      {showDeleteConfirm && (
        <>
          {/* Overlay noir */}
          <div 
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setShowDeleteConfirm(false)}
          />
          {/* Modal centré au milieu de l'écran */}
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="bg-white rounded-lg shadow-xl p-4 text-center pointer-events-auto w-64"
            >
              <p className="text-xs text-[#64748B] mb-3">
                Supprimer cette tâche ?
              </p>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-2 py-1.5 rounded-lg text-xs mb-3">
                  {error}
                </div>
              )}
              
              <div className="flex justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setTaskToDelete(null);
                    setError(null);
                  }}
                  className="text-xs px-3 py-1"
                >
                  Annuler
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={confirmDeleteTask}
                  className="text-xs px-3 py-1"
                >
                  Supprimer
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </PageTransition>
  );
}
