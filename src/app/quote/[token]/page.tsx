"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { SignatureCanvas } from "@/components/billing/SignatureCanvas";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { formatAmount } from "@/components/billing/utils";

interface QuoteLine {
  id: number;
  description: string;
  quantity: number;
  unit_price_ht: number;
  tax_rate: number;
  total_ttc: number;
}

interface PublicQuote {
  id: number;
  number: string;
  status: string;
  subtotal_ht?: number;
  total_tax?: number;
  total_ttc?: number;
  amount: number;
  created_at: string;
  valid_until?: string;
  service_start_date?: string;
  execution_duration?: string;
  conditions?: string;
  notes?: string;
  client_signature_path?: string;
  lines: QuoteLine[];
  client_name?: string;
  client_email?: string;  // Email du client pour validation
  company_name?: string;
}

export default function PublicQuotePage() {
  const params = useParams();
  const token = params.token as string;
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadQuote = async () => {
      if (!token) {
        setIsLoading(false);
        setError("Token manquant");
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(`${API_URL}/quotes/public/${token}`);
        
        if (!response.ok) {
          throw new Error("Devis non trouvé ou lien invalide");
        }
        
        const data = await response.json();
        setQuote(data);
      } catch (err: any) {
        console.error("Erreur lors du chargement du devis:", err);
        setError(err.message || "Erreur lors du chargement du devis");
      } finally {
        setIsLoading(false);
      }
    };

    loadQuote();
  }, [token]);

  const handleSign = async (signatureData: {
    signature: string;
    signer_email: string;
    signer_name?: string;
    consent_given: boolean;
    consent_text: string;
  }) => {
    if (!token || !quote) return;

    setIsSigning(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/quotes/public/${token}/signature`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signatureData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Erreur lors de la signature" }));
        throw new Error(errorData.detail || "Erreur lors de la signature");
      }

      const updatedQuote = await response.json();
      setQuote({
        ...quote,
        ...updatedQuote,
        client_signature_path: updatedQuote.client_signature_path,
        status: updatedQuote.status,
      });
      setIsSignatureModalOpen(false);
      setSuccessMessage("Devis signé avec succès !");
      setErrorMessage(null);
      
      // Masquer le message de succès après 5 secondes
      setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error("Erreur lors de la signature:", err);
      setErrorMessage(err.message || "Erreur lors de la signature");
      setSuccessMessage(null);
      
      // Masquer le message d'erreur après 5 secondes
      setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
    } finally {
      setIsSigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F97316]/10 via-white to-[#EA580C]/10 flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#64748B]">Chargement du devis...</div>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F97316]/10 via-white to-[#EA580C]/10 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold text-[#0F172A] mb-2">Erreur</h1>
          <p className="text-[#64748B]">{error || "Devis non trouvé"}</p>
        </div>
      </div>
    );
  }

  const canSign = (quote.status === "envoyé" || quote.status === "vu") && !quote.client_signature_path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F97316]/10 via-white to-[#EA580C]/10 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Message de succès */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-green-600 hover:text-green-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Message d'erreur */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <p className="text-sm font-medium text-red-800">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-600 hover:text-red-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-[#0F172A] mb-2">Devis {quote.number}</h1>
          <p className="text-[#64748B]">
            {quote.company_name || "Votre entreprise"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-[#0F172A]">Devis #{quote.number}</h2>
                <p className="text-sm text-[#64748B] mt-1">
                  Date d'émission : {new Date(quote.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              {quote.client_signature_path && (
                <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                  ✓ Devis signé électroniquement
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Informations client */}
            {quote.client_name && (
              <div>
                <h3 className="text-sm font-medium text-[#64748B] mb-1">Client</h3>
                <p className="text-[#0F172A]">{quote.client_name}</p>
              </div>
            )}

            {/* Lignes du devis */}
            <div>
              <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Détails du devis</h3>
              <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#F9FAFB]">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase">Description</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-[#64748B] uppercase">Qté</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-[#64748B] uppercase">Prix unitaire HT</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-[#64748B] uppercase">TVA</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-[#64748B] uppercase">Total TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {quote.lines.map((line) => (
                      <tr key={line.id}>
                        <td className="px-4 py-3 text-sm text-[#0F172A]">{line.description}</td>
                        <td className="px-4 py-3 text-sm text-right text-[#64748B]">{line.quantity}</td>
                        <td className="px-4 py-3 text-sm text-right text-[#64748B]">{formatAmount(line.unit_price_ht)}</td>
                        <td className="px-4 py-3 text-sm text-right text-[#64748B]">{line.tax_rate}%</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-[#0F172A]">{formatAmount(line.total_ttc)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totaux */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748B]">Sous-total HT</span>
                  <span className="text-[#0F172A]">{formatAmount(quote.subtotal_ht || 0)}</span>
                </div>
                {/* Calculer le détail de la TVA par taux */}
                {(() => {
                  // Vérifier que quote et quote.lines existent
                  if (!quote || !quote.lines || quote.lines.length === 0) {
                    return (
                      <div className="flex justify-between text-sm">
                        <span className="text-[#64748B]">TVA</span>
                        <span className="text-[#0F172A]">{formatAmount(quote?.total_tax || 0)}</span>
                      </div>
                    );
                  }

                  // Grouper les lignes par taux de TVA
                  const taxDetails: { [key: number]: { subtotal: number; tax: number } } = {};
                  quote.lines.forEach((line) => {
                    if (!line) return;
                    const taxRate = line.tax_rate || 0;
                    if (!taxDetails[taxRate]) {
                      taxDetails[taxRate] = { subtotal: 0, tax: 0 };
                    }
                    const lineSubtotal = (line.quantity || 0) * (line.unit_price_ht || 0);
                    const lineTax = lineSubtotal * (taxRate / 100);
                    taxDetails[taxRate].subtotal += lineSubtotal;
                    taxDetails[taxRate].tax += lineTax;
                  });

                  // Trier les taux par ordre décroissant
                  const sortedTaxRates = Object.keys(taxDetails)
                    .map(Number)
                    .filter(rate => rate > 0)
                    .sort((a, b) => b - a);

                  // Si un seul taux, afficher simplement "TVA"
                  if (sortedTaxRates.length === 1) {
                    return (
                      <div className="flex justify-between text-sm">
                        <span className="text-[#64748B]">TVA</span>
                        <span className="text-[#0F172A]">{formatAmount(quote.total_tax || 0)}</span>
                      </div>
                    );
                  }

                  // Plusieurs taux : afficher le détail
                  return sortedTaxRates.map((taxRate) => {
                    const taxInfo = taxDetails[taxRate];
                    if (!taxInfo) return null;
                    // Formater le taux (enlever les décimales si .00)
                    const taxRateLabel = taxRate % 1 === 0 
                      ? `TVA ${taxRate}%` 
                      : `TVA ${taxRate.toFixed(2)}%`;
                    
                    return (
                      <div key={taxRate} className="flex justify-between text-sm">
                        <span className="text-[#64748B]">{taxRateLabel}</span>
                        <span className="text-[#0F172A]">{formatAmount(taxInfo.tax || 0)}</span>
                      </div>
                    );
                  }).filter(Boolean);
                })()}
                <div className="flex justify-between text-lg font-semibold pt-2 border-t border-[#E5E7EB]">
                  <span className="text-[#0F172A]">Total TTC</span>
                  <span className="text-[#F97316]">{formatAmount(quote.total_ttc || quote.amount)}</span>
                </div>
              </div>
            </div>

            {/* Informations complémentaires */}
            {(quote.valid_until || quote.service_start_date || quote.execution_duration || quote.conditions) && (
              <div className="bg-[#F9FAFB] rounded-lg p-4 space-y-2">
                {quote.valid_until && (
                  <p className="text-sm text-[#64748B]">
                    <strong>Devis valable jusqu'au :</strong> {new Date(quote.valid_until).toLocaleDateString("fr-FR")}
                  </p>
                )}
                {quote.service_start_date && (
                  <p className="text-sm text-[#64748B]">
                    <strong>Date de début de prestation :</strong> {new Date(quote.service_start_date).toLocaleDateString("fr-FR")}
                  </p>
                )}
                {quote.execution_duration && (
                  <p className="text-sm text-[#64748B]">
                    <strong>Durée d'exécution :</strong> {quote.execution_duration}
                  </p>
                )}
                {quote.conditions && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-[#0F172A] mb-1">Conditions</p>
                    <p className="text-sm text-[#64748B] whitespace-pre-line">{quote.conditions}</p>
                  </div>
                )}
              </div>
            )}

            {/* Bouton de signature */}
            {canSign && (
              <div className="flex justify-center pt-6">
                <button
                  onClick={() => setIsSignatureModalOpen(true)}
                  className="px-6 py-3 bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white rounded-lg font-medium hover:brightness-110 shadow-md"
                >
                  ✍️ Signer le devis
                </button>
              </div>
            )}

            {quote.client_signature_path && (
              <div className="text-center pt-6">
                <p className="text-sm text-green-600 font-medium">
                  ✓ Ce devis a été signé électroniquement
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de signature */}
      <SignatureCanvas
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={handleSign}
        title="Signer le devis"
        clientEmail={quote.client_email}
        token={token}
      />
    </div>
  );
}
