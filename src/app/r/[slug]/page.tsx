"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { AppointmentType, Appointment } from "@/components/appointments/types";
import { mockAppointmentTypes, mockEmployees } from "@/components/appointments/mockData";
import { calculateAvailableSlots, formatDateForDisplay, formatTimeForDisplay } from "@/components/appointments/utils";
import { Card, CardContent } from "@/components/ui/Card";

// Mock : récupérer les RDV existants (à remplacer par API)
const mockExistingAppointments: Appointment[] = [];

export default function PublicBookingPage() {
  const params = useParams();
  const slug = params.slug as string;

  // Debug: vérifier que la page est bien chargée
  console.log("[PublicBookingPage] Page loaded with slug:", slug);

  const [step, setStep] = useState<"type" | "date" | "slot" | "form" | "confirmation">("type");
  const [selectedType, setSelectedType] = useState<AppointmentType | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date; employeeId?: number; employeeName?: string } | null>(null);
  const [clientInfo, setClientInfo] = useState({ name: "", email: "", phone: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtrer uniquement les types actifs
  const availableTypes = useMemo(() => {
    return mockAppointmentTypes.filter((type) => type.isActive);
  }, []);

  // Calculer les créneaux disponibles
  const availableSlots = useMemo(() => {
    if (!selectedType) return [];

    return calculateAvailableSlots(
      selectedType,
      mockExistingAppointments,
      mockEmployees,
      selectedDate
    );
  }, [selectedType, selectedDate]);

  const handleTypeSelect = (type: AppointmentType) => {
    setSelectedType(type);
    setStep("date");
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setStep("slot");
  };

  const handleSlotSelect = (slot: { start: Date; end: Date; employeeId?: number; employeeName?: string }) => {
    setSelectedSlot(slot);
    setStep("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !selectedSlot) return;

    setIsSubmitting(true);
    try {
      // TODO: Appel API pour créer le RDV
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simuler l'appel API
      
      console.log("Create appointment:", {
        slug,
        type: selectedType.name,
        date: selectedSlot.start,
        client: clientInfo,
      });

      setStep("confirmation");
    } catch (error) {
      console.error("Error creating appointment:", error);
      alert("Erreur lors de la réservation. Veuillez réessayer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Générer les dates disponibles (30 prochains jours)
  const availableDates = useMemo(() => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, []);

  // Si pas de slug, afficher un message d'erreur
  if (!slug) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F97316]/10 via-white to-[#EA580C]/10 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#0F172A] mb-2">Slug manquant</h1>
          <p className="text-[#64748B]">Veuillez fournir un slug valide dans l'URL</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F97316]/10 via-white to-[#EA580C]/10">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#0F172A] mb-2">Prendre rendez-vous</h1>
          <p className="text-[#64748B]">Réservez votre créneau en quelques clics</p>
        </div>

        {/* Étape 1 : Sélection du type */}
        {step === "type" && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-[#0F172A] mb-4">
                Choisissez le type de rendez-vous
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleTypeSelect(type)}
                    className="p-6 rounded-lg border-2 border-[#E5E7EB] hover:border-[#F97316] hover:shadow-md transition-all text-left"
                  >
                    <div className="font-semibold text-[#0F172A] text-lg">{type.name}</div>
                    {type.description && (
                      <div className="text-sm text-[#64748B] mt-1">{type.description}</div>
                    )}
                    <div className="text-sm text-[#64748B] mt-2">
                      Durée : {type.durationMinutes} minutes
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étape 2 : Sélection de la date */}
        {step === "date" && selectedType && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#0F172A]">
                  Choisissez une date
                </h2>
                <button
                  onClick={() => setStep("type")}
                  className="text-sm text-[#64748B] hover:text-[#0F172A]"
                >
                  ← Retour
                </button>
              </div>
              <div className="text-sm text-[#64748B] mb-6">
                Type sélectionné : <span className="font-medium text-[#0F172A]">{selectedType.name}</span>
              </div>
              
              {/* Calendrier structuré */}
              <div className="border border-[#E5E7EB] rounded-lg p-4 bg-white">
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {/* En-têtes des jours */}
                  {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
                    <div key={day} className="text-center text-xs font-semibold text-[#64748B] py-2">
                      {day}
                    </div>
                  ))}
                  
                  {/* Jours du calendrier */}
                  {(() => {
                    const today = new Date();
                    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    const startDate = new Date(firstDayOfMonth);
                    startDate.setDate(startDate.getDate() - startDate.getDay() + (startDate.getDay() === 0 ? -6 : 1)); // Premier lundi
                    
                    const calendarDays: Date[] = [];
                    const currentDate = new Date(startDate);
                    
                    // Générer 42 jours (6 semaines)
                    for (let i = 0; i < 42; i++) {
                      calendarDays.push(new Date(currentDate));
                      currentDate.setDate(currentDate.getDate() + 1);
                    }
                    
                    return calendarDays.map((date, index) => {
                      const isToday = date.toDateString() === today.toDateString();
                      const isSelected = date.toDateString() === selectedDate.toDateString();
                      const isPast = date < today && !isToday;
                      const isCurrentMonth = date.getMonth() === today.getMonth();
                      const isAvailable = availableDates.some(d => d.toDateString() === date.toDateString());
                      
                      return (
                        <button
                          key={index}
                          onClick={() => {
                            if (!isPast && isAvailable) {
                              handleDateSelect(date);
                            }
                          }}
                          disabled={isPast || !isAvailable}
                          className={`
                            p-2 rounded-lg text-sm transition-all
                            ${isSelected 
                              ? "bg-[#F97316] text-white font-semibold" 
                              : isToday
                              ? "bg-[#F97316]/10 text-[#F97316] font-semibold border-2 border-[#F97316]"
                              : isPast || !isAvailable
                              ? "text-[#D1D5DB] cursor-not-allowed"
                              : isCurrentMonth
                              ? "text-[#0F172A] hover:bg-[#F97316]/10 hover:border hover:border-[#F97316]/50"
                              : "text-[#9CA3AF] hover:bg-[#F9FAFB]"
                            }
                          `}
                        >
                          {date.getDate()}
                        </button>
                      );
                    });
                  })()}
                </div>
                
                {/* Légende */}
                <div className="flex items-center justify-center gap-4 text-xs text-[#64748B] mt-4 pt-4 border-t border-[#E5E7EB]">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-[#F97316]"></div>
                    <span>Date sélectionnée</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-[#F97316]/10 border-2 border-[#F97316]"></div>
                    <span>Aujourd'hui</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Étape 3 : Sélection du créneau */}
        {step === "slot" && selectedType && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#0F172A]">
                  Choisissez un créneau
                </h2>
                <button
                  onClick={() => setStep("date")}
                  className="text-sm text-[#64748B] hover:text-[#0F172A]"
                >
                  ← Retour
                </button>
              </div>
              <div className="text-sm text-[#64748B] mb-6">
                {selectedType.name} - {formatDateForDisplay(selectedDate)}
              </div>
              {availableSlots.length === 0 ? (
                <div className="p-8 text-center border border-[#E5E7EB] rounded-lg bg-[#F9FAFB]">
                  <p className="text-[#64748B]">
                    Aucun créneau disponible pour cette date. Veuillez choisir une autre date.
                  </p>
                  <button
                    onClick={() => setStep("date")}
                    className="mt-4 text-[#F97316] hover:text-[#EA580C] font-medium"
                  >
                    Choisir une autre date
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Grouper les créneaux par employé */}
                  {(() => {
                    const slotsByEmployee = availableSlots.reduce((acc, slot) => {
                      const employeeKey = slot.employeeId || "default";
                      if (!acc[employeeKey]) {
                        acc[employeeKey] = {
                          employeeName: slot.employeeName || "Disponible",
                          slots: [],
                        };
                      }
                      acc[employeeKey].slots.push(slot);
                      return acc;
                    }, {} as Record<string | number, { employeeName: string; slots: typeof availableSlots }>);

                    return Object.entries(slotsByEmployee).map(([employeeKey, { employeeName, slots }]) => (
                      <div key={employeeKey} className="space-y-2">
                        {Object.keys(slotsByEmployee).length > 1 && (
                          <label className="block text-sm font-medium text-[#0F172A] mb-2">
                            {employeeName}
                          </label>
                        )}
                        <select
                          value={selectedSlot?.start.getTime() === slots.find(s => s.start.getTime() === selectedSlot?.start.getTime())?.start.getTime() ? selectedSlot.start.getTime().toString() : ""}
                          onChange={(e) => {
                            const selectedTime = parseInt(e.target.value);
                            const slot = slots.find(s => s.start.getTime() === selectedTime);
                            if (slot) {
                              handleSlotSelect(slot);
                            }
                          }}
                          className="w-full rounded-lg border border-[#E5E7EB] px-4 py-3 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1 bg-white"
                        >
                          <option value="">Sélectionnez une heure</option>
                          {slots.map((slot, index) => (
                            <option key={index} value={slot.start.getTime()}>
                              {formatTimeForDisplay(slot.start)} - {formatTimeForDisplay(slot.end)}
                            </option>
                          ))}
                        </select>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Étape 4 : Formulaire client */}
        {step === "form" && selectedType && selectedSlot && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#0F172A]">
                  Vos informations
                </h2>
                <button
                  onClick={() => setStep("slot")}
                  className="text-sm text-[#64748B] hover:text-[#0F172A]"
                >
                  ← Retour
                </button>
              </div>
              <div className="mb-6 p-4 bg-[#F9FAFB] rounded-lg">
                <div className="text-sm text-[#64748B]">
                  <p><strong>Type :</strong> {selectedType.name}</p>
                  <p><strong>Date :</strong> {formatDateForDisplay(selectedSlot.start)}</p>
                  <p><strong>Heure :</strong> {formatTimeForDisplay(selectedSlot.start)}</p>
                  {selectedSlot.employeeName && (
                    <p><strong>Avec :</strong> {selectedSlot.employeeName}</p>
                  )}
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    value={clientInfo.name}
                    onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={clientInfo.email}
                    onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#0F172A] mb-1">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    value={clientInfo.phone}
                    onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-6 py-3 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Réservation en cours..." : "Confirmer la réservation"}
                </button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Étape 5 : Confirmation */}
        {step === "confirmation" && selectedType && selectedSlot && (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-[#0F172A] mb-2">
                  Réservation confirmée !
                </h2>
                <p className="text-[#64748B]">
                  Votre rendez-vous a été enregistré avec succès.
                </p>
              </div>
              <div className="p-6 bg-[#F9FAFB] rounded-lg text-left max-w-md mx-auto">
                <div className="space-y-2 text-sm">
                  <p><strong className="text-[#0F172A]">Type :</strong> {selectedType.name}</p>
                  <p><strong className="text-[#0F172A]">Date :</strong> {formatDateForDisplay(selectedSlot.start)}</p>
                  <p><strong className="text-[#0F172A]">Heure :</strong> {formatTimeForDisplay(selectedSlot.start)}</p>
                  {selectedSlot.employeeName && (
                    <p><strong className="text-[#0F172A]">Avec :</strong> {selectedSlot.employeeName}</p>
                  )}
                  <p><strong className="text-[#0F172A]">Client :</strong> {clientInfo.name}</p>
                  <p><strong className="text-[#0F172A]">Email :</strong> {clientInfo.email}</p>
                </div>
              </div>
              <p className="text-xs text-[#64748B] mt-6">
                Un email de confirmation vous a été envoyé à {clientInfo.email}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

