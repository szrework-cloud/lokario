"use client";

import { useState, useEffect, useCallback } from "react";
import React from "react";
import { PageTitle } from "@/components/layout/PageTitle";
import { ProjectList } from "@/components/projects/ProjectList";
import { ProjectTimeline } from "@/components/projects/ProjectTimeline";
import { AddTimelineEventModal } from "@/components/projects/AddTimelineEventModal";
import { TimelineEvent } from "@/components/projects/types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/ui/Loader";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  addProjectHistory,
  deleteProjectHistory,
  uploadProjectDocument,
  deleteProjectDocument,
  downloadProjectDocument,
  previewProjectDocument,
  previewProjectDocumentAsBlob,
  Project as ProjectType,
  ProjectDocument,
} from "@/services/projectsService";
import { getClients, Client } from "@/services/clientsService";
import { getTasks, Task } from "@/services/tasksService";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ModuleLink } from "@/components/ui/ModuleLink";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { PageTransition } from "@/components/ui/PageTransition";
import { AnimatedButton } from "@/components/ui/AnimatedButton";

// Fonction helper pour détecter le type de fichier
function getFilePreviewType(fileName: string, fileType: string): "image" | "pdf" | "text" | "excel" | "other" {
  const lowerName = fileName.toLowerCase();
  
  if (fileType === "image" || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(lowerName)) {
    return "image";
  }
  if (fileType === "pdf" || lowerName.endsWith(".pdf")) {
    return "pdf";
  }
  if (/\.(txt|md|log|json|xml|yml|yaml|ini|conf)$/i.test(lowerName)) {
    return "text";
  }
  if (/\.(xlsx|xls|csv)$/i.test(lowerName)) {
    return "excel";
  }
  return "other";
}

// Composant pour afficher l'aperçu d'une image
function ImagePreview({ documentId, getImageUrl }: { documentId: number; getImageUrl: (id: number) => Promise<string | null> }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    getImageUrl(documentId).then((url) => {
      if (isMounted) {
        setImageUrl(url);
        setIsLoading(false);
        if (!url) setError(true);
      }
    });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  if (error) {
    return (
      <div className="w-full h-48 bg-slate-100 rounded-lg flex items-center justify-center">
        <span className="text-slate-400 text-sm">Erreur de chargement</span>
      </div>
    );
  }

  if (isLoading || !imageUrl) {
    return (
      <div className="w-full h-48 bg-slate-100 rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F97316]"></div>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt="Aperçu"
      className="w-full h-48 object-cover"
      onError={() => setError(true)}
    />
  );
}

// Composant pour afficher l'aperçu d'un PDF
function PDFPreview({ documentId, getImageUrl }: { documentId: number; getImageUrl: (id: number) => Promise<string | null> }) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    getImageUrl(documentId).then((url) => {
      if (isMounted) {
        setPdfUrl(url);
        setIsLoading(false);
        if (!url) setError(true);
      }
    });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  if (error) {
    return (
      <div className="w-full h-64 bg-slate-100 rounded-lg flex items-center justify-center">
        <span className="text-slate-400 text-sm">Erreur de chargement</span>
      </div>
    );
  }

  if (isLoading || !pdfUrl) {
    return (
      <div className="w-full h-64 bg-slate-100 rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F97316]"></div>
      </div>
    );
  }

  return (
    <iframe
      src={pdfUrl + "#toolbar=0"}
      className="w-full h-64 rounded-lg border border-slate-200"
      title="Aperçu PDF"
    />
  );
}

