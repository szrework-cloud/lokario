"use client";

import { useState, useMemo } from "react";
import { Appointment, AppointmentStatus } from "./types";
import { mockAppointments } from "./mockData";
import { AppointmentDetailModal } from "./AppointmentDetailModal";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

type TimeFilter = "today" | "week" | "all";
type StatusFilter = AppointmentStatus | "all";

export function AppointmentsListView() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  const handleStatusChange = (appointmentId: number, newStatus: AppointmentStatus) => {
    // TODO: Appel API pour changer le statut
    console.log("Change status:", appointmentId, newStatus);
    
    // Si no_show, déclencher l'automatisation
    if (newStatus === "no_show") {
      // TODO: Appeler buildNoShowMessage et créer le message dans Inbox
      console.log("TODO: Envoyer message no_show dans Inbox");
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
    let filtered = [...mockAppointments];

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
  }, [timeFilter, statusFilter, searchQuery]);

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

  return (
    <>
      <div className="space-y-4">
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

        {/* Tableau */}
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

