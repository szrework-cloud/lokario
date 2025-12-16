"use client";

import { useState, useMemo, useEffect } from "react";
import { Appointment, AppointmentStatus } from "./types";
import { AppointmentDetailModal } from "./AppointmentDetailModal";
import { CreateAppointmentModal } from "./CreateAppointmentModal";
import { AppointmentsWeeklyCalendar } from "./AppointmentsWeeklyCalendar";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useAppointmentAutomation } from "./useAppointmentAutomation";
import { buildNoShowMessage, shouldSendNoShowMessage, markNoShowMessageSent } from "./automation";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import {
  getAppointments,
  createAppointment as createAppointmentAPI,
  updateAppointment as updateAppointmentAPI,
  getAppointmentSettings,
} from "@/services/appointmentsService";
import { getConversations, createConversation, addMessage } from "@/services/inboxService";
import { logger } from "@/lib/logger";

type TimeFilter = "today" | "week" | "all";
type StatusFilter = AppointmentStatus | "all";
type ViewMode = "calendar" | "list";

export function AppointmentsListView() {
  const { token } = useAuth();
  const { company } = useSettings(false);
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentSettings, setAppointmentSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les données
  useEffect(() => {
    const loadData = async () => {
      if (!token) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const [appointmentsData, settingsData] = await Promise.all([
          getAppointments(token),
          getAppointmentSettings(token),
        ]);
        
        setAppointments(appointmentsData);
        setAppointmentSettings(settingsData);
      } catch (err: any) {
        console.error("Erreur lors du chargement des rendez-vous:", err);
        setError(err.message || "Erreur lors du chargement des rendez-vous");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [token]);

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  // Utiliser le slug de la base de données, ou le générer depuis le nom si absent
  const companySlug = company?.slug 
    ? company.slug
    : (company?.name
        ? company.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
        : "mon-entreprise");

  // Automatisation des rappels
  useAppointmentAutomation({
    appointments: appointments,
    settings: appointmentSettings || {
      autoReminderEnabled: true,
      autoReminderOffsetHours: 4,
      includeRescheduleLinkInReminder: true,
      autoNoShowMessageEnabled: true,
      maxReminderRelances: 1,
      reminderRelances: [{
        id: 1,
        relance_number: 1,
        hours_before: 4,
        content: "Bonjour {client_name},\n\nNous vous rappelons votre rendez-vous prévu le {appointment_date} à {appointment_time}.\n\nÀ bientôt,\n{company_name}",
      }],
    },
    companySlug,
    onSendMessage: async (appointment, message, type) => {
      if (!token) return;
      
      try {
        // Trouver ou créer une conversation pour ce client
        let conversationId = appointment.clientConversationId;
        
        if (!conversationId) {
          // Chercher une conversation existante pour ce client
          const conversations = await getConversations(
            token,
            {
              source: "email", // Par défaut email, mais pourrait être sms/whatsapp selon les settings
            }
          );
          // Filtrer par clientId côté frontend
          const clientConversations = conversations.filter(conv => conv.clientId === appointment.clientId);
          
          if (clientConversations.length > 0) {
            // Utiliser la conversation la plus récente
            conversationId = clientConversations[0].id;
          } else {
            // Créer une nouvelle conversation
            const newConversation = await createConversation(
              {
                subject: `Rappel rendez-vous - ${appointment.typeName}`,
                status: "À répondre",
                source: "email", // Par défaut email
                clientId: appointment.clientId,
                firstMessage: {
                  fromName: "Système automatique",
                  fromEmail: undefined,
                  content: message,
                  source: "email",
                  isFromClient: false,
                },
              },
              token
            );
            conversationId = newConversation.id;
          }
        }
        
        // Envoyer le message dans la conversation
        await addMessage(
          conversationId,
          {
            fromName: "Système automatique",
            fromEmail: undefined,
            content: message,
            source: "email",
            isFromClient: false,
          },
          token
        );
        
        logger.log(`[Appointment Automation] ✅ ${type === "reminder" ? "Rappel" : "No show"} envoyé:`, {
          appointmentId: appointment.id,
          clientName: appointment.clientName,
          conversationId,
        });
      } catch (error: any) {
        console.error(`[Appointment Automation] ❌ Erreur lors de l'envoi du ${type === "reminder" ? "rappel" : "message no_show"}:`, error);
      }
    },
  });

  const handleCreateAppointment = async (newAppointment: Omit<Appointment, "id" | "createdAt" | "updatedAt">) => {
    if (!token) return;
    
    try {
      const appointment = await createAppointmentAPI(token, newAppointment);
      setAppointments((prev) => [...prev, appointment]);
      setIsCreateModalOpen(false);
      setError(null); // Réinitialiser l'erreur en cas de succès
    } catch (err: any) {
      console.error("Erreur lors de la création du rendez-vous:", err);
      // Message d'erreur plus spécifique pour les conflits
      if (err.message && err.message.includes("conflict")) {
        setError("Ce créneau n'est plus disponible. Veuillez choisir un autre horaire.");
      } else {
        setError(err.message || "Erreur lors de la création du rendez-vous");
      }
    }
  };

  const handleStatusChange = async (appointmentId: number, newStatus: AppointmentStatus) => {
    if (!token) return;
    
    try {
      await updateAppointmentAPI(token, appointmentId, { status: newStatus });
      setError(null); // Réinitialiser l'erreur en cas de succès
      
      // Mettre à jour le statut localement
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === appointmentId ? { ...apt, status: newStatus, updatedAt: new Date().toISOString() } : apt
        )
      );
      
      // Si no_show, déclencher l'automatisation immédiatement
      if (newStatus === "no_show") {
        const appointment = appointments.find((apt) => apt.id === appointmentId);
        if (appointment && appointmentSettings && shouldSendNoShowMessage(appointment, appointmentSettings)) {
          // Utiliser le slug de la base de données, ou le générer depuis le nom si absent
          const companySlug = company?.slug 
            ? company.slug
            : (company?.name
                ? company.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
                : "mon-entreprise");
          const message = buildNoShowMessage(appointment, appointmentSettings, companySlug);
          if (message && token) {
            markNoShowMessageSent(appointment.id);
            
            try {
              // Trouver ou créer une conversation pour ce client
              let conversationId = appointment.clientConversationId;
              
              if (!conversationId) {
              const conversations = await getConversations(
                token,
                {
                  source: "email",
                }
              );
              // Filtrer par clientId côté frontend
              const clientConversations = conversations.filter(conv => conv.clientId === appointment.clientId);
              
              if (clientConversations.length > 0) {
                conversationId = clientConversations[0].id;
                } else {
                  const newConversation = await createConversation(
                    {
                      subject: `Message no-show - ${appointment.typeName}`,
                      status: "À répondre",
                      source: "email",
                      clientId: appointment.clientId,
                      firstMessage: {
                        fromName: "Système automatique",
                        fromEmail: undefined,
                        content: message,
                        source: "email",
                        isFromClient: false,
                      },
                    },
                    token
                  );
                  conversationId = newConversation.id;
                }
              }
              
              // Envoyer le message
              await addMessage(
                conversationId,
                {
                  fromName: "Système automatique",
                  fromEmail: undefined,
                  content: message,
                  source: "email",
                  isFromClient: false,
                },
                token
              );
              
              logger.log("[Appointment Automation] ✅ Message no_show envoyé:", {
                appointmentId: appointment.id,
                clientName: appointment.clientName,
                conversationId,
              });
            } catch (error: any) {
              console.error("[Appointment Automation] ❌ Erreur lors de l'envoi du message no_show:", error);
            }
          }
        }
      }
    } catch (err: any) {
      console.error("Erreur lors de la mise à jour du statut:", err);
      setError(err.message || "Erreur lors de la mise à jour du statut");
    }
  };

  const handleQuickNoShow = (appointment: Appointment) => {
    handleStatusChange(appointment.id, "no_show");
  };

  const handleQuickCompleted = (appointment: Appointment) => {
    handleStatusChange(appointment.id, "completed");
  };

  // Filtrer les rendez-vous
  const filteredAppointments = useMemo(() => {
    let filtered = [...appointments];

    // Filtre temporel
    const now = new Date();
    if (timeFilter === "today") {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.startDateTime);
        return aptDate >= startOfDay && aptDate <= endOfDay;
      });
    } else if (timeFilter === "week") {
      const startOfWeek = new Date(now);
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(now);
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      endOfWeek.setHours(23, 59, 59, 999);
      filtered = filtered.filter((apt) => {
        const aptDate = new Date(apt.startDateTime);
        return aptDate >= startOfWeek && aptDate <= endOfWeek;
      });
    }

    // Filtre statut
    if (statusFilter !== "all") {
      filtered = filtered.filter((apt) => apt.status === statusFilter);
    }

    // Recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (apt) =>
          apt.clientName.toLowerCase().includes(query) ||
          apt.typeName.toLowerCase().includes(query) ||
          (apt.employeeName && apt.employeeName.toLowerCase().includes(query))
      );
    }

    // Trier par date (plus récent en premier)
    return filtered.sort((a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime());
  }, [timeFilter, statusFilter, searchQuery, appointments]);

  const getStatusBadge = (status: AppointmentStatus) => {
    const variants: Record<AppointmentStatus, { label: string; className: string }> = {
      scheduled: { label: "Programmé", className: "bg-blue-100 text-blue-800" },
      confirmed: { label: "Confirmé", className: "bg-green-100 text-green-800" },
      completed: { label: "Terminé", className: "bg-gray-100 text-gray-800" },
      cancelled: { label: "Annulé", className: "bg-red-100 text-red-800" },
      no_show: { label: "No show", className: "bg-orange-100 text-orange-800" },
      reschedule_requested: { label: "Reprogrammation", className: "bg-yellow-100 text-yellow-800" },
    };
    return variants[status];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-[#64748B]">Chargement des rendez-vous...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header avec bouton créer et toggle vue */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A]">Liste des rendez-vous</h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Toggle vue calendrier/liste */}
            <div className="flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-lg p-1">
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  viewMode === "calendar"
                    ? "bg-[#F97316] text-white"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                📅 Calendrier
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-[#F97316] text-white"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                📋 Liste
              </button>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
            >
              + Nouveau rendez-vous
            </button>
          </div>
        </div>

        {/* Filtres */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Recherche */}
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un client, un type..."
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                />
              </div>

              {/* Filtre temporel */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTimeFilter("today")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    timeFilter === "today"
                      ? "bg-[#F97316] text-white"
                      : "bg-white text-[#64748B] border border-[#E5E7EB] hover:bg-[#F9FAFB]"
                  }`}
                >
                  Aujourd'hui
                </button>
                <button
                  onClick={() => setTimeFilter("week")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    timeFilter === "week"
                      ? "bg-[#F97316] text-white"
                      : "bg-white text-[#64748B] border border-[#E5E7EB] hover:bg-[#F9FAFB]"
                  }`}
                >
                  Cette semaine
                </button>
                <button
                  onClick={() => setTimeFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    timeFilter === "all"
                      ? "bg-[#F97316] text-white"
                      : "bg-white text-[#64748B] border border-[#E5E7EB] hover:bg-[#F9FAFB]"
                  }`}
                >
                  Tous
                </button>
              </div>

              {/* Filtre statut */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-xs font-medium focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              >
                <option value="all">Tous les statuts</option>
                <option value="scheduled">Programmé</option>
                <option value="confirmed">Confirmé</option>
                <option value="completed">Terminé</option>
                <option value="cancelled">Annulé</option>
                <option value="no_show">No show</option>
                <option value="reschedule_requested">Reprogrammation</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Contenu selon le mode d'affichage */}
        {viewMode === "calendar" ? (
          <Card>
            <CardContent className="p-6">
              {filteredAppointments.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-[#64748B]">Aucun rendez-vous trouvé.</p>
                </div>
              ) : (
                <AppointmentsWeeklyCalendar
                  appointments={filteredAppointments}
                  onAppointmentClick={handleAppointmentClick}
                />
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-[#0F172A]">
                Liste des rendez-vous ({filteredAppointments.length})
              </h3>
            </CardHeader>
            <CardContent className="p-0">
              {filteredAppointments.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-[#64748B]">Aucun rendez-vous trouvé.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B]">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B]">Heure</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B]">Client</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B]">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B]">Employé</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B]">Statut</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB]">
                      {filteredAppointments.map((appointment) => {
                        const statusBadge = getStatusBadge(appointment.status);
                        return (
                          <tr
                            key={appointment.id}
                            className="hover:bg-[#F9FAFB] transition-colors"
                          >
                            <td className="px-4 py-3 text-sm text-[#0F172A]">{formatDate(appointment.startDateTime)}</td>
                            <td className="px-4 py-3 text-sm text-[#0F172A]">{formatTime(appointment.startDateTime)}</td>
                            <td className="px-4 py-3 text-sm font-medium text-[#0F172A]">{appointment.clientName}</td>
                            <td className="px-4 py-3 text-sm text-[#64748B]">{appointment.typeName}</td>
                            <td className="px-4 py-3 text-sm text-[#64748B]">{appointment.employeeName || "-"}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadge.className}`}>
                                {statusBadge.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleAppointmentClick(appointment)}
                                  className="text-xs text-[#F97316] hover:text-[#EA580C] font-medium"
                                >
                                  Voir
                                </button>
                                {appointment.status !== "no_show" && appointment.status !== "completed" && appointment.status !== "cancelled" && (
                                  <>
                                    <button
                                      onClick={() => handleQuickNoShow(appointment)}
                                      className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                                    >
                                      No show
                                    </button>
                                    <button
                                      onClick={() => handleQuickCompleted(appointment)}
                                      className="text-xs text-green-600 hover:text-green-700 font-medium"
                                    >
                                      Terminé
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <AppointmentDetailModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        onStatusChange={handleStatusChange}
      />

      <CreateAppointmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateAppointment}
        existingAppointments={appointments}
      />
    </>
  );
}

