"use client";

import { useState, useMemo } from "react";
import { Appointment } from "./types";
import { mockAppointments, mockAppointmentSettings } from "./mockData";
import { AppointmentDetailModal } from "./AppointmentDetailModal";
import { Card, CardContent } from "@/components/ui/Card";
import { useAppointmentAutomation } from "./useAppointmentAutomation";
import { buildNoShowMessage, shouldSendNoShowMessage, markNoShowMessageSent } from "./automation";

type ViewMode = "day" | "week";

export function AgendaView() {
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  // Automatisation des rappels
  useAppointmentAutomation({
    appointments: mockAppointments,
    settings: mockAppointmentSettings,
    onSendMessage: (appointment, message, type) => {
      console.log(`[Appointment Automation] ${type === "reminder" ? "Rappel" : "No show"} à envoyer:`, {
        appointmentId: appointment.id,
        clientName: appointment.clientName,
        message,
      });
      // TODO: Une fois l'API Inbox prête, créer le message ici
      // createInboxMessage({
      //   conversationId: appointment.clientConversationId,
      //   body: message,
      //   metadata: { source: `appointment_${type}`, appointmentId: appointment.id }
      // })
    },
  });

  const handleStatusChange = (appointmentId: number, newStatus: Appointment["status"]) => {
    // TODO: Appel API pour changer le statut
    console.log("Change status:", appointmentId, newStatus);
    
    // Si no_show, déclencher l'automatisation immédiatement
    if (newStatus === "no_show") {
      const appointment = mockAppointments.find((apt) => apt.id === appointmentId);
      if (appointment && shouldSendNoShowMessage(appointment, mockAppointmentSettings)) {
        const message = buildNoShowMessage(appointment, mockAppointmentSettings);
        if (message) {
          markNoShowMessageSent(appointment.id);
          console.log("[Appointment Automation] Message no_show généré:", {
            appointmentId: appointment.id,
            clientName: appointment.clientName,
            message,
          });
          // TODO: Une fois l'API Inbox prête, créer le message ici
          // createInboxMessage({
          //   conversationId: appointment.clientConversationId,
          //   body: message,
          //   metadata: { source: "appointment_no_show", appointmentId: appointment.id }
          // })
        }
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

    return mockAppointments.filter((apt) => {
      const aptDate = new Date(apt.startDateTime);
      return aptDate >= startOfDay && aptDate <= endOfDay;
    });
  }, [selectedDate, viewMode]);

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

  return (
    <>
      <div className="space-y-4">
        {/* Contrôles */}
        <div className="flex items-center justify-between">
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
    </>
  );
}

