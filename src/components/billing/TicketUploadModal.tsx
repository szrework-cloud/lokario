"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { BillingLine } from "@/components/billing/types";

interface TicketUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalyze: (lines: BillingLine[], file: File) => void;
}

export function TicketUploadModal({ isOpen, onClose, onAnalyze }: TicketUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      // Créer une preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Veuillez sélectionner une image (JPG, PNG, etc.)");
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    
    // Simuler l'analyse IA du ticket de caisse
    // Dans une vraie app, on enverrait l'image à l'API IA (OCR + extraction de données)
    // L'IA analyserait le ticket et extrairait :
    // - Les articles/services avec leurs prix
    // - Les quantités
    // - Les taux de TVA
    // - Le total TTC
    // - La date
    // - Le nom du commerçant (pour suggérer le client)
    
    await new Promise((resolve) => setTimeout(resolve, 2500));

    // Simuler les données extraites du ticket de caisse
    // Ces données varieraient selon le contenu réel du ticket analysé
    const extractedLines: BillingLine[] = [
      {
        id: Date.now(),
        description: "Prestation de service",
        quantity: 1,
        unitPrice: 1250,
        taxRate: 20,
      },
      {
        id: Date.now() + 1,
        description: "Matériel fourni",
        quantity: 2,
        unitPrice: 150,
        taxRate: 20,
      },
    ];

    setIsAnalyzing(false);
    onAnalyze(extractedLines, selectedFile);
    onClose();
    
    // Réinitialiser
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#0F172A]">
                Analyser un ticket de caisse avec l'IA
              </h2>
              <p className="text-sm text-[#64748B] mt-1">
                Prenez une photo ou uploadez une image de votre ticket de caisse. L'IA extraira automatiquement les informations pour créer le devis.
              </p>
            </div>
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
        <CardContent className="space-y-4">
          {!selectedFile ? (
            <div className="border-2 border-dashed border-[#E5E7EB] rounded-lg p-8 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="ticket-upload"
              />
              <label
                htmlFor="ticket-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <svg
                  className="w-12 h-12 text-[#64748B] mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm font-medium text-[#0F172A] mb-1">
                  Cliquez pour sélectionner une image
                </p>
                <p className="text-xs text-[#64748B]">
                  ou prenez une photo directement depuis votre appareil
                </p>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={preview || ""}
                  alt="Aperçu du ticket"
                  className="w-full rounded-lg border border-[#E5E7EB] max-h-96 object-contain bg-[#F9FAFB]"
                />
                <button
                  onClick={handleRemove}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
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
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Fichier sélectionné :</span> {selectedFile.name}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Taille : {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
            <button
              onClick={onClose}
              className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
            >
              Annuler
            </button>
            {selectedFile && (
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-6 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
              >
                {isAnalyzing ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Analyse en cours...
                  </span>
                ) : (
                  "✨ Analyser avec l'IA"
                )}
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

