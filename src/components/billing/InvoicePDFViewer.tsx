"use client";

import { useState, useEffect } from "react";
import { generatePDF } from "@/services/invoicesService";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";

interface InvoicePDFViewerProps {
  invoiceId: number;
  invoiceNumber: string;
  onClose?: () => void;
}

export function InvoicePDFViewer({ invoiceId, invoiceNumber, onClose }: InvoicePDFViewerProps) {
  const { token } = useAuth();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPDF = async () => {
      if (!token) {
        setError("Non authentifié");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        const blob = await generatePDF(token, invoiceId);
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err: any) {
        console.error("Erreur lors du chargement du PDF:", err);
        setError(err.message || "Erreur lors du chargement du PDF");
      } finally {
        setIsLoading(false);
      }
    };

    loadPDF();

    // Nettoyer l'URL lors du démontage
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [invoiceId, token]);

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = `facture_${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Loader />
        <p className="mt-4 text-sm text-[#64748B]">Génération du PDF en cours...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Erreur</h3>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          {onClose && (
            <Button variant="secondary" onClick={onClose}>
              Fermer
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="p-8">
        <p className="text-sm text-[#64748B]">PDF non disponible</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-[#E5E7EB] bg-white">
        <h3 className="text-lg font-semibold text-[#0F172A]">
          Facture {invoiceNumber}
        </h3>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleDownload}>
            Télécharger
          </Button>
          {onClose && (
            <Button variant="secondary" size="sm" onClick={onClose}>
              Fermer
            </Button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-gray-100">
        <iframe
          src={pdfUrl}
          className="w-full h-full min-h-[600px] border-0"
          title={`Facture ${invoiceNumber}`}
        />
      </div>
    </div>
  );
}
