"use client";

import { useState, useEffect } from "react";
import { PageTitle } from "@/components/layout/PageTitle";
import { TasksTable, Task } from "@/components/tasks/TasksTable";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskRow } from "@/components/dashboard/TaskRow";
import { StatCard } from "@/components/dashboard/StatCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { CreateTaskModal, TaskFormData } from "@/components/tasks/CreateTaskModal";
import { CreateChecklistModal, ChecklistFormData } from "@/components/tasks/CreateChecklistModal";
import { NotificationsDropdown } from "@/components/tasks/NotificationsDropdown";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

type PriorityTask = {
  id: number;
  title: string;
  description?: string;
  type: string;
  priority: "urgent" | "high" | "medium" | "low" | "critical";
  dueDate: string;
  dueTime?: string;
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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"today" | "priorities" | "tasks" | "checklists">("today");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isChecklistModalOpen, setIsChecklistModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"employee" | "admin">("employee");
  const [employeeFilter, setEmployeeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Protection : forcer "today" si user est employé
  useEffect(() => {
    if (user?.role === "user" && activeTab !== "today") {
      setActiveTab("today");
    }
  }, [user?.role, activeTab]);

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

  // TODO: Récupérer depuis le backend
  const mockEmployees = [
    { id: 1, name: "Jean Dupont", avatar: "JD" },
    { id: 2, name: "Marie Martin", avatar: "MM" },
    { id: 3, name: "Sophie Durand", avatar: "SD" },
    { id: 4, name: "Pierre Bernard", avatar: "PB" },
  ];

  const mockTasks: Task[] = [
    {
      id: 1,
      title: "Vérifier stock farine",
      assignedTo: "Marie",
      type: "Interne",
      dueDate: "Aujourd'hui",
      status: "À faire",
    },
    {
      id: 2,
      title: "Relancer Mme Dupont",
      assignedTo: "Jean",
      type: "Client",
      dueDate: "Aujourd'hui",
      status: "À faire",
    },
    {
      id: 3,
      title: "Commande fournisseur boissons",
      assignedTo: "Sophie",
      type: "Fournisseur",
      dueDate: "Cette semaine",
      status: "En cours",
    },
    {
      id: 4,
      title: "Nettoyage salle",
      assignedTo: "Pierre",
      type: "Interne",
      dueDate: "Hier",
      status: "En retard",
    },
    {
      id: 5,
      title: "Préparer devis pour nouveau client",
      assignedTo: "Marie",
      type: "Client",
      dueDate: "Demain",
      status: "À faire",
    },
  ];

  const priorityTasks: PriorityTask[] = [
    {
      id: 1,
      title: "Relancer facture impayée - Boulangerie Soleil",
      description: "Facture #2025-014 en retard de 5 jours",
      type: "Client",
      priority: "critical",
      dueDate: "Aujourd'hui",
      dueTime: "09:00",
      assignedTo: "Jean",
      assignedToAvatar: "JD",
      status: "À faire",
      isLate: true,
    },
    {
      id: 2,
      title: "Nettoyage salle - En retard",
      type: "Interne",
      priority: "high",
      dueDate: "Hier",
      assignedTo: "Pierre",
      assignedToAvatar: "PB",
      status: "En retard",
      isLate: true,
    },
    {
      id: 3,
      title: "Préparer devis pour nouveau client",
      type: "Client",
      priority: "high",
      dueDate: "Aujourd'hui",
      dueTime: "14:00",
      assignedTo: "Marie",
      assignedToAvatar: "MM",
      status: "À faire",
    },
    {
      id: 4,
      title: "Commande fournisseur boissons",
      type: "Fournisseur",
      priority: "medium",
      dueDate: "Cette semaine",
      assignedTo: "Sophie",
      assignedToAvatar: "SD",
      status: "En cours",
    },
    {
      id: 5,
      title: "Vérifier stock farine",
      type: "Interne",
      priority: "medium",
      dueDate: "Aujourd'hui",
      dueTime: "10:00",
      assignedTo: "Marie",
      assignedToAvatar: "MM",
      status: "À faire",
    },
    {
      id: 6,
      title: "Mise à jour catalogue produits",
      type: "Interne",
      priority: "low",
      dueDate: "Cette semaine",
      assignedTo: "Jean",
      assignedToAvatar: "JD",
      status: "À faire",
    },
  ];

  const mockActiveChecklists: Checklist[] = [
    {
      id: 1,
      templateId: 1,
      templateName: "Ouverture",
      completedItems: 3,
      totalItems: 5,
      status: "en_cours",
      startedAt: "2025-01-20T08:00:00",
      executionTime: "08:00",
    },
    {
      id: 2,
      templateId: 2,
      templateName: "Fermeture",
      completedItems: 0,
      totalItems: 5,
      status: "en_cours",
      startedAt: "2025-01-20T18:00:00",
      executionTime: "18:00",
    },
  ];

  const todayTasks = mockTasks.filter((t) => t.dueDate === "Aujourd'hui");
  const lateTasks = mockTasks.filter((t) => t.status === "En retard");
  const todayChecklists = mockActiveChecklists.filter((c) => {
    const startDate = new Date(c.startedAt);
    return startDate.toDateString() === today.toDateString();
  });

  const mockTemplates: ChecklistTemplate[] = [
    {
      id: 1,
      name: "Ouverture",
      description: "Checklist quotidienne d'ouverture",
      items: [
        "Vérifier les stocks",
        "Allumer les équipements",
        "Vérifier la caisse",
        "Nettoyer les vitrines",
        "Préparer les produits",
      ],
      recurrence: "daily",
      executionTime: "08:00",
    },
    {
      id: 2,
      name: "Fermeture",
      description: "Checklist quotidienne de fermeture",
      items: [
        "Fermer la caisse",
        "Ranger les produits",
        "Éteindre les équipements",
        "Nettoyer les surfaces",
        "Fermer les portes",
      ],
      recurrence: "daily",
      executionTime: "18:00",
    },
    {
      id: 3,
      name: "Nettoyage",
      description: "Checklist de nettoyage hebdomadaire",
      items: [
        "Nettoyer les sols",
        "Nettoyer les vitrines",
        "Nettoyer les équipements",
        "Vider les poubelles",
        "Désinfecter les surfaces",
      ],
      recurrence: "weekly",
    },
    {
      id: 4,
      name: "Routine matinale",
      description: "Tâches de routine du matin",
      items: [
        "Vérifier les emails",
        "Planifier la journée",
        "Préparer les rendez-vous",
        "Vérifier les stocks",
      ],
      recurrence: "daily",
      executionTime: "09:00",
    },
  ];

  const mockChecklistHistory = [
    {
      id: 1,
      date: "2025-01-19",
      employee: "Marie Martin",
      executionTime: "08:15",
      result: "complète",
      comments: "Tout s'est bien passé",
    },
    {
      id: 2,
      date: "2025-01-19",
      employee: "Jean Dupont",
      executionTime: "18:20",
      result: "incomplète",
      comments: "Manque le nettoyage des vitrines",
    },
    {
      id: 3,
      date: "2025-01-18",
      employee: "Sophie Durand",
      executionTime: "08:05",
      result: "complète",
      comments: "",
    },
  ];

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

  const groupedTasks = {
    critical: priorityTasks.filter((t) => t.priority === "critical"),
    urgent: priorityTasks.filter((t) => t.priority === "urgent"),
    high: priorityTasks.filter((t) => t.priority === "high"),
    medium: priorityTasks.filter((t) => t.priority === "medium"),
    low: priorityTasks.filter((t) => t.priority === "low"),
  };

  // Générer les tâches à partir des checklists actives
  const checklistTasks = todayChecklists.flatMap((checklist) => {
    const template = mockTemplates.find((t) => t.id === checklist.templateId);
    if (!template) return [];

    return template.items.map((item, index) => {
      const isCompleted = index < checklist.completedItems;
      return {
        id: checklist.id * 1000 + index,
        title: item,
        assignedTo: mockEmployees[0]?.name || "Non assigné",
        type: "Routine" as const,
        dueDate: "Aujourd'hui",
        dueTime: checklist.executionTime,
        status: (isCompleted ? "Terminé" : "À faire") as "À faire" | "En cours" | "Terminé" | "En retard",
        origin: "checklist" as const,
        checklistName: checklist.templateName,
      };
    });
  });

  // Combiner toutes les tâches
  const allTasks = [
    ...mockTasks.map((t) => ({ ...t, origin: "manual" as const, checklistName: undefined as string | undefined })),
    ...checklistTasks,
  ];

  const filteredTasks = allTasks.filter((task) => {
    if (employeeFilter !== "all" && task.assignedTo !== employeeFilter) return false;
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
    const todayTasksCount = todayTasks.length;
    const lateTasksCount = lateTasks.length;
    const checklistsCount = todayChecklists.length;

    const rightContent = (
      <div className="flex items-center gap-3">
        <NotificationsDropdown
          notifications={notifications}
          onMarkAsRead={handleMarkNotificationAsRead}
          onMarkAllAsRead={handleMarkAllNotificationsAsRead}
        />
      </div>
    );

    if (activeTab === "today") {
      return {
        title: "Aujourd'hui",
        subtitle: formattedDate,
        badge: `${todayTasksCount} tâches • ${lateTasksCount} en retard • ${checklistsCount} checklist${checklistsCount > 1 ? "s" : ""}`,
        rightContent,
      };
    }

    return {
      title: activeTab === "priorities" ? "Priorités" : activeTab === "tasks" ? "Toutes les tâches" : "Modèles de routines",
      subtitle: activeTab === "checklists" ? "Vos routines internes" : undefined,
      rightContent,
    };
  };

  const header = getHeaderContent();

  // Actions communes pour toutes les pages (en haut à droite)
  const pageActions = (
    <div className="flex items-center gap-3">
      {(user?.role === "super_admin" || user?.role === "owner") && (
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-[#64748B]">Employé</span>
          <input
            type="checkbox"
            checked={viewMode === "admin"}
            onChange={(e) => setViewMode(e.target.checked ? "admin" : "employee")}
            className="rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
          />
          <span className="text-sm text-[#64748B]">Admin</span>
        </label>
      )}
      {activeTab === "checklists" ? (
        <button
          onClick={() => setIsChecklistModalOpen(true)}
          className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
        >
          + Ajouter une checklist
        </button>
      ) : (
        <button
          onClick={() => setIsTaskModalOpen(true)}
          className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
        >
          + Ajouter une tâche
        </button>
      )}
    </div>
  );


  return (
    <>
      <PageTitle
        title={header.title}
        subtitle={header.subtitle}
        rightContent={header.rightContent}
      />
      <div className="space-y-6">
        {/* Header avec badge pour Aujourd'hui */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A]">{header.title}</h1>
            {header.subtitle && (
              <p className="mt-2 text-[#64748B]">{header.subtitle}</p>
            )}
            {activeTab === "today" && header.badge && (
              <div className="mt-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#F97316] text-white">
                  {header.badge}
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
              {mockEmployees.map((emp) => (
                <option key={emp.id} value={emp.name}>
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
            {(user?.role === "super_admin" || user?.role === "owner") && (
              <>
                <button
                  onClick={() => setActiveTab("priorities")}
                  className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors ${
                    activeTab === "priorities"
                      ? "border-[#F97316] text-[#F97316]"
                      : "border-transparent text-[#64748B] hover:border-[#FDBA74] hover:text-[#F97316]"
                  }`}
                >
                  Priorités
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
              </>
            )}
          </nav>
        </div>

        {/* Contenu selon l'onglet actif */}
        {activeTab === "today" && (
          <div className="space-y-8">
            {/* Actions en haut à droite */}
            <div className="flex justify-end">
              {pageActions}
            </div>

            {/* VUE SIMPLE POUR EMPLOYÉS */}
            {user?.role === "user" ? (
              <div className="space-y-4">
                {/* Liste simple des tâches */}
                {[...todayTasks, ...checklistTasks].length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-[#64748B]">Aucune tâche pour aujourd'hui</p>
                    </CardContent>
                  </Card>
                ) : (
                  [...todayTasks, ...checklistTasks].map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-4 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={task.status === "Terminé" || task.status === "Terminée"}
                        onChange={() => console.log("Toggle:", task.id)}
                        className="w-5 h-5 rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316] cursor-pointer"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#0F172A]">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {"dueTime" in task && task.dueTime && (
                            <span className="text-xs text-[#64748B]">🕐 {task.dueTime}</span>
                          )}
                          {"origin" in task && task.origin === "checklist" && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Routine
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* VUE COMPLÈTE POUR ADMIN/OWNER */
              <>
                {/* SECTION 1 — Tâches en retard (prioritaire) */}
                {lateTasks.length > 0 && (
                  <SectionCard
                    title="⚠️ En retard"
                  >
                    <div className="space-y-3">
                      {lateTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          id={task.id}
                          title={task.title}
                          assignedTo={task.assignedTo || "Non assigné"}
                          category={task.type || "Interne"}
                          priority="high"
                          dueDate={task.dueDate}
                          status={(task.status === "Terminée" ? "Terminé" : task.status) as "À faire" | "En cours" | "Terminé" | "En retard"}
                          isLate={true}
                          onViewDetails={(id) => console.log("View details:", id)}
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
                        {todayTasks.length} tâches
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select className="text-xs rounded border border-[#E5E7EB] px-2 py-1 text-[#64748B]">
                        <option>Par heure</option>
                        <option>Par priorité</option>
                        <option>Par catégorie</option>
                      </select>
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
                    {todayTasks.map((task) => {
                      const priorityTask = priorityTasks.find((pt) => pt.title === task.title);
                      return (
                        <TaskCard
                          key={task.id}
                          id={task.id}
                          title={task.title}
                          assignedTo={task.assignedTo || "Non assigné"}
                          assignedToAvatar={priorityTask?.assignedToAvatar}
                          category={task.type || "Interne"}
                          priority={(priorityTask?.priority === "urgent" ? "high" : priorityTask?.priority) || "medium"}
                          dueDate={task.dueDate}
                          dueTime={("dueTime" in task && typeof task.dueTime === "string" ? task.dueTime : undefined) || priorityTask?.dueTime}
                          status={(task.status === "Terminée" ? "Terminé" : task.status) as "À faire" | "En cours" | "Terminé" | "En retard"}
                          onToggleComplete={(id) => console.log("Toggle:", id)}
                          onViewDetails={(id) => console.log("View:", id)}
                          onAddComment={(id) => console.log("Comment:", id)}
                        />
                      );
                    })}
                  </div>
                  </SectionCard>
                </div>

                {/* SECTION 3 — Tâches générées par checklists (routines) */}
                {todayChecklists.length > 0 && (
                  <SectionCard title="Tâches des routines">
                    <div className="space-y-3">
                      {todayChecklists.flatMap((checklist) => {
                        const template = mockTemplates.find((t) => t.id === checklist.templateId);
                        if (!template) return [];

                        return template.items.map((item, index) => {
                          const isCompleted = index < checklist.completedItems;
                          return (
                            <div key={`${checklist.id}-${index}`} className="relative">
                              <TaskCard
                                id={checklist.id * 1000 + index}
                                title={item}
                                assignedTo={mockEmployees[0]?.name || "Non assigné"}
                                category="Routine"
                                priority="medium"
                                dueDate="Aujourd'hui"
                                dueTime={checklist.executionTime}
                                status={isCompleted ? "Terminé" : "À faire"}
                                onToggleComplete={(id) => console.log("Toggle checklist item:", id)}
                                onViewDetails={(id) => console.log("View:", id)}
                              />
                              <div className="absolute top-2 right-2">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                  {checklist.templateName}
                                </span>
                              </div>
                            </div>
                          );
                        });
                      })}
                    </div>
                  </SectionCard>
                )}

                {/* SECTION 4 — Statistiques rapides */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold text-[#0F172A] mb-2">Progression</h3>
                      <p className="text-2xl font-bold text-[#0F172A]">
                        {mockTasks.filter((t) => t.status === "Terminée").length} / {mockTasks.length}
                      </p>
                      <p className="text-xs text-[#64748B] mt-1">tâches terminées</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold text-[#0F172A] mb-2">Routines</h3>
                      <p className="text-2xl font-bold text-[#0F172A]">
                        {todayChecklists.length}
                      </p>
                      <p className="text-xs text-[#64748B] mt-1">routines actives aujourd'hui</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold text-[#0F172A] mb-2">Alerte</h3>
                      <p className="text-lg font-bold text-red-600">
                        {lateTasks.length} tâche{lateTasks.length > 1 ? "s" : ""} critique{lateTasks.length > 1 ? "s" : ""} non faite{lateTasks.length > 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-[#64748B] mt-1">Action requise</p>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "priorities" && (
          <div className="space-y-6">
            {/* Actions en haut à droite */}
            <div className="flex justify-end">
              {pageActions}
            </div>
            {/* Filtres */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setPriorityFilter("critical")}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  priorityFilter === "critical"
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-red-200 bg-red-50 text-red-800 hover:bg-red-100"
                }`}
              >
                Critique
              </button>
              <button
                onClick={() => setPriorityFilter("high")}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  priorityFilter === "high"
                    ? "border-orange-600 bg-orange-600 text-white"
                    : "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100"
                }`}
              >
                Important
              </button>
              <button
                onClick={() => setPriorityFilter("urgent")}
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                  priorityFilter === "urgent"
                    ? "border-yellow-600 bg-yellow-600 text-white"
                    : "border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-100"
                }`}
              >
                Urgent
              </button>
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              >
                <option value="all">Assigné à</option>
                {mockEmployees.map((emp) => (
                  <option key={emp.id} value={emp.name}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* SECTION 1 — Tâches Critiques */}
            {groupedTasks.critical.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                        Critique
                      </span>
                      <h2 className="text-lg font-semibold text-[#0F172A]">
                        {groupedTasks.critical.length} tâche{groupedTasks.critical.length > 1 ? "s" : ""}
                      </h2>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {groupedTasks.critical.map((task) => (
                      <div
                        key={task.id}
                        className="p-4 rounded-lg border border-red-200 bg-red-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xl">🔥</span>
                              <h3 className="text-sm font-semibold text-[#0F172A]">
                                {task.title}
                              </h3>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-200 text-red-800">
                                Doit être fait aujourd'hui
                              </span>
                            </div>
                            {task.description && (
                              <p className="text-xs text-[#64748B] mb-2">{task.description}</p>
                            )}
                            <div className="flex items-center gap-3 text-xs text-[#64748B]">
                              <span>Deadline: {("dueTime" in task && task.dueTime) || task.dueDate}</span>
                              <span>•</span>
                              <span>Assigné à: {task.assignedTo}</span>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            className="mt-1 rounded border-[#E5E7EB] text-[#F97316] focus:ring-[#F97316]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SECTION 2 — Tâches Importantes */}
            {groupedTasks.high.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                      Important
                    </span>
                    <h2 className="text-lg font-semibold text-[#0F172A]">
                      {groupedTasks.high.length} tâche{groupedTasks.high.length > 1 ? "s" : ""}
                    </h2>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {groupedTasks.high.map((task) => (
                      <TaskCard
                        key={task.id}
                        id={task.id}
                        title={task.title}
                        description={task.description}
                        assignedTo={task.assignedTo}
                        assignedToAvatar={task.assignedToAvatar}
                        category={task.type}
                        priority="high"
                        dueDate={task.dueDate}
                        dueTime={"dueTime" in task ? task.dueTime : undefined}
                        status={task.status as any}
                        onViewDetails={(id) => console.log("View:", id)}
                        onAddComment={(id) => console.log("Comment:", id)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SECTION 3 — À faire rapidement */}
            {groupedTasks.urgent.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 border border-yellow-200">
                      Urgent
                    </span>
                    <h2 className="text-lg font-semibold text-[#0F172A]">
                      {groupedTasks.urgent.length} tâche{groupedTasks.urgent.length > 1 ? "s" : ""}
                    </h2>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {groupedTasks.urgent.map((task) => (
                      <TaskCard
                        key={task.id}
                        id={task.id}
                        title={task.title}
                        assignedTo={task.assignedTo}
                        category={task.type}
                        priority="high"
                        dueDate={task.dueDate}
                        dueTime={"dueTime" in task ? task.dueTime : undefined}
                        status={task.status as "À faire" | "En cours" | "Terminé" | "En retard"}
                        onViewDetails={(id) => console.log("View:", id)}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SECTION 4 — Alerte Admin */}
            {(user?.role === "super_admin" || user?.role === "owner") && viewMode === "admin" && (
              <Card className="border-orange-300 bg-orange-50">
                <CardHeader>
                  <h2 className="text-lg font-semibold text-[#0F172A]">⚠️ Alerte Admin</h2>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p className="text-[#64748B]">
                      • {mockTasks.filter((t) => t.status === "À faire").length} tâches où aucun employé n'a commencé
                    </p>
                    <p className="text-[#64748B]">
                      • {todayChecklists.filter((c) => c.status === "en_cours").length} checklist{todayChecklists.filter((c) => c.status === "en_cours").length > 1 ? "s" : ""} non complétée{todayChecklists.filter((c) => c.status === "en_cours").length > 1 ? "s" : ""}
                    </p>
                    <p className="text-[#64748B]">
                      • {lateTasks.length} délai{lateTasks.length > 1 ? "s" : ""} dépassé{lateTasks.length > 1 ? "s" : ""}
                    </p>
                    <p className="text-[#64748B]">
                      • {mockTasks.filter((t) => t.status === "À faire" && t.type === "Interne").length} tâches obligatoires non validées
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {priorityTasks.length === 0 && (
              <Card>
                <EmptyState
                  title="Aucune tâche prioritaire"
                  description="Toutes vos tâches sont à jour !"
                  icon="✅"
                />
              </Card>
            )}
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="space-y-6">
            {/* Actions en haut à droite */}
            <div className="flex justify-end">
              {pageActions}
            </div>
            {/* Barre de recherche et filtres */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une tâche..."
                  className="flex-1 rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                />
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="À faire">À faire</option>
                  <option value="En cours">En cours</option>
                  <option value="Terminé">Terminé</option>
                  <option value="En retard">En retard</option>
                </select>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                >
                  <option value="all">Toutes les catégories</option>
                  <option value="Interne">Interne</option>
                  <option value="Client">Client</option>
                  <option value="Fournisseur">Fournisseur</option>
                  <option value="Routine">Routine</option>
                </select>
                <select
                  value={employeeFilter}
                  onChange={(e) => setEmployeeFilter(e.target.value)}
                  className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                >
                  <option value="all">Tous les employés</option>
                  {mockEmployees.map((emp) => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name}
                    </option>
                  ))}
                </select>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                >
                  <option value="all">Toutes les priorités</option>
                  <option value="critical">Critique</option>
                  <option value="high">Haute</option>
                  <option value="medium">Moyenne</option>
                  <option value="low">Faible</option>
                </select>
                <select
                  value={originFilter}
                  onChange={(e) => setOriginFilter(e.target.value)}
                  className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                >
                  <option value="all">Toutes les origines</option>
                  <option value="manual">Manuel</option>
                  <option value="checklist">Généré par checklist</option>
                </select>
              </div>
            </div>

            {/* Stats Admin */}
            {(user?.role === "super_admin" || user?.role === "owner") && (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-[#64748B] mb-1">Total</p>
                    <p className="text-xl font-bold text-[#0F172A]">{allTasks.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-[#64748B] mb-1">Complétées</p>
                    <p className="text-xl font-bold text-green-600">
                      {allTasks.filter((t) => t.status === "Terminé" || t.status === "Terminée").length}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-[#64748B] mb-1">En retard</p>
                    <p className="text-xl font-bold text-red-600">
                      {allTasks.filter((t) => t.status === "En retard").length}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-[#64748B] mb-1">Générées par checklist</p>
                    <p className="text-xl font-bold text-[#0F172A]">
                      {allTasks.filter((t) => "origin" in t && t.origin === "checklist").length}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Liste complète */}
            {filteredTasks.length === 0 ? (
              <Card>
                <EmptyState
                  title="Aucune tâche trouvée"
                  description="Aucune tâche ne correspond à vos filtres."
                  icon="📋"
                />
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => {
                  const priorityTask = priorityTasks.find((pt) => pt.title === task.title);
                  const isFromChecklist = "origin" in task && task.origin === "checklist";
                  
                  return (
                    <div key={task.id} className="relative">
                      <TaskCard
                        id={task.id}
                        title={task.title}
                        assignedTo={task.assignedTo || "Non assigné"}
                        assignedToAvatar={priorityTask?.assignedToAvatar}
                        category={task.type || "Interne"}
                        priority={(priorityTask?.priority === "urgent" ? "high" : priorityTask?.priority) || "medium"}
                        dueDate={task.dueDate}
                        dueTime={("dueTime" in task ? task.dueTime : undefined) || priorityTask?.dueTime}
                        status={(task.status === "Terminée" ? "Terminé" : task.status) as "À faire" | "En cours" | "Terminé" | "En retard"}
                        isLate={task.status === "En retard"}
                        onToggleComplete={(id) => console.log("Toggle:", id)}
                        onViewDetails={(id) => console.log("View:", id)}
                        onAddComment={(id) => console.log("Comment:", id)}
                      />
                      {isFromChecklist && task.checklistName && (
                        <div className="absolute top-2 right-2">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            Généré par checklist : {task.checklistName}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Archivage */}
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold text-[#0F172A]">Tâches archivées</h3>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[#64748B]">
                  Historique complet des 30-60 derniers jours
                </p>
                <button className="mt-3 text-sm text-[#F97316] hover:text-[#EA580C]">
                  Voir l'historique →
                </button>
              </CardContent>
            </Card>
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
              <p className="mt-1 text-xs text-[#64748B] italic">
                ⚠️ Cette page est réservée aux administrateurs. Les employés voient les tâches générées dans "Aujourd'hui".
              </p>
            </div>

            {/* Liste des modèles */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mockTemplates.map((template) => (
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
                      {template.executionTime && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#64748B]">Heure</span>
                          <span className="font-medium text-[#0F172A]">{template.executionTime}</span>
                        </div>
                      )}
                    </div>
                    {(user?.role === "super_admin" || user?.role === "owner") && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            console.log("Modifier checklist:", template);
                          }}
                          className="flex-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
                        >
                          Modifier
                        </button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Message si aucun modèle */}
            {mockTemplates.length === 0 && (
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
        onSubmit={async (data: TaskFormData) => {
          // TODO: Appel API pour créer la tâche
          console.log("Create task:", data);
          setIsTaskModalOpen(false);
        }}
      />

      <CreateChecklistModal
        isOpen={isChecklistModalOpen}
        onClose={() => setIsChecklistModalOpen(false)}
        onSubmit={async (data: ChecklistFormData) => {
          // TODO: Appel API pour créer la checklist
          console.log("Create checklist:", data);
          setIsChecklistModalOpen(false);
        }}
      />
    </>
  );
}
