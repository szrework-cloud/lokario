"use client";

import { useState, useEffect } from "react";
import { AppointmentType } from "./types";
import { AppointmentTypeModal } from "./AppointmentTypeModal";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import {
  getAppointmentTypes,
  createAppointmentType as createAppointmentTypeAPI,
  updateAppointmentType as updateAppointmentTypeAPI,
  deleteAppointmentType as deleteAppointmentTypeAPI,
} from "@/services/appointmentsService";
import { getCompanyUsers } from "@/services/usersService";

export function AppointmentTypesView() {
  const { token } = useAuth();
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [employees, setEmployees] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedType, setSelectedType] = useState<AppointmentType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les données
  useEffect(() => {
    const loadData = async () => {
      if (!token) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const [typesData, usersData] = await Promise.all([
          getAppointmentTypes(token),
          getCompanyUsers(token),
        ]);
        
        setTypes(typesData);
        setEmployees(usersData.map((u) => ({ id: u.id, name: u.full_name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email })));
      } catch (err: any) {
        console.error("Erreur lors du chargement des types de rendez-vous:", err);
        setError(err.message || "Erreur lors du chargement des types de rendez-vous");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [token]);

  const handleCreate = () => {
    setSelectedType(null);
    setIsModalOpen(true);
  };

  const handleEdit = (type: AppointmentType) => {
    setSelectedType(type);
    setIsModalOpen(true);
  };

  const handleSave = async (typeData: Omit<AppointmentType, "id">) => {
    if (!token) return;
    
    try {
      if (selectedType) {
        // Modifier
        const updated = await updateAppointmentTypeAPI(token, selectedType.id, typeData);
        setTypes((prev) =>
          prev.map((t) => (t.id === selectedType.id ? updated : t))
        );
      } else {
        // Créer
        const newType = await createAppointmentTypeAPI(token, typeData);
        setTypes((prev) => [...prev, newType]);
      }
      setIsModalOpen(false);
      setSelectedType(null);
    } catch (err: any) {
      console.error("Erreur lors de la sauvegarde du type:", err);
      setError(err.message || "Erreur lors de la sauvegarde du type");
    }
  };

  const handleToggleActive = async (typeId: number) => {
    if (!token) return;
    
    const type = types.find((t) => t.id === typeId);
    if (!type) return;
    
    try {
      const updated = await updateAppointmentTypeAPI(token, typeId, { isActive: !type.isActive });
      setTypes((prev) =>
        prev.map((t) => (t.id === typeId ? updated : t))
      );
    } catch (err: any) {
      console.error("Erreur lors de la mise à jour du type:", err);
      setError(err.message || "Erreur lors de la mise à jour du type");
    }
  };

  const getEmployeeNames = (employeeIds?: number[]) => {
    if (!employeeIds || employeeIds.length === 0) {
      return "Tous les employés";
    }
    return employeeIds
      .map((id) => employees.find((e) => e.id === id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-[#64748B]">Chargement des types de rendez-vous...</p>
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0F172A]">Types de rendez-vous</h2>
            <p className="text-sm text-[#64748B] mt-1">
              Gérez les différents types de rendez-vous proposés à vos clients.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
          >
            + Nouveau type de RDV
          </button>
        </div>

        {/* Liste */}
        {types.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-sm text-[#64748B]">Aucun type de rendez-vous créé.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {types.map((type) => (
              <Card key={type.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-[#0F172A]">{type.name}</h3>
                      {type.description && (
                        <p className="text-xs text-[#64748B] mt-1">{type.description}</p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        type.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {type.isActive ? "Actif" : "Inactif"}
                    </span>
                  </div>

                  <div className="space-y-1 mt-3 text-xs text-[#64748B]">
                    <p>Durée : {type.durationMinutes} min</p>
                    {type.bufferBeforeMinutes && (
                      <p>Buffer avant : {type.bufferBeforeMinutes} min</p>
                    )}
                    {type.bufferAfterMinutes && (
                      <p>Buffer après : {type.bufferAfterMinutes} min</p>
                    )}
                    <p className="mt-2">Employés : {getEmployeeNames(type.employeesAllowedIds)}</p>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#E5E7EB]">
                    <button
                      onClick={() => handleEdit(type)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleToggleActive(type.id)}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium ${
                        type.isActive
                          ? "bg-gray-100 text-gray-800 hover:bg-gray-200"
                          : "bg-green-100 text-green-800 hover:bg-green-200"
                      }`}
                    >
                      {type.isActive ? "Désactiver" : "Activer"}
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AppointmentTypeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedType(null);
        }}
        type={selectedType}
        onSave={handleSave}
      />
    </>
  );
}

