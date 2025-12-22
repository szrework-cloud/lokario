"use client";

import { PageTitle } from "@/components/layout/PageTitle";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { TaskRow } from "@/components/dashboard/TaskRow";
import { KpiCard } from "@/components/reporting/KpiCard";
import { BarChart } from "@/components/reporting/BarChart";
import { Card, CardContent } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardStats, useTodayTasks } from "@/hooks/queries/useDashboard";
import { PageTransition } from "@/components/ui/PageTransition";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getTasks, Task } from "@/services/tasksService";

export default function DashboardPage() {
  const { user, token } = useAuth();
  
  // Utiliser React Query pour charger les données avec cache automatique
  const { data: stats, isLoading: isLoadingStats, error: statsError } = useDashboardStats();
  const { data: todayTasks = [], isLoading: isLoadingTasks } = useTodayTasks();
  const { data: allTasks = [], isLoading: isLoadingAllTasks } = useQuery<Task[]>({
    queryKey: ["tasks", "all"],
    queryFn: () => getTasks(token, {}),
    enabled: !!token,
    staleTime: 1000 * 60 * 1,
  });

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

  const isLoading = isLoadingStats || isLoadingTasks || isLoadingAllTasks;

  // Formater les valeurs pour l'affichage
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculer la variation pour les KPIs
  const getTrend = (current: number, previous: number): "up" | "down" | "neutral" => {
    if (current > previous) return "up";
    if (current < previous) return "down";
    return "neutral";
  };

  // Formater la date pour l'affichage des tâches
  const formatTaskDate = (dateString?: string, dateRaw?: string) => {
    // Utiliser dateRaw (ISO) si disponible, sinon parser dateString
    const dateToParse = dateRaw || dateString;
    if (!dateToParse) return "Aujourd'hui";
    
    let taskDate: Date;
    try {
      // Si c'est déjà formaté DD/MM/YYYY, utiliser dateRaw à la place
      if (dateRaw) {
        // Parser la date ISO
        if (dateRaw.includes('T')) {
          const dateOnly = dateRaw.split('T')[0];
          const [year, month, day] = dateOnly.split('-').map(Number);
          taskDate = new Date(year, month - 1, day);
        } else {
          const [year, month, day] = dateRaw.split('-').map(Number);
          taskDate = new Date(year, month - 1, day);
        }
      } else {
        taskDate = new Date(dateToParse);
      }
      
      // Vérifier si la date est valide
      if (isNaN(taskDate.getTime())) {
        return dateString || "Aujourd'hui";
      }
      
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      taskDate.setHours(0, 0, 0, 0);
      
      if (taskDate.getTime() === todayDate.getTime()) {
        return "Aujourd'hui";
      }
      
      const tomorrow = new Date(todayDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (taskDate.getTime() === tomorrow.getTime()) {
        return "Demain";
      }
      
      return taskDate.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    } catch (e) {
      // En cas d'erreur, retourner la date formatée directement si disponible
      return dateString || "Aujourd'hui";
    }
  };

  // Formater l'heure
  const formatTime = (timeString?: string) => {
    if (!timeString) return undefined;
    return timeString.substring(0, 5); // HH:MM
  };

  // Mapper le type de tâche
  const getTaskTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      CLIENT: "Client",
      INTERNE: "Interne",
      FOURNISSEUR: "Fournisseur",
    };
    return typeMap[type] || type;
  };

  // Convertir les tâches API en format frontend (même logique que dans tasks/page.tsx)
  const convertTaskToFrontend = (task: Task): any => ({
    id: task.id,
    title: task.title,
    description: task.description,
    assignedTo: task.assignedTo,
    assignedToId: task.assignedToId,
    assignedToAvatar: task.assignedToAvatar,
    type: task.type as any,
    category: task.type,
    priority: task.priority as any,
    dueDate: task.dueDate || "",
    dueDateRaw: task.dueDateRaw,
    status: task.status as any,
    clientId: task.clientId,
    clientName: task.clientName,
    projectId: task.projectId,
    projectName: task.projectName,
    conversationId: task.conversationId,
    origin: task.origin as "manual" | "checklist" | undefined,
    checklistName: (task as any).checklistName,
    isLate: task.isLate,
    checklistTemplateId: (task as any).checklistTemplateId,
    checklistTemplateName: (task as any).checklistTemplateName,
    checklistInstanceId: (task as any).checklistInstanceId,
    isChecklistItem: (task as any).isChecklistItem,
    recurrence: (task as any).recurrence,
    recurrenceDays: (task as any).recurrenceDays,
  });

  // Fonction pour vérifier si une date correspond à aujourd'hui (même logique que dans tasks/page.tsx)
  const isToday = (task: any): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    if (task.dueDateRaw) {
      try {
        const dateStr = task.dueDateRaw;
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
    
    const dateStr = task.dueDate;
    if (!dateStr) return false;
    if (dateStr === "Aujourd'hui") return true;
    
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
    
    try {
      const taskDate = new Date(dateStr);
      taskDate.setHours(0, 0, 0, 0);
      const taskKey = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, '0')}-${String(taskDate.getDate()).padStart(2, '0')}`;
      return taskKey === todayKey;
    } catch {
      return false;
    }
  };

  // Reproduire exactement la même logique que dans tasks/page.tsx
  const frontendTasks = allTasks.map(convertTaskToFrontend);
  const frontendTodayTasks = todayTasks.map(convertTaskToFrontend);

  // Combiner toutes les tâches (dédupliquer par ID)
  const allTasksMap = new Map<number, any>();
  
  frontendTasks.forEach((t) => {
    allTasksMap.set(t.id, { 
      ...t, 
      origin: "manual" as any,
      checklistName: undefined as any,
      recurrence: t.recurrence,
      recurrenceDays: t.recurrenceDays,
    });
  });

  frontendTodayTasks.forEach((t) => {
    allTasksMap.set(t.id, { 
      ...t, 
      origin: (t.origin || "manual") as any,
      recurrence: t.recurrence,
      recurrenceDays: t.recurrenceDays,
    });
  });
  
  // Filtrer les tâches d'aujourd'hui (même logique que dans tasks/page.tsx)
  const allTasksToday = Array.from(allTasksMap.values()).filter((t) => {
    if (user?.role === "user") {
      const isAssigned = t.assignedToId === user?.id;
      return isAssigned;
    }
    const isTodayTask = isToday(t);
    const isLate = t.status === "En retard";
    return isTodayTask || isLate;
  });
  
  // Appliquer le même filtre final que todayTasksFiltered dans tasks/page.tsx
  const todayTasksFiltered = allTasksToday.filter((t) => {
    // Exclure les tâches en retard
    if (t.status === "En retard") return false;
    // Exclure aussi les tâches dont la date d'échéance est passée (sauf si terminées)
    const statusStr = String(t.status);
    if (statusStr.includes("Termin")) return true;
    try {
      const dueDateRaw = t.dueDateRaw;
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

  // Affichage du loading avec skeletons
  if (isLoading || !stats) {
    return (
      <>
        <PageTitle title="Dashboard" subtitle={`${formattedDate}`} />
        <div className="space-y-6 animate-fade-in">
          <CardSkeleton />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </>
    );
  }

  // Gestion des erreurs
  if (statsError) {
    return (
      <>
        <PageTitle title="Dashboard" subtitle={`${formattedDate}`} />
        <div className="space-y-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <p className="text-red-600">
                Erreur lors du chargement des données. Veuillez réessayer.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <PageTransition>
      <PageTitle title="Dashboard" subtitle={`${formattedDate}`} />
      <div className="space-y-6">
        {/* Temps gagné - Section principale */}
        <Card className="bg-gradient-to-br from-[#F97316]/10 via-white to-[#EA580C]/10 border-2 border-[#F97316]/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-[#0F172A] mb-1">
                  Temps gagné
                </h2>
                <p className="text-sm text-[#64748B]">
                  {stats.time_saved.description}
                </p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold text-[#F97316] mb-1">
                  {stats.time_saved.total.hours}h {stats.time_saved.total.minutes}min
                </div>
                <div className="text-xs text-[#64748B]">
                  Total {stats.time_saved.actual_days ? `(${stats.time_saved.actual_days} jour${stats.time_saved.actual_days > 1 ? 's' : ''})` : '(30 jours)'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#E5E7EB]">
              <div>
                <div className="text-sm text-[#64748B] mb-1">Cette semaine</div>
                <div className="text-2xl font-bold text-[#0F172A]">
                  {stats.time_saved.thisWeek.hours}h {stats.time_saved.thisWeek.minutes}min
                </div>
              </div>
              <div>
                <div className="text-sm text-[#64748B] mb-1">Ce mois</div>
                <div className="text-2xl font-bold text-[#0F172A]">
                  {stats.time_saved.thisMonth.hours}h {stats.time_saved.thisMonth.minutes}min
                </div>
              </div>
              <div>
                <div className="text-sm text-[#64748B] mb-1">Moyenne par jour</div>
                <div className="text-2xl font-bold text-[#0F172A]">
                  {stats.time_saved.actual_days 
                    ? Math.floor((stats.time_saved.total.hours * 60 + stats.time_saved.total.minutes) / stats.time_saved.actual_days)
                    : Math.floor((stats.time_saved.total.hours * 60 + stats.time_saved.total.minutes) / 30)}min
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Planning du jour */}
        <SectionCard
          title="Planning du jour"
          action={
            <Link
              href="/app/tasks"
              className="text-sm font-medium text-[#F97316] hover:text-[#EA580C]"
            >
              Voir tout →
            </Link>
          }
        >
          {todayTasksFiltered.length === 0 ? (
            <div className="text-center py-8 text-sm text-[#64748B]">
              Aucune tâche prévue aujourd'hui
            </div>
          ) : (
            <div className="space-y-0">
              {todayTasksFiltered.slice(0, 3).map((task) => (
                <TaskRow
                  key={task.id}
                  task={task.title}
                  type={getTaskTypeLabel(task.type) as "Interne" | "Client" | "Fournisseur"}
                  time=""
                />
              ))}
            </div>
          )}
        </SectionCard>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            title="Devis envoyés ce mois-ci"
            value={stats.quotes_sent_this_month}
            subtitle={
              stats.quotes_sent_last_month > 0
                ? `+${stats.quotes_sent_this_month - stats.quotes_sent_last_month} vs mois dernier`
                : "Ce mois-ci"
            }
            trend={getTrend(stats.quotes_sent_this_month, stats.quotes_sent_last_month)}
          />
          <KpiCard
            title="Devis acceptés"
            value={stats.quotes_accepted}
            subtitle={`${stats.quotes_accepted_rate.toFixed(1)}% de taux d'acceptation`}
            trend="up"
          />
          <KpiCard
            title="CA mensuel"
            value={formatCurrency(stats.monthly_revenue)}
            subtitle="Ce mois-ci"
            trend={getTrend(stats.monthly_revenue, stats.monthly_revenue_last_month)}
          />
          <KpiCard
            title="Factures en retard"
            value={stats.overdue_invoices_count}
            subtitle={`Total: ${formatCurrency(stats.overdue_invoices_amount)}`}
            trend={stats.overdue_invoices_count > 0 ? "down" : "neutral"}
          />
          <KpiCard
            title="Relances envoyées"
            value={stats.followups_sent_this_month}
            subtitle="Ce mois-ci"
            trend="neutral"
          />
          <KpiCard
            title="Tâches complétées"
            value={stats.tasks_completed_this_week}
            subtitle="Cette semaine"
            trend="up"
          />
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <BarChart
            title="Montants facturés par mois"
            data={stats.monthly_billing}
            valueLabel="€"
          />
          <BarChart
            title="Nombre de devis envoyés par semaine"
            data={stats.weekly_quotes}
            valueLabel="devis"
          />
        </div>

        {/* Actions rapides */}
        <SectionCard title="Actions rapides">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/app/tasks?modal=create"
              className="rounded-lg border border-[#E5E7EB] bg-white p-4 hover:bg-[#F9FAFB] transition-colors"
            >
              <h4 className="text-sm font-medium text-[#0F172A]">Créer une tâche</h4>
              <p className="mt-1 text-xs text-[#64748B]">Ajouter une nouvelle tâche</p>
            </Link>
            <Link
              href="/app/inbox"
              className="rounded-lg border border-[#E5E7EB] bg-white p-4 hover:bg-[#F9FAFB] transition-colors"
            >
              <h4 className="text-sm font-medium text-[#0F172A]">Voir l'Inbox</h4>
              <p className="mt-1 text-xs text-[#64748B]">Messages non lus</p>
            </Link>
            <Link
              href="/app/clients"
              className="rounded-lg border border-[#E5E7EB] bg-white p-4 hover:bg-[#F9FAFB] transition-colors"
            >
              <h4 className="text-sm font-medium text-[#0F172A]">Gérer les clients</h4>
              <p className="mt-1 text-xs text-[#64748B]">Voir tous les clients</p>
            </Link>
          </div>
        </SectionCard>
      </div>
    </PageTransition>
  );
}
