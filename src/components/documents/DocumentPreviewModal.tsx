"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: number;
    name: string;
    type: string;
    size: string;
    url?: string;
  };
}

export function DocumentPreviewModal({ isOpen, onClose, document }: DocumentPreviewModalProps) {
  if (!isOpen) return null;

  const isImage = ["JPG", "JPEG", "PNG", "GIF"].includes(document.type.toUpperCase());
  const isPDF = document.type.toUpperCase() === "PDF";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#0F172A]">{document.name}</h2>
              <p className="text-sm text-[#64748B]">
                {document.type} • {document.size}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]">
                Télécharger
              </button>
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
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-8">
          {isImage ? (
            <img
              src={document.url || "/placeholder-image.jpg"}
              alt={document.name}
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            />
          ) : isPDF ? (
            <div className="w-full h-full flex items-center justify-center">
              <iframe
                src={document.url || "#"}
                className="w-full h-full min-h-[600px] border-0 rounded-lg"
                title={document.name}
              />
            </div>
          ) : (
            <div className="text-center">
              <div className="w-24 h-24 bg-slate-300 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📄</span>
              </div>
              <p className="text-sm text-[#64748B]">
                Aperçu non disponible pour ce type de fichier
              </p>
              <button className="mt-4 rounded-lg bg-[#F97316] px-4 py-2 text-sm font-medium text-white hover:bg-[#EA580C]">
                Télécharger pour voir
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

