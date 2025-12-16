"use client";

import { useState, useMemo, useEffect } from "react";
import { Appointment } from "./types";
import { AppointmentDetailModal } from "./AppointmentDetailModal";
import { CreateAppointmentModal } from "./CreateAppointmentModal";
import { Card, CardContent } from "@/components/ui/Card";
import { useAppointmentAutomation } from "./useAppointmentAutomation";
import { buildNoShowMessage, shouldSendNoShowMessage, markNoShowMessageSent } from "./automation";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import {
  getAppointments,
  createAppointment as createAppointmentAPI,
  updateAppointment as updateAppointmentAPI,
  deleteAppointment as deleteAppointmentAPI,
  getAppointmentSettings,
} from "@/services/appointmentsService";
import { getConversations, createConversation, addMessage } from "@/services/inboxService";
import { logger } from "@/lib/logger";

type ViewMode = "day" | "week";

export function AgendaView() {
  const { token } = useAuth();
  const { company } = useSettings(false);
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(new Date());
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
        // Charger les rendez-vous et les settings séparément pour éviter qu'une erreur sur les settings bloque tout
        const appointmentsData = await getAppointments(token);
        setAppointments(appointmentsData);
        
        // Charger les settings avec gestion d'erreur séparée
        try {
          const settingsData = await getAppointmentSettings(token);
          setAppointmentSettings({
            ...settingsData,
            rescheduleBaseUrl: settingsData.rescheduleBaseUrl || (typeof window !== "undefined" ? `${window.location.origin}/r/{slugEntreprise}` : "https://lokario.fr/r/{slugEntreprise}"),
          });
        } catch (settingsError: any) {
          console.warn("Erreur lors du chargement des paramètres de rendez-vous, utilisation des valeurs par défaut:", settingsError);
          // Utiliser les valeurs par défaut si les settings ne peuvent pas être chargés
          setAppointmentSettings({
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
          });
        }
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
          // Filtrer par clientId côté frontend (l'API ne supporte pas encore clientId directement)
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

  const handleStatusChange = async (appointmentId: number, newStatus: Appointment["status"]) => {
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

  // Filtrer les rendez-vous selon la vue
  const filteredAppointments = useMemo(() => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(selectedDate);
    if (viewMode === "day") {
      endOfDay.setHours(23, 59, 59, 999);
    } else {
      // Semaine : 7 jours
      endOfDay.setDate(endOfDay.getDate() + 7);
      endOfDay.setHours(23, 59, 59, 999);
    }

    return appointments.filter((apt) => {
      const aptDate = new Date(apt.startDateTime);
      return aptDate >= startOfDay && aptDate <= endOfDay;
    });
  }, [selectedDate, viewMode, appointments]);

  // Grouper par jour pour la vue semaine
  const appointmentsByDay = useMemo(() => {
    if (viewMode === "day") {
      return { [selectedDate.toDateString()]: filteredAppointments };
    }

    const grouped: Record<string, Appointment[]> = {};
    filteredAppointments.forEach((apt) => {
      const date = new Date(apt.startDateTime);
      const dayKey = date.toDateString();
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push(apt);
    });
    return grouped;
  }, [filteredAppointments, viewMode, selectedDate]);

  const getStatusBadge = (status: Appointment["status"]) => {
    const variants: Record<Appointment["status"], { label: string; className: string }> = {
      scheduled: { label: "Programmé", className: "bg-blue-100 text-blue-800" },
      confirmed: { label: "Confirmé", className: "bg-green-100 text-green-800" },
      completed: { label: "Terminé", className: "bg-gray-100 text-gray-800" },
      cancelled: { label: "Annulé", className: "bg-red-100 text-red-800" },
      no_show: { label: "No show", className: "bg-orange-100 text-orange-800" },
      reschedule_requested: { label: "Reprogrammation", className: "bg-yellow-100 text-yellow-800" },
    };
    return variants[status];
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
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
        {/* Contrôles */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
          >
            + Nouveau rendez-vous
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("day")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "day"
                  ? "bg-[#F97316] text-white"
                  : "bg-white text-[#64748B] border border-[#E5E7EB] hover:bg-[#F9FAFB]"
              }`}
            >
              Jour
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === "week"
                  ? "bg-[#F97316] text-white"
                  : "bg-white text-[#64748B] border border-[#E5E7EB] hover:bg-[#F9FAFB]"
              }`}
            >
              Semaine
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newDate = new Date(selectedDate);
                if (viewMode === "day") {
                  newDate.setDate(newDate.getDate() - 1);
                } else {
                  newDate.setDate(newDate.getDate() - 7);
                }
                setSelectedDate(newDate);
              }}
              className="p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB]"
            >
              ←
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-4 py-2 rounded-lg border border-[#E5E7EB] text-sm font-medium hover:bg-[#F9FAFB]"
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => {
                const newDate = new Date(selectedDate);
                if (viewMode === "day") {
                  newDate.setDate(newDate.getDate() + 1);
                } else {
                  newDate.setDate(newDate.getDate() + 7);
                }
                setSelectedDate(newDate);
              }}
              className="p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB]"
            >
              →
            </button>
          </div>
        </div>

        {/* Vue Jour */}
        {viewMode === "day" && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-[#0F172A] mb-4">
                {formatDate(selectedDate)}
              </h3>
              {filteredAppointments.length === 0 ? (
                <p className="text-sm text-[#64748B]">Aucun rendez-vous prévu ce jour.</p>
              ) : (
                <div className="space-y-3">
                  {filteredAppointments
                    .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
                    .map((appointment) => {
                      const statusBadge = getStatusBadge(appointment.status);
                      return (
                        <div
                          key={appointment.id}
                          onClick={() => handleAppointmentClick(appointment)}
                          className="p-4 rounded-lg border border-[#E5E7EB] bg-white hover:border-[#F97316] hover:shadow-sm cursor-pointer transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-[#0F172A]">
                                  {formatTime(appointment.startDateTime)} - {formatTime(appointment.endDateTime)}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                                  {statusBadge.label}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-[#0F172A]">{appointment.clientName}</p>
                              <p className="text-xs text-[#64748B]">{appointment.typeName}</p>
                              {appointment.employeeName && (
                                <p className="text-xs text-[#64748B] mt-1">Avec {appointment.employeeName}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Vue Semaine */}
        {viewMode === "week" && (
          <div className="space-y-4">
            {Object.entries(appointmentsByDay)
              .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
              .map(([dateKey, appointments]) => {
                const date = new Date(dateKey);
                return (
                  <Card key={dateKey}>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold text-[#0F172A] mb-4">
                        {formatDate(date)}
                      </h3>
                      {appointments.length === 0 ? (
                        <p className="text-sm text-[#64748B]">Aucun rendez-vous prévu ce jour.</p>
                      ) : (
                        <div className="space-y-3">
                          {appointments
                            .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime())
                            .map((appointment) => {
                              const statusBadge = getStatusBadge(appointment.status);
                              return (
                                <div
                                  key={appointment.id}
                                  onClick={() => handleAppointmentClick(appointment)}
                                  className="p-4 rounded-lg border border-[#E5E7EB] bg-white hover:border-[#F97316] hover:shadow-sm cursor-pointer transition-all"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-medium text-[#0F172A]">
                                          {formatTime(appointment.startDateTime)} - {formatTime(appointment.endDateTime)}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                                          {statusBadge.label}
                                        </span>
                                      </div>
                                      <p className="text-sm font-semibold text-[#0F172A]">{appointment.clientName}</p>
                                      <p className="text-xs text-[#64748B]">{appointment.typeName}</p>
                                      {appointment.employeeName && (
                                        <p className="text-xs text-[#64748B] mt-1">Avec {appointment.employeeName}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
          </div>
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
        initialDate={selectedDate}
        existingAppointments={appointments}
      />
    </>
  );
}

