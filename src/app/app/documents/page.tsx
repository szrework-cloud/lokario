"use client";

import { useState } from "react";
import { PageTitle } from "@/components/layout/PageTitle";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { UploadDocumentModal, UploadFormData } from "@/components/documents/UploadDocumentModal";
import { DocumentPreviewModal } from "@/components/documents/DocumentPreviewModal";
import { logger } from "@/lib/logger";

export default function DocumentsPage() {
  const { user } = useAuth();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<{
    id: number;
    name: string;
    type: string;
    size: string;
  } | null>(null);

  // TODO: Récupérer les documents depuis le backend
  const mockFolders = [
    { id: "devis", name: "Devis", count: 12 },
    { id: "factures", name: "Factures", count: 45 },
    { id: "contrats", name: "Contrats", count: 8 },
    { id: "autres", name: "Autres documents", count: 23 },
  ];

  const mockDocuments = [
    {
      id: 1,
      name: "Devis_2025-023_Boulangerie_Soleil.pdf",
      type: "PDF",
      size: "245 KB",
      uploadedBy: "Jean Dupont",
      uploadedAt: "2025-01-15",
      linkedTo: "Devis #2025-023",
    },
    {
      id: 2,
      name: "Facture_2025-014_Mme_Dupont.pdf",
      type: "PDF",
      size: "189 KB",
      uploadedBy: "Marie Martin",
      uploadedAt: "2025-01-12",
      linkedTo: "Facture #2025-014",
    },
    {
      id: 3,
      name: "Contrat_Martin_2025.pdf",
      type: "PDF",
      size: "312 KB",
      uploadedBy: "Jean Dupont",
      uploadedAt: "2025-01-10",
      linkedTo: "Projet Rénovation",
    },
  ];

  return (
    <>
      <PageTitle title="Documents & Fichiers" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A]">
              Documents & Fichiers
            </h1>
            <p className="mt-2 text-[#64748B]">
              Centralisez et organisez tous vos documents
            </p>
          </div>
          {(user?.role === "super_admin" || user?.role === "owner") && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
            >
              + Uploader un document
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Sidebar - Dossiers */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-[#0F172A]">Dossiers</h2>
            </CardHeader>
            <CardContent className="space-y-1">
              <button
                onClick={() => setSelectedFolder(null)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedFolder === null
                    ? "bg-[#F97316] text-white"
                    : "text-[#64748B] hover:bg-[#F9FAFB]"
                }`}
              >
                Tous les documents
              </button>
              {mockFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${
                    selectedFolder === folder.id
                      ? "bg-[#F97316] text-white"
                      : "text-[#64748B] hover:bg-[#F9FAFB]"
                  }`}
                >
                  <span>{folder.name}</span>
                  <span className="text-xs opacity-70">({folder.count})</span>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Liste des documents */}
          <div className="lg:col-span-3">
            {mockDocuments.length === 0 ? (
              <Card>
                <EmptyState
                  title="Aucun document pour le moment"
                  description="Uploader votre premier document pour commencer."
                  action={
                    (user?.role === "super_admin" || user?.role === "owner") && (
                      <button className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2">
                        Uploader un document
                      </button>
                    )
                  }
                  icon="📄"
                />
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <h2 className="text-sm font-semibold text-[#0F172A]">
                    {selectedFolder
                      ? mockFolders.find((f) => f.id === selectedFolder)?.name
                      : "Tous les documents"}
                  </h2>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center">
                            <span className="text-red-600 text-xs font-bold">
                              PDF
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#0F172A] truncate">
                              {doc.name}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              <p className="text-xs text-[#64748B]">
                                {doc.size} • {doc.uploadedBy}
                              </p>
                              {doc.linkedTo && (
                                <>
                                  <span className="text-[#E5E7EB]">•</span>
                                  <p className="text-xs text-[#64748B]">
                                    Lié à: {doc.linkedTo}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#64748B]">
                            {new Date(doc.uploadedAt).toLocaleDateString("fr-FR")}
                          </span>
                          <button
                            onClick={() =>
                              setPreviewDocument({
                                id: doc.id,
                                name: doc.name,
                                type: doc.type,
                                size: doc.size,
                              })
                            }
                            className="text-xs text-[#F97316] hover:text-[#EA580C]"
                            title="Voir / Télécharger"
                          >
                            Voir
                          </button>
                          {(user?.role === "super_admin" ||
                            user?.role === "owner") && (
                            <button
                              className="text-xs text-red-600 hover:text-red-700"
                              title="Supprimer"
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Modals */}
        <UploadDocumentModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onSubmit={async (data: UploadFormData) => {
            // TODO: Appel API pour uploader le document
            logger.log("Upload document:", data);
            // Après upload réussi, recharger la liste
          }}
        />

        {previewDocument && (
          <DocumentPreviewModal
            isOpen={!!previewDocument}
            onClose={() => setPreviewDocument(null)}
            document={previewDocument}
          />
        )}
      </div>
    </>
  );
}

