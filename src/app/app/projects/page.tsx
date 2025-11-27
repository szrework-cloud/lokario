"use client";

import { useState, useMemo } from "react";
import { PageTitle } from "@/components/layout/PageTitle";
import { ProjectList } from "@/components/projects/ProjectList";
import { ProjectTimeline } from "@/components/projects/ProjectTimeline";
import { AddTimelineEventModal } from "@/components/projects/AddTimelineEventModal";
import { Project, ProjectHistoryEvent, TimelineEvent } from "@/components/projects/types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

export default function ProjectsPage() {
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);

  // TODO: Récupérer les projets depuis le backend
  const [statusFilter, setStatusFilter] = useState<"all" | "Nouveau" | "En cours" | "Terminé">("all");

  // Fonction pour ajouter un événement à l'historique
  const addHistoryEvent = (
    project: Project,
    action: string,
    description?: string
  ): ProjectHistoryEvent => {
    return {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      action,
      description,
      user: user?.full_name || user?.email || "Utilisateur",
    };
  };

  // Fonction pour ajouter un événement à la timeline
  const addTimelineEvent = (
    project: Project,
    title: string,
    description?: string
  ) => {
    return {
      title,
      date: new Date().toISOString().split("T")[0],
      description,
    };
  };

  const [mockProjects, setMockProjects] = useState<Project[]>([
    {
      id: 1,
      name: "Rénovation cuisine",
      client: "M. Martin",
      status: "En cours",
      startDate: "2025-01-10",
      endDate: "2025-02-15",
      previousStatus: "Nouveau",
      tasks: [
        { id: 1, title: "Devis envoyé", completed: true },
        { id: 2, title: "Facture initiale", completed: true },
        { id: 3, title: "Suivi travaux", completed: false },
      ],
      notes: "Client très satisfait, projet en avance.",
      timeline: [
        {
          title: "Devis envoyé",
          date: "2025-01-10",
          description: "Devis #2025-020 envoyé",
        },
        {
          title: "Facture payée",
          date: "2025-01-15",
          description: "Acompte de 50% reçu",
        },
        {
          title: "Relance envoyée",
          date: "2025-01-18",
          description: "Rappel pour la suite des travaux",
        },
      ],
      history: [
        {
          id: 1,
          timestamp: "2025-01-10T09:00:00",
          action: "Projet créé",
          user: "Jean Dupont",
        },
        {
          id: 2,
          timestamp: "2025-01-12T14:30:00",
          action: "Statut changé",
          description: "De 'Nouveau' à 'En cours'",
          user: "Marie Martin",
        },
        {
          id: 3,
          timestamp: "2025-01-15T10:15:00",
          action: "Note ajoutée",
          description: "Client très satisfait, projet en avance.",
          user: "Jean Dupont",
        },
      ],
    },
    {
      id: 2,
      name: "Installation équipement",
      client: "Boulangerie Soleil",
      status: "Nouveau",
      startDate: "2025-01-20",
      tasks: [
        { id: 1, title: "Devis en attente", completed: false },
      ],
    },
    {
      id: 3,
      name: "Projet beauté",
      client: "Mme Dupont",
      status: "Terminé",
      startDate: "2024-12-01",
      endDate: "2024-12-20",
    },
  ]);

  return (
    <>
      <PageTitle title="Dossiers / Projets" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A]">
              Dossiers / Projets
            </h1>
            <p className="mt-2 text-slate-600">
              Suivez vos dossiers et projets clients
            </p>
          </div>
          <button className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2">
            + Créer un projet
          </button>
        </div>

        {/* Filtres par statut */}
        {!selectedProject && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === "all"
                  ? "border-[#F97316] bg-[#F97316] text-white"
                  : "border-[#E5E7EB] bg-white text-[#0F172A] hover:bg-[#F9FAFB]"
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setStatusFilter("Nouveau")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === "Nouveau"
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
              }`}
            >
              Nouveau ({mockProjects.filter((p) => p.status === "Nouveau").length})
            </button>
            <button
              onClick={() => setStatusFilter("En cours")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === "En cours"
                  ? "border-orange-600 bg-orange-600 text-white"
                  : "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100"
              }`}
            >
              En cours ({mockProjects.filter((p) => p.status === "En cours").length})
            </button>
            <button
              onClick={() => setStatusFilter("Terminé")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === "Terminé"
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-green-200 bg-green-50 text-green-800 hover:bg-green-100"
              }`}
            >
              Terminé ({mockProjects.filter((p) => p.status === "Terminé").length})
            </button>
          </div>
        )}

        {!selectedProject ? (
          mockProjects.length === 0 ? (
            <Card>
              <EmptyState
                title="Aucun dossier/projet pour l'instant"
                description="Créez votre premier projet pour commencer à suivre vos dossiers clients."
                action={
                  <button className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2">
                    Créer un projet
                  </button>
                }
                icon="📁"
              />
            </Card>
          ) : (
            <ProjectList
              projects={
                statusFilter === "all"
                  ? mockProjects
                  : mockProjects.filter((p) => p.status === statusFilter)
              }
              onProjectClick={setSelectedProject}
            />
          )
        ) : (
          <div className="space-y-6">
            <button
              onClick={() => setSelectedProject(null)}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              ← Retour à la liste
            </button>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      {selectedProject.name}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {selectedProject.client}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedProject.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as "Nouveau" | "En cours" | "Terminé";
                        const oldStatus = selectedProject.status;
                        
                        // Mise à jour automatique de l'historique
                        const newHistoryEvent = addHistoryEvent(
                          selectedProject,
                          "Statut changé",
                          `De '${oldStatus}' à '${newStatus}'`
                        );
                        
                        // Mise à jour automatique de la timeline
                        const newTimelineEvent = addTimelineEvent(
                          selectedProject,
                          `Statut changé: ${newStatus}`,
                          `Le projet est maintenant ${newStatus.toLowerCase()}`
                        );

                        const updatedProject: Project = {
                          ...selectedProject,
                          status: newStatus,
                          previousStatus: oldStatus,
                          timeline: [
                            ...(selectedProject.timeline || []),
                            newTimelineEvent,
                          ],
                          history: [
                            ...(selectedProject.history || []),
                            newHistoryEvent,
                          ],
                        };

                        // Mettre à jour dans la liste des projets
                        setMockProjects((prev) =>
                          prev.map((p) =>
                            p.id === selectedProject.id ? updatedProject : p
                          )
                        );
                        
                        setSelectedProject(updatedProject);
                      }}
                      className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm font-medium focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    >
                      <option value="Nouveau">Nouveau</option>
                      <option value="En cours">En cours</option>
                      <option value="Terminé">Terminé</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Timeline */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-slate-700">
                      Timeline
                    </h3>
                    <button
                      onClick={() => setIsTimelineModalOpen(true)}
                      className="text-xs text-[#F97316] hover:text-[#EA580C] font-medium"
                    >
                      + Ajouter un événement
                    </button>
                  </div>
                  {selectedProject.timeline && selectedProject.timeline.length > 0 ? (
                    <ProjectTimeline
                      events={[...selectedProject.timeline].sort(
                        (a, b) =>
                          new Date(b.date).getTime() - new Date(a.date).getTime()
                      )}
                    />
                  ) : (
                    <p className="text-sm text-slate-500">
                      Aucun événement dans la timeline. Ajoutez-en un pour suivre l'avancement du projet.
                    </p>
                  )}
                </div>

                {/* Tâches liées */}
                {selectedProject.tasks && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-700 mb-3">
                      Tâches liées
                    </h3>
                    <div className="space-y-2">
                      {selectedProject.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-2 p-2 rounded border border-slate-200"
                        >
                          <input
                            type="checkbox"
                            checked={task.completed}
                            readOnly
                            className="rounded border-slate-300"
                          />
                          <Link
                            href={`/app/tasks?task=${task.id}`}
                            className={`text-sm hover:text-slate-600 ${
                              task.completed
                                ? "text-slate-500 line-through"
                                : "text-slate-900"
                            }`}
                          >
                            {task.title}
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Historique d'actions */}
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-3">
                    Historique des actions
                  </h3>
                  <div className="space-y-2">
                    {selectedProject.history && selectedProject.history.length > 0 ? (
                      // Trier par date décroissante (plus récent en premier)
                      [...selectedProject.history]
                        .sort(
                          (a, b) =>
                            new Date(b.timestamp).getTime() -
                            new Date(a.timestamp).getTime()
                        )
                        .map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50"
                          >
                            <div className="w-2 h-2 rounded-full bg-[#F97316] mt-2" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900">
                                {entry.action}
                              </p>
                              {entry.description && (
                                <p className="text-xs text-slate-600 mt-1">
                                  {entry.description}
                                </p>
                              )}
                              <p className="text-xs text-slate-500 mt-1">
                                {entry.user} •{" "}
                                {new Date(entry.timestamp).toLocaleString("fr-FR")}
                              </p>
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="text-sm text-slate-500">
                        Aucun historique pour l'instant.
                      </p>
                    )}
                  </div>
                </div>

                {/* Documents attachés */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-slate-700">
                      Documents attachés
                    </h3>
                    <button className="text-xs text-[#F97316] hover:text-[#EA580C]">
                      + Ajouter un document
                    </button>
                  </div>
                  <div className="space-y-2">
                    {[
                      {
                        id: 1,
                        name: "Devis_2025-020.pdf",
                        type: "PDF",
                        size: "245 KB",
                        uploadedAt: "2025-01-10",
                      },
                      {
                        id: 2,
                        name: "Photo_chantier_01.jpg",
                        type: "JPG",
                        size: "1.2 MB",
                        uploadedAt: "2025-01-15",
                      },
                    ].map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2 rounded border border-slate-200 hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">
                            📄 {doc.name}
                          </span>
                          <span className="text-xs text-slate-400">
                            {doc.size}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button className="text-xs text-[#F97316] hover:text-[#EA580C]">
                            Voir
                          </button>
                          <button className="text-xs text-slate-500 hover:text-slate-700">
                            Télécharger
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-3">
                    Notes
                  </h3>
                  <textarea
                    value={selectedProject.notes || ""}
                    onChange={(e) => {
                      const newNotes = e.target.value;
                      const updatedProject: Project = {
                        ...selectedProject,
                        notes: newNotes,
                      };
                      setMockProjects((prev) =>
                        prev.map((p) =>
                          p.id === selectedProject.id ? updatedProject : p
                        )
                      );
                      setSelectedProject(updatedProject);
                    }}
                    onBlur={(e) => {
                      // Ajouter un événement à l'historique seulement si la note a changé
                      if (e.target.value !== selectedProject.notes) {
                        const newHistoryEvent = addHistoryEvent(
                          selectedProject,
                          "Note modifiée",
                          e.target.value
                            ? `Note mise à jour: "${e.target.value.substring(0, 50)}${e.target.value.length > 50 ? "..." : ""}"`
                            : "Note supprimée"
                        );
                        const updatedProject: Project = {
                          ...selectedProject,
                          history: [
                            ...(selectedProject.history || []),
                            newHistoryEvent,
                          ],
                        };
                        setMockProjects((prev) =>
                          prev.map((p) =>
                            p.id === selectedProject.id ? updatedProject : p
                          )
                        );
                        setSelectedProject(updatedProject);
                      }
                    }}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                    rows={4}
                    placeholder="Ajoutez des notes sur ce projet..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Modal pour ajouter un événement à la timeline */}
      <AddTimelineEventModal
        isOpen={isTimelineModalOpen}
        onClose={() => setIsTimelineModalOpen(false)}
        onSubmit={(event: TimelineEvent) => {
          if (!selectedProject) return;

          // Ajouter l'événement à la timeline
          const updatedProject: Project = {
            ...selectedProject,
            timeline: [...(selectedProject.timeline || []), event],
          };

          // Ajouter un événement à l'historique
          const newHistoryEvent = addHistoryEvent(
            selectedProject,
            "Événement ajouté à la timeline",
            `${event.title}${event.description ? `: ${event.description}` : ""}`
          );
          updatedProject.history = [
            ...(selectedProject.history || []),
            newHistoryEvent,
          ];

          // Mettre à jour dans la liste des projets
          setMockProjects((prev) =>
            prev.map((p) =>
              p.id === selectedProject.id ? updatedProject : p
            )
          );

          setSelectedProject(updatedProject);
          setIsTimelineModalOpen(false);
        }}
      />
    </>
  );
}

