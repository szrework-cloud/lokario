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
          <p className="text-xs text-[#64748B] mt-2">Slug: {slug}</p>
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
              <div className="text-sm text-[#64748B] mb-4">
                Type sélectionné : <span className="font-medium text-[#0F172A]">{selectedType.name}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {availableDates.map((date, index) => (
                  <button
                    key={index}
                    onClick={() => handleDateSelect(date)}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      date.toDateString() === selectedDate.toDateString()
                        ? "border-[#F97316] bg-[#F97316]/5"
                        : "border-[#E5E7EB] hover:border-[#F97316]/50"
                    }`}
                  >
                    <div className="text-xs text-[#64748B]">
                      {date.toLocaleDateString("fr-FR", { weekday: "short" })}
                    </div>
                    <div className="font-semibold text-[#0F172A] mt-1">
                      {date.getDate()}
                    </div>
                    <div className="text-xs text-[#64748B]">
                      {date.toLocaleDateString("fr-FR", { month: "short" })}
                    </div>
                  </button>
                ))}
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
              <div className="text-sm text-[#64748B] mb-4">
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {availableSlots.map((slot, index) => (
                    <button
                      key={index}
                      onClick={() => handleSlotSelect(slot)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedSlot?.start.getTime() === slot.start.getTime()
                          ? "border-[#F97316] bg-[#F97316]/5"
                          : "border-[#E5E7EB] hover:border-[#F97316]/50"
                      }`}
                    >
                      <div className="font-semibold text-[#0F172A]">
                        {formatTimeForDisplay(slot.start)}
                      </div>
                      {slot.employeeName && (
                        <div className="text-xs text-[#64748B] mt-1">
                          {slot.employeeName}
                        </div>
                      )}
                    </button>
                  ))}
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