// Composant pour afficher l'aperçu d'un fichier texte
function TextPreview({ documentId, getImageUrl }: { documentId: number; getImageUrl: (id: number) => Promise<string | null> }) {
  const [textContent, setTextContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    getImageUrl(documentId).then(async (url) => {
      if (!url || !isMounted) {
        if (isMounted) {
          setIsLoading(false);
          setError(true);
        }
        return;
      }

      try {
        const response = await fetch(url);
        const text = await response.text();
        if (isMounted) {
          // Limiter à 5000 caractères pour l'aperçu
          setTextContent(text.length > 5000 ? text.substring(0, 5000) + "\n\n... (fichier tronqué)" : text);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
          setIsLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  if (error) {
    return (
      <div className="w-full h-64 bg-slate-100 rounded-lg flex items-center justify-center">
        <span className="text-slate-400 text-sm">Erreur de chargement</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-64 bg-slate-100 rounded-lg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F97316]"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-64 bg-slate-50 rounded-lg border border-slate-200 p-3 overflow-auto">
      <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono">
        {textContent}
      </pre>
    </div>
  );
}

// Composant pour afficher l'aperçu d'un fichier Excel
function ExcelPreview({ fileName }: { fileName: string }) {
  return (
    <div className="w-full h-48 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 flex flex-col items-center justify-center gap-2">
      <div className="text-4xl">📊</div>
      <p className="text-sm font-medium text-slate-700">Fichier Excel</p>
      <p className="text-xs text-slate-500">{fileName}</p>
      <p className="text-xs text-slate-400 mt-2">Téléchargez le fichier pour l'ouvrir</p>
    </div>
  );
}

export default function ProjectsPage() {
  const { user, token, refreshUserFromAPI } = useAuth();
  const { isModuleEnabled } = useModuleAccess();
  const [selectedProject, setSelectedProject] = useState<ProjectType | null>(null);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<number | null>(null);
  const [isDeleteHistoryConfirmOpen, setIsDeleteHistoryConfirmOpen] = useState(false);
  const [historyToDelete, setHistoryToDelete] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string; type: "image" | "pdf" | "text"; textContent?: string } | null>(null);
  const [imageUrls, setImageUrls] = useState<Map<number, string>>(new Map());
  
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [statusFilter, setStatusFilter] = useState<"all" | "Nouveau" | "En cours" | "Terminé">("all");

  // Permissions : vérifier les permissions de l'utilisateur
  // Les owners/admins ont tous les droits par défaut, les users utilisent leurs permissions
  const canEditProjects = user?.role === "super_admin" || user?.role === "owner" || (user?.role === "user" && user?.can_edit_tasks === true); // Utiliser can_edit_tasks pour l'instant
  const canDeleteProjects = user?.role === "super_admin" || user?.role === "owner" || (user?.role === "user" && user?.can_delete_tasks === true); // Utiliser can_delete_tasks pour l'instant
  const canCreateProjects = user?.role === "super_admin" || user?.role === "owner" || (user?.role === "user" && user?.can_create_tasks === true); // Utiliser can_create_tasks pour l'instant

  // Charger les données
  const loadData = useCallback(async () => {
    if (!token) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const [projectsData, clientsData, tasksData] = await Promise.all([
        getProjects(token, statusFilter !== "all" ? { status: statusFilter } : undefined),
        getClients(token),
        getTasks(token),
      ]);
      
      setProjects(projectsData);
      setClients(clientsData);
      setTasks(tasksData);
    } catch (err: any) {
      console.error("Erreur lors du chargement des données:", err);
      setError(err.message || "Erreur lors du chargement des données");
    } finally {
      setIsLoading(false);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    loadData();
    // Rafraîchir les permissions utilisateur à chaque chargement de page
    if (refreshUserFromAPI) {
      refreshUserFromAPI();
    }
  }, [loadData, refreshUserFromAPI]);

  // Nettoyer les URLs blob quand le projet change ou le composant se démonte
  useEffect(() => {
    const currentUrls = imageUrls;
    return () => {
      // Nettoyer toutes les URLs blob créées
      currentUrls.forEach((url) => {
        window.URL.revokeObjectURL(url);
      });
    };
  }, [selectedProject?.id]);

  // Filtrer les projets selon le statut
  const filteredProjects = statusFilter === "all"
    ? projects
    : projects.filter((p) => p.status === statusFilter);

  // Récupérer les tâches liées à un projet
  const getProjectTasks = (projectId: number): Task[] => {
    return tasks.filter((t) => t.projectId === projectId);
  };

  // Convertir ProjectType vers le format attendu par les composants
  const convertProjectToComponentFormat = (project: ProjectType): any => {
    const projectTasks = getProjectTasks(project.id);
    return {
      id: project.id,
      name: project.name,
      client: project.clientName || `Client #${project.clientId}`,
      status: project.status,
      startDate: project.startDate || "",
      endDate: project.endDate,
      tasks: projectTasks.map((t) => ({
        id: t.id,
        title: t.title,
        completed: t.status === "Terminé" || t.status === "Terminée",
      })),
      notes: project.notes,
      timeline: [], // Les événements timeline seront gérés via l'historique
      history: project.history?.map((h) => ({
        id: h.id,
        timestamp: h.createdAt,
        action: h.action,
        description: h.description,
        user: h.userName || "Utilisateur",
      })) || [],
      documents: project.documents || [],
    };
  };

  // Handlers
  const handleCreateProject = async (projectData: {
    name: string;
    description?: string;
    clientId: number;
    status?: "Nouveau" | "En cours" | "Terminé";
    startDate?: string;
    endDate?: string;
    notes?: string;
  }) => {
    if (!token) return;
    
    try {
      await createProject(token, projectData);
      setSuccessMessage("Projet créé avec succès !");
      setTimeout(() => setSuccessMessage(null), 5000);
      await loadData();
      setIsCreateModalOpen(false);
    } catch (err: any) {
      console.error("Erreur lors de la création du projet:", err);
      setError(err.message || "Erreur lors de la création du projet");
    }
  };

  const handleUpdateProject = async (projectId: number, updates: {
    name?: string;
    description?: string;
    clientId?: number;
    status?: "Nouveau" | "En cours" | "Terminé";
    startDate?: string;
    endDate?: string;
    notes?: string;
  }) => {
    if (!token) return;
    
    try {
      const updatedProject = await updateProject(token, projectId, updates);
      
      // Si c'est le projet sélectionné, le mettre à jour
      if (selectedProject && selectedProject.id === projectId) {
        setSelectedProject(updatedProject);
      }
      
      await loadData();
    } catch (err: any) {
      console.error("Erreur lors de la mise à jour du projet:", err);
      setError(err.message || "Erreur lors de la mise à jour du projet");
    }
  };

  const handleDeleteProject = (projectId: number) => {
    setProjectToDelete(projectId);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteProject = async () => {
    if (!token || !projectToDelete) return;
    
    try {
      await deleteProject(token, projectToDelete);
      setSuccessMessage("Projet supprimé avec succès");
      setTimeout(() => setSuccessMessage(null), 5000);
      
      // Si c'était le projet sélectionné, revenir à la liste
      if (selectedProject && selectedProject.id === projectToDelete) {
        setSelectedProject(null);
      }
      
      await loadData();
      setIsDeleteConfirmOpen(false);
      setProjectToDelete(null);
    } catch (err: any) {
      console.error("Erreur lors de la suppression du projet:", err);
      setError(err.message || "Erreur lors de la suppression du projet");
    }
  };

  const handleAddTimelineEvent = async (event: TimelineEvent) => {
    if (!token || !selectedProject) return;
    
    try {
      await addProjectHistory(
        token,
        selectedProject.id,
        event.title,
        event.description
      );
      
      await loadData();
      
      // Recharger le projet sélectionné
      const updatedProjects = await getProjects(token);
      const updatedProject = updatedProjects.find((p) => p.id === selectedProject.id);
      if (updatedProject) {
        setSelectedProject(updatedProject);
      }
      
      setIsTimelineModalOpen(false);
    } catch (err: any) {
      console.error("Erreur lors de l'ajout de l'événement:", err);
      setError(err.message || "Erreur lors de l'ajout de l'événement");
    }
  };

  const handleDeleteHistoryEvent = (historyId: number) => {
    setHistoryToDelete(historyId);
    setIsDeleteHistoryConfirmOpen(true);
  };

  const confirmDeleteHistoryEvent = async () => {
    if (!token || !selectedProject || !historyToDelete) return;
    
    try {
      await deleteProjectHistory(token, historyToDelete);
      
      await loadData();
      
      // Recharger le projet sélectionné
      const updatedProjects = await getProjects(token);
      const updatedProject = updatedProjects.find((p) => p.id === selectedProject.id);
      if (updatedProject) {
        setSelectedProject(updatedProject);
      }
      
      setSuccessMessage("Événement supprimé avec succès");
      setTimeout(() => setSuccessMessage(null), 5000);
      setIsDeleteHistoryConfirmOpen(false);
      setHistoryToDelete(null);
    } catch (err: any) {
      console.error("Erreur lors de la suppression de l'événement:", err);
      setError(err.message || "Erreur lors de la suppression de l'événement");
    }
  };

  const handleUploadDocument = async (file: File) => {
    if (!token || !selectedProject) return;
    
    try {
      const document = await uploadProjectDocument(token, selectedProject.id, file);
      
      // Recharger le projet sélectionné
      const updatedProjects = await getProjects(token);
      const updatedProject = updatedProjects.find((p) => p.id === selectedProject.id);
      if (updatedProject) {
        setSelectedProject(updatedProject);
      }
      
      setSuccessMessage("Document ajouté avec succès !");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error("Erreur lors de l'upload du document:", err);
      setError(err.message || "Erreur lors de l'upload du document");
      throw err;
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!token || !selectedProject) return;
    
    try {
      await deleteProjectDocument(token, documentId);
      
      // Recharger le projet sélectionné
      const updatedProjects = await getProjects(token);
      const updatedProject = updatedProjects.find((p) => p.id === selectedProject.id);
      if (updatedProject) {
        setSelectedProject(updatedProject);
      }
      
      setSuccessMessage("Document supprimé avec succès");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error("Erreur lors de la suppression:", err);
      setError(err.message || "Erreur lors de la suppression");
    }
  };

  const handleDownloadDocument = async (documentId: number, filename: string) => {
    if (!token) return;
    
    try {
      const blob = await downloadProjectDocument(token, documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error("Erreur lors du téléchargement:", err);
      setError(err.message || "Erreur lors du téléchargement");
    }
  };

  // Fonction pour charger et créer l'URL blob d'un document (image, PDF, texte)
  const getImageUrl = async (documentId: number): Promise<string | null> => {
    if (!token) {
      console.error("Token manquant pour charger le document");
      return null;
    }
    
    // Si l'URL est déjà en cache, la retourner
    if (imageUrls.has(documentId)) {
      return imageUrls.get(documentId) || null;
    }
    
    try {
      // Utiliser l'endpoint de prévisualisation pour obtenir le blob avec les bons headers
      const blob = await previewProjectDocumentAsBlob(token, documentId);
      if (!blob || blob.size === 0) {
        console.error("Blob vide reçu pour le document", documentId);
        return null;
      }
      const url = window.URL.createObjectURL(blob);
      setImageUrls(prev => new Map(prev).set(documentId, url));
      return url;
    } catch (err: any) {
      console.error("Erreur lors du chargement du document:", err);
      throw err; // Propager l'erreur pour qu'elle soit gérée par handlePreviewImage
    }
  };

  // Fonction pour ouvrir l'image en plein écran
  const handlePreviewImage = async (documentId: number, filename: string) => {
    try {
      const url = await getImageUrl(documentId);
      if (url) {
        setPreviewImage({ url, name: filename, type: "image" });
      } else {
        setError("Impossible de charger l'image. Veuillez réessayer.");
        setTimeout(() => setError(null), 5000);
      }
    } catch (err: any) {
      console.error("Erreur lors de l'ouverture de l'image:", err);
      setError(err.message || "Erreur lors du chargement de l'image");
      setTimeout(() => setError(null), 5000);
    }
  };

  // Fonction pour ouvrir un PDF en plein écran
  const handlePreviewPDF = async (documentId: number, filename: string) => {
    try {
      const previewType = getFilePreviewType(filename, "");
      
      if (previewType === "text") {
        // Pour les fichiers texte, charger le contenu
        if (!token) {
          setError("Token manquant");
          setTimeout(() => setError(null), 5000);
          return;
        }
        const blob = await previewProjectDocumentAsBlob(token, documentId);
        const text = await blob.text();
        // Limiter à 10000 caractères pour l'aperçu
        const truncatedText = text.length > 10000 ? text.substring(0, 10000) + "\n\n... (fichier tronqué)" : text;
        setPreviewImage({ 
          url: "", 
          name: filename, 
          type: "text",
          textContent: truncatedText
        });
      } else {
        // Pour les PDF, utiliser l'URL blob
        const url = await getImageUrl(documentId);
        if (url) {
          setPreviewImage({ 
            url, 
            name: filename, 
            type: "pdf" 
          });
        } else {
          setError("Impossible de charger le PDF. Veuillez réessayer.");
          setTimeout(() => setError(null), 5000);
        }
      }
    } catch (err: any) {
      console.error("Erreur lors de l'ouverture du document:", err);
      setError(err.message || "Erreur lors du chargement du document");
      setTimeout(() => setError(null), 5000);
    }
  };

  if (isLoading) {
    return (
      <PageTransition>
        <PageTitle title="Dossiers / Projets" />
        <div className="py-8">
          <Loader text="Chargement des projets..." />
        </div>
      </PageTransition>
    );
  }

  const selectedProjectFormatted = selectedProject
    ? convertProjectToComponentFormat(selectedProject)
    : null;

  return (
    <PageTransition>
      <PageTitle title="Dossiers / Projets" />
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {successMessage}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A]">
              Dossiers / Projets
            </h1>
            <p className="mt-2 text-slate-600">
              Suivez vos dossiers et projets clients
            </p>
          </div>
          {canCreateProjects && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
            >
              + Créer un projet
            </button>
          )}
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
              Tous ({projects.length})
            </button>
            <button
              onClick={() => setStatusFilter("Nouveau")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === "Nouveau"
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"
              }`}
            >
              Nouveau ({projects.filter((p) => p.status === "Nouveau").length})
            </button>
            <button
              onClick={() => setStatusFilter("En cours")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === "En cours"
                  ? "border-orange-600 bg-orange-600 text-white"
                  : "border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100"
              }`}
            >
              En cours ({projects.filter((p) => p.status === "En cours").length})
            </button>
            <button
              onClick={() => setStatusFilter("Terminé")}
              className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                statusFilter === "Terminé"
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-green-200 bg-green-50 text-green-800 hover:bg-green-100"
              }`}
            >
              Terminé ({projects.filter((p) => p.status === "Terminé").length})
            </button>
          </div>
        )}

        {!selectedProject ? (
          filteredProjects.length === 0 ? (
            <Card>
              <EmptyState
                title="Aucun dossier/projet pour l'instant"
                description="Créez votre premier projet pour commencer à suivre vos dossiers clients."
                action={
                  canCreateProjects ? (
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
                    >
                      Créer un projet
                    </button>
                  ) : undefined
                }
                icon="📁"
              />
            </Card>
          ) : (
            <ProjectList
              projects={filteredProjects.map(convertProjectToComponentFormat)}
              onProjectClick={(project) => {
                const foundProject = projects.find((p) => p.id === project.id);
                if (foundProject) {
                  setSelectedProject(foundProject);
                }
              }}
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
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-slate-500">
                        {selectedProject.clientName || `Client #${selectedProject.clientId}`}
                      </p>
                      {isModuleEnabled("clients") && selectedProject.clientId && (
                        <ModuleLink
                          href={`/app/clients/${selectedProject.clientId}`}
                          className="text-xs text-[#F97316] hover:text-[#EA580C] font-medium"
                          showTooltip
                        >
                          Voir le client →
                        </ModuleLink>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {canEditProjects ? (
                      <select
                        value={selectedProject.status}
                        onChange={(e) => {
                          const newStatus = e.target.value as "Nouveau" | "En cours" | "Terminé";
                          handleUpdateProject(selectedProject.id, { status: newStatus });
                        }}
                        className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm font-medium focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                      >
                        <option value="Nouveau">Nouveau</option>
                        <option value="En cours">En cours</option>
                        <option value="Terminé">Terminé</option>
                      </select>
                    ) : (
                      <span className="px-3 py-2 text-sm font-medium text-slate-700">
                        {selectedProject.status}
                      </span>
                    )}
                    {canDeleteProjects && (
                      <button
                        onClick={() => handleDeleteProject(selectedProject.id)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Informations du client */}
                {(() => {
                  const projectClient = clients.find(c => c.id === selectedProject.clientId);
                  if (!projectClient) return null;
                  
                  return (
                    <div className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                      <h3 className="text-sm font-medium text-slate-700 mb-3">
                        Informations du client
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Nom</p>
                          <p className="font-medium text-slate-900">{projectClient.name}</p>
                        </div>
                        {projectClient.type && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Type</p>
                            <p className="font-medium text-slate-900">{projectClient.type}</p>
                          </div>
                        )}
                        {projectClient.contactEmail && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Email</p>
                            <p className="font-medium text-slate-900">{projectClient.contactEmail}</p>
                          </div>
                        )}
                        {projectClient.contactPhone && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Téléphone</p>
                            <p className="font-medium text-slate-900">{projectClient.contactPhone}</p>
                          </div>
                        )}
                        {projectClient.sector && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Secteur</p>
                            <p className="font-medium text-slate-900">{projectClient.sector}</p>
                          </div>
                        )}
                        {projectClient.address && (
                          <div className="md:col-span-2">
                            <p className="text-xs text-slate-500 mb-1">Adresse</p>
                            <p className="font-medium text-slate-900">{projectClient.address}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Timeline / Historique */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-slate-700">
                      Historique
                    </h3>
                    {canEditProjects && (
                      <button
                        onClick={() => setIsTimelineModalOpen(true)}
                        className="text-xs text-[#F97316] hover:text-[#EA580C] font-medium"
                      >
                        + Ajouter un événement
                      </button>
                    )}
                  </div>
                  {selectedProjectFormatted?.history && selectedProjectFormatted.history.length > 0 ? (
                    <div className="space-y-2">
                      {[...selectedProjectFormatted.history]
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
                            {canEditProjects && (
                              <button
                                onClick={() => handleDeleteHistoryEvent(entry.id)}
                                className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50"
                                title="Supprimer cet événement"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Aucun historique pour l'instant. Ajoutez-en un pour suivre l'avancement du projet.
                    </p>
                  )}
                </div>

                {/* Tâches liées */}
                {selectedProjectFormatted?.tasks && selectedProjectFormatted.tasks.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-slate-700">
                        Tâches liées
                      </h3>
                      {isModuleEnabled("tasks") && (
                        <ModuleLink
                          href={`/app/tasks?projectId=${selectedProject.id}`}
                          className="text-xs text-[#F97316] hover:text-[#EA580C] font-medium"
                          showTooltip
                        >
                          Voir toutes →
                        </ModuleLink>
                      )}
                    </div>
                    <div className="space-y-2">
                      {selectedProjectFormatted.tasks.map((task) => (
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
                          {isModuleEnabled("tasks") ? (
                            <ModuleLink
                              href={`/app/tasks?task=${task.id}`}
                              className={`text-sm hover:text-slate-600 ${
                                task.completed
                                  ? "text-slate-500 line-through"
                                  : "text-slate-900"
                              }`}
                            >
                              {task.title}
                            </ModuleLink>
                          ) : (
                            <span
                              className={`text-sm ${
                                task.completed
                                  ? "text-slate-500 line-through"
                                  : "text-slate-900"
                              }`}
                            >
                              {task.title}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Documents attachés */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-slate-700">
                      Documents attachés
                    </h3>
                    {canEditProjects && (
                      <label className="text-xs text-[#F97316] hover:text-[#EA580C] font-medium cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              await handleUploadDocument(file);
                            } catch (err) {
                              // L'erreur est déjà gérée dans handleUploadDocument
                            }
                            // Réinitialiser l'input
                            e.target.value = "";
                          }}
                        />
                        + Ajouter un document
                      </label>
                    )}
                  </div>
                  {selectedProject.documents && selectedProject.documents.length > 0 ? (
                    <div className="space-y-2">
                      {selectedProject.documents.map((doc) => {
                        const previewType = getFilePreviewType(doc.name, doc.fileType);
                        const canPreview = previewType === "image" || previewType === "pdf" || previewType === "text";
                        
                        // Déterminer l'icône selon le type
                        let icon = "📎";
                        if (previewType === "image") icon = "🖼️";
                        else if (previewType === "pdf") icon = "📄";
                        else if (previewType === "text") icon = "📝";
                        else if (previewType === "excel") icon = "📊";
                        
                        return (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                                <span className="text-lg">{icon}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                  {doc.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {(doc.fileSize / 1024).toFixed(1)} KB •{" "}
                                  {new Date(doc.createdAt).toLocaleDateString("fr-FR")}
                                  {doc.uploadedByName && ` • ${doc.uploadedByName}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {canPreview && (
                                <button
                                  onClick={async () => {
                                    try {
                                      if (previewType === "image") {
                                        await handlePreviewImage(doc.id, doc.name);
                                      } else if (previewType === "pdf") {
                                        await handlePreviewPDF(doc.id, doc.name);
                                      } else if (previewType === "text") {
                                        await handlePreviewPDF(doc.id, doc.name); // Utiliser le même handler pour le texte
                                      }
                                    } catch (err: any) {
                                      console.error("Erreur lors de la prévisualisation:", err);
                                      setError(err.message || "Erreur lors de la prévisualisation");
                                      setTimeout(() => setError(null), 5000);
                                    }
                                  }}
                                  className="text-xs text-[#F97316] hover:text-[#EA580C] font-medium"
                                >
                                  Prévisualiser
                                </button>
                              )}
                              <button
                                onClick={() => handleDownloadDocument(doc.id, doc.name)}
                                className="text-xs text-[#F97316] hover:text-[#EA580C] font-medium"
                              >
                                Télécharger
                              </button>
                              {canDeleteProjects && (
                                <button
                                  onClick={async () => {
                                    // TODO: Remplacer par ConfirmModal
                                    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${doc.name}" ?`)) return;
                                    await handleDeleteDocument(doc.id);
                                  }}
                                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                                >
                                  Supprimer
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Aucun document attaché. {canEditProjects && "Ajoutez-en un pour partager des fichiers liés au projet."}
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-3">
                    Notes
                  </h3>
                  {canEditProjects ? (
                    <textarea
                      value={selectedProject.notes || ""}
                      onChange={(e) => {
                        // Mise à jour locale immédiate pour l'UX
                        setSelectedProject({
                          ...selectedProject,
                          notes: e.target.value,
                        });
                      }}
                      onBlur={(e) => {
                        // Sauvegarder seulement quand on quitte le champ
                        if (e.target.value !== selectedProject.notes) {
                          handleUpdateProject(selectedProject.id, {
                            notes: e.target.value,
                          });
                        }
                      }}
                      className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                      rows={4}
                      placeholder="Ajoutez des notes sur ce projet..."
                    />
                  ) : (
                    <div className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm bg-slate-50 text-slate-700 min-h-[100px]">
                      {selectedProject.notes || "Aucune note"}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Modal pour ajouter un événement à l'historique */}
      <AddTimelineEventModal
        isOpen={isTimelineModalOpen}
        onClose={() => setIsTimelineModalOpen(false)}
        onSubmit={handleAddTimelineEvent}
      />

      {/* Modal de prévisualisation d'image/PDF */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={() => {
            // Ne pas nettoyer l'URL ici car elle peut être réutilisée
            setPreviewImage(null);
          }}
        >
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 text-white hover:text-slate-300 bg-black bg-opacity-50 rounded-full p-2 z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {previewImage.type === "image" ? (
              <img
                src={previewImage.url}
                alt={previewImage.name}
                className="max-w-full max-h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            ) : previewImage.type === "text" ? (
              <div className="w-full h-full max-w-full max-h-full bg-slate-50 rounded-lg border border-slate-200 p-4 overflow-auto">
                <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono">
                  {previewImage.textContent || "Chargement..."}
                </pre>
              </div>
            ) : (
              <iframe
                src={previewImage.url + "#toolbar=0"}
                className="w-full h-full max-w-full max-h-full rounded-lg border-0"
                title={previewImage.name}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-lg text-sm">
              {previewImage.name}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression de projet */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <h2 className="text-xl font-semibold text-slate-900">
                Supprimer le projet
              </h2>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">
                Êtes-vous sûr de vouloir supprimer ce projet ? Cette action est irréversible.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setProjectToDelete(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDeleteProject}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Supprimer
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de confirmation de suppression d'événement */}
      {isDeleteHistoryConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <h2 className="text-xl font-semibold text-slate-900">
                Supprimer l'événement
              </h2>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">
                Êtes-vous sûr de vouloir supprimer cet événement ? Cette action est irréversible.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsDeleteHistoryConfirmOpen(false);
                    setHistoryToDelete(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmDeleteHistoryEvent}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Supprimer
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de création de projet */}
      {isCreateModalOpen && (
        <CreateProjectModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          clients={clients}
          onSubmit={handleCreateProject}
        />
      )}
    </PageTransition>
  );
}

// Composant modal de création de projet
interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onSubmit: (data: {
    name: string;
    description?: string;
    clientId: number;
    status?: "Nouveau" | "En cours" | "Terminé";
    startDate?: string;
    endDate?: string;
    notes?: string;
  }) => void;
}

function CreateProjectModal({
  isOpen,
  onClose,
  clients,
  onSubmit,
}: CreateProjectModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    clientId: 0,
    status: "Nouveau" as "Nouveau" | "En cours" | "Terminé",
    startDate: "",
    endDate: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: "",
        description: "",
        clientId: 0,
        status: "Nouveau",
        startDate: "",
        endDate: "",
        notes: "",
      });
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.clientId) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: formData.name,
        description: formData.description || undefined,
        clientId: formData.clientId,
        status: formData.status,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
        notes: formData.notes || undefined,
      });
    } catch (error) {
      console.error("Error creating project:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#0F172A]">Créer un projet</h2>
            <button
              onClick={onClose}
              className="text-[#64748B] hover:text-[#0F172A]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Nom du projet *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="Ex: Rénovation cuisine"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Client *
              </label>
              <select
                required
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: parseInt(e.target.value) })}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              >
                <option value={0}>Sélectionner un client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                rows={3}
                placeholder="Description du projet..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Date de début
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1">
                  Date de fin
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Statut
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as "Nouveau" | "En cours" | "Terminé" })}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              >
                <option value="Nouveau">Nouveau</option>
                <option value="En cours">En cours</option>
                <option value="Terminé">Terminé</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                rows={3}
                placeholder="Notes sur le projet..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-6 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
              >
                {isSubmitting ? "Création..." : "Créer le projet"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
