"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { PageTitle } from "@/components/layout/PageTitle";
import { Quote, BillingTimelineEvent, BillingHistoryEvent } from "@/components/billing/types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { Modal } from "@/components/ui/Modal";
import { getQuoteStatusColor, formatAmount, calculateLineTotal } from "@/components/billing/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { getQuote, downloadQuotePDF, convertQuoteToInvoice, updateQuote, sendQuoteEmail, Quote as QuoteAPI } from "@/services/quotesService";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const quoteId = Number(params.id);
  const { token } = useAuth();
  const { settings } = useSettings(false);
  const { showToast } = useToast();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [senderEmail, setSenderEmail] = useState<string>("");
  const [emailForm, setEmailForm] = useState({
    subject: "",
    content: "",
    additionalRecipients: [] as string[],
    newRecipient: "",
    additionalAttachments: [] as File[]
  });

  useEffect(() => {
    const loadQuote = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await getQuote(token, quoteId);
        
        // Adapter les données du backend au format frontend
        const adaptedQuote: Quote = {
          ...data,
          lines: (data.lines || []).map((line) => ({
            id: line.id || 0,
            description: line.description,
            quantity: line.quantity,
            unit: line.unit,
            unitPrice: line.unit_price_ht,
            taxRate: line.tax_rate,
            total: line.total_ttc,
          })),
          subtotal: data.subtotal_ht || 0,
          tax: data.total_tax || 0,
          total: data.total_ttc || data.amount || 0,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          discount_label: data.discount_label,
          client_email: (data as any).client_email, // Email du client pour le formulaire d'envoi
          timeline: [], // TODO: Récupérer depuis l'API
          history: [], // TODO: Récupérer depuis l'API
        };
        
        setQuote(adaptedQuote);
      } catch (err: any) {
        console.error("Erreur lors du chargement du devis:", err);
        setError(err.message || "Erreur lors du chargement du devis");
      } finally {
        setIsLoading(false);
      }
    };

    loadQuote();
  }, [quoteId, token]);

  // Ouvrir automatiquement le formulaire d'envoi si le paramètre ?send=true est présent
  useEffect(() => {
    const shouldOpenSendModal = searchParams?.get("send") === "true";
    if (shouldOpenSendModal && quote && !showSendModal) {
      setShowSendModal(true);
      // Retirer le paramètre de l'URL pour éviter de rouvrir le modal à chaque rechargement
      router.replace(`/app/billing/quotes/${quoteId}`, { scroll: false });
    }
  }, [searchParams, quote, showSendModal, router, quoteId]);

  // Charger l'email de l'expéditeur et préparer le formulaire quand le modal s'ouvre
  useEffect(() => {
    const loadEmailData = async () => {
      if (!showSendModal || !token || !quote) return;
      
      try {
        // Charger l'intégration inbox principale
        const { apiGet } = await import("@/lib/api");
        const integrations = await apiGet<any[]>("/inbox/integrations", token);
        const primaryIntegration = integrations.find((int: any) => int.is_primary && int.is_active);
        
        if (primaryIntegration?.email_address) {
          setSenderEmail(primaryIntegration.email_address);
        }
        
        // Charger le template d'email depuis les settings
        const billingSettings = (settings?.settings as any)?.billing || {};
        let emailTemplate = billingSettings.quote_email_template;
        
        // Si pas de template personnalisé, utiliser le template par défaut
        if (!emailTemplate) {
          emailTemplate = "Bonjour,\n\nVeuillez trouver ci-joint le devis {quote_number}.\n\nPour signer ce devis électroniquement, veuillez cliquer sur le lien de la signature : {signature_link}\n\n{notes}\n\nCordialement";
        }
        
        // Remplacer les variables du template
        const frontendUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        const signatureLink = quote.public_token 
          ? `${frontendUrl}/quote/${quote.public_token}`
          : "{signature_link}"; // Le backend remplacera cela si nécessaire
        
        let defaultContent = emailTemplate
          .replace(/{quote_number}/g, quote.number)
          .replace(/{signature_link}/g, signatureLink)
          .replace(/{notes}/g, quote.notes ? `Notes: ${quote.notes}` : "");
        
        setEmailForm({
          subject: `Devis ${quote.number}`,
          content: defaultContent,
          additionalRecipients: [],
          newRecipient: "",
          additionalAttachments: []
        });
      } catch (err) {
        console.error("Erreur lors du chargement des données email:", err);
      }
    };
    
    loadEmailData();
  }, [showSendModal, token, quote]);

  if (isLoading) {
    return (
      <>
        <PageTitle title="Devis" />
        <div className="space-y-6">
          <div className="flex items-center justify-center p-8">
            <div className="text-[#64748B]">Chargement du devis...</div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageTitle title="Erreur" />
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Erreur</h3>
            <p className="text-sm text-red-700 mb-4">{error}</p>
            <button
              onClick={() => router.push("/app/billing/quotes")}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              ← Retour à la liste
            </button>
          </div>
        </div>
      </>
    );
  }


  if (!quote) {
    return (
      <>
        <PageTitle title="Devis introuvable" />
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-slate-600">Le devis demandé n'existe pas.</p>
              <button
                onClick={() => router.push("/app/billing/quotes")}
                className="mt-4 text-[#F97316] hover:text-[#EA580C]"
              >
                ← Retour à la liste
              </button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const statusLabels: Record<Quote["status"], string> = {
    brouillon: "Brouillon",
    envoyé: "Envoyé",
    accepté: "Accepté",
    refusé: "Refusé",
  };

  return (
    <>
      <PageTitle title={`Devis ${quote.number}`} />
      <div className="space-y-6">
        {/* Bouton retour */}
        <button
          onClick={() => router.push("/app/billing/quotes")}
          className="text-sm text-[#64748B] hover:text-[#0F172A]"
        >
          ← Retour à la liste
        </button>

        {/* Bloc 1 : En-tête */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#0F172A]">
                  {quote.number}
                </h1>
                <p className="mt-1 text-sm text-[#64748B]">
                  Client:{" "}
                  <Link
                    href={`/app/clients?client=${encodeURIComponent(quote.client_name)}`}
                    className="text-[#F97316] hover:text-[#EA580C]"
                  >
                    {quote.client_name}
                  </Link>
                  {quote.project_name && (
                    <>
                      {" • "}
                      <Link
                        href={`/app/projects?project=${quote.project_id}`}
                        className="text-[#F97316] hover:text-[#EA580C]"
                      >
                        {quote.project_name}
                      </Link>
                    </>
                  )}
                </p>
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getQuoteStatusColor(
                      quote.status
                    )}`}
                  >
                    {statusLabels[quote.status]}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (!token) return;
                    
                    try {
                      const blob = await downloadQuotePDF(token, quoteId);
                      const url = window.URL.createObjectURL(blob);
                    const link = document.createElement("a");
                      link.href = url;
                      link.download = `devis_${quote.number}.pdf`;
                      document.body.appendChild(link);
                    link.click();
                      document.body.removeChild(link);
                      window.URL.revokeObjectURL(url);
                    } catch (err: any) {
                      console.error("Erreur lors du téléchargement du PDF:", err);
                      showToast(`Erreur lors du téléchargement du PDF: ${err.message || "Erreur inconnue"}`, "error");
                    }
                  }}
                  className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => {
                    // Dupliquer le devis en redirigeant vers la page de création avec les données pré-remplies
                    const duplicateParams = new URLSearchParams({
                      duplicate: String(quote.id),
                      client: String(quote.client_id),
                      ...(quote.project_id && { project: String(quote.project_id) }),
                    });
                    router.push(`/app/billing/quotes/new?${duplicateParams.toString()}`);
                  }}
                  className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
                >
                  📋 Dupliquer
                </button>
                {quote.status === "brouillon" && (
                  <button
                    onClick={() => {
                      setShowSendModal(true);
                    }}
                    className="rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
                  >
                    📤 Envoyer le devis
                  </button>
                )}
                {(quote.status === "accepté" || quote.status === "envoyé") && (
                  <button
                    onClick={() => {
                      setShowConvertModal(true);
                    }}
                    className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
                  >
                    💰 Convertir en facture
                  </button>
                )}
                {quote.status === "envoyé" && !quote.client_signature_path && (
                  <button
                    onClick={() => {
                      router.push(`/app/relances?quote=${quote.id}`);
                    }}
                    className="rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
                  >
                    ✨ Relancer IA
                  </button>
                )}
                {quote.client_signature_path && (
                  <div className="px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg border border-green-200">
                    ✓ Devis signé électroniquement
                  </div>
                )}
                {quote.public_token && (quote.status === "envoyé" || quote.status === "vu" || quote.status === "accepté") && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-blue-900 mb-1">Lien de signature client</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`${typeof window !== 'undefined' ? window.location.origin : ''}/quote/${quote.public_token}`}
                          className="flex-1 text-xs text-blue-700 bg-white border border-blue-300 rounded px-2 py-1 font-mono"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <button
                          onClick={() => {
                            const link = `${window.location.origin}/quote/${quote.public_token}`;
                            navigator.clipboard.writeText(link).then(() => {
                              showToast("Lien copié dans le presse-papiers !", "success");
                            }).catch(() => {
                              // Fallback pour les navigateurs qui ne supportent pas clipboard API
                              const input = document.createElement('input');
                              input.value = link;
                              document.body.appendChild(input);
                              input.select();
                              document.execCommand('copy');
                              document.body.removeChild(input);
                              showToast("Lien copié dans le presse-papiers !", "success");
                            });
                          }}
                          className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
                        >
                          📋 Copier
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    // TODO: Modifier devis
                    router.push(`/app/billing/quotes/${quote.id}/edit`);
                  }}
                  className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
                >
                  ✏️ Modifier
                </button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Bloc 2 : Timeline */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#0F172A]">Timeline</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quote.timeline
                .sort(
                  (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime()
                )
                .map((event, index) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-3 w-3 rounded-full bg-[#F97316]"></div>
                      {index < quote.timeline.length - 1 && (
                        <div className="h-12 w-0.5 bg-[#E5E7EB]"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm font-medium text-[#0F172A]">
                        {event.action}
                      </p>
                      {event.description && (
                        <p className="text-xs text-[#64748B] mt-1">
                          {event.description}
                        </p>
                      )}
                      <p className="text-xs text-[#64748B] mt-1">
                        {event.user} •{" "}
                        {new Date(event.timestamp).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Bloc 3 : Lignes du devis */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#0F172A]">
              Détails du devis
            </h2>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F9FAFB]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#64748B] uppercase">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#64748B] uppercase">
                      Quantité
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#64748B] uppercase">
                      Unité
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#64748B] uppercase">
                      Prix unitaire
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#64748B] uppercase">
                      TVA
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-[#64748B] uppercase">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {quote.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3 text-sm text-[#0F172A]">
                        {line.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-[#64748B]">
                        {line.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-[#64748B]">
                        {line.unit || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-[#64748B]">
                        {formatAmount(line.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-[#64748B]">
                        {line.taxRate}%
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-right text-[#0F172A]">
                        {formatAmount(calculateLineTotal(line))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[#F9FAFB]">
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-3 text-sm font-medium text-right text-[#0F172A]"
                    >
                      Sous-total HT
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-right text-[#0F172A]">
                      {formatAmount(quote.subtotal)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-3 text-sm font-medium text-right text-[#0F172A]"
                    >
                      TVA
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-right text-[#0F172A]">
                      {formatAmount(quote.tax)}
                    </td>
                  </tr>
                  {quote.discount_type && quote.discount_value && (
                    <>
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-3 text-sm text-right text-[#64748B] italic"
                        >
                          {quote.discount_label || "Réduction"}
                          {quote.discount_type === "percentage" && ` (${quote.discount_value}%)`}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-red-600 italic">
                          -{formatAmount(
                            quote.discount_type === "percentage"
                              ? ((quote.subtotal + quote.tax) * quote.discount_value) / 100
                              : quote.discount_value
                          )}
                        </td>
                      </tr>
                    </>
                  )}
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-3 text-lg font-bold text-right text-[#0F172A]"
                    >
                      Total TTC
                    </td>
                    <td className="px-4 py-3 text-lg font-bold text-right text-[#0F172A]">
                      {formatAmount(quote.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {quote.notes && (
              <div className="mt-6 pt-6 border-t border-[#E5E7EB]">
                <h3 className="text-sm font-medium text-[#0F172A] mb-2">
                  Notes
                </h3>
                <p className="text-sm text-[#64748B]">{quote.notes}</p>
              </div>
            )}
            {quote.conditions && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-[#0F172A] mb-2">
                  Conditions
                </h3>
                <p className="text-sm text-[#64748B]">{quote.conditions}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bloc 4 : Historique */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[#0F172A]">
              Historique des actions
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {quote.history
                .sort(
                  (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime()
                )
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB]"
                  >
                    <div className="w-2 h-2 rounded-full bg-[#F97316] mt-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#0F172A]">
                        {entry.action}
                      </p>
                      {entry.description && (
                        <p className="text-xs text-[#64748B] mt-1">
                          {entry.description}
                        </p>
                      )}
                      <p className="text-xs text-[#64748B] mt-1">
                        {entry.user} •{" "}
                        {new Date(entry.timestamp).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Bloc 5 : Documents associés */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#0F172A]">
                Documents associés
              </h2>
              <button className="text-xs text-[#F97316] hover:text-[#EA580C]">
                + Ajouter un document
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded border border-[#E5E7EB] hover:bg-[#F9FAFB]">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#0F172A]">
                    📄 {quote.number}.pdf
                  </span>
                  <span className="text-xs text-[#64748B]">(Généré automatiquement)</span>
                </div>
                <button className="text-xs text-blue-600 hover:text-blue-700">
                  Télécharger
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de confirmation de conversion */}
      <Modal
        isOpen={showConvertModal}
        onClose={() => {
          setShowConvertModal(false);
        }}
        title="Convertir le devis en facture"
        size="md"
      >
        <div className="w-full space-y-4">
          <p className="text-[#0F172A] text-center">
            Voulez-vous convertir ce devis en facture ? La facture sera créée automatiquement.
          </p>
          {quote && (
            <div className="bg-[#F9FAFB] p-4 rounded-lg">
              <p className="text-sm text-[#64748B] mb-1">Devis</p>
              <p className="text-sm font-medium text-[#0F172A]">{quote.number}</p>
              <p className="text-sm text-[#64748B] mt-2 mb-1">Montant</p>
              <p className="text-sm font-medium text-[#0F172A]">{formatAmount(quote.total)}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowConvertModal(false);
              }}
              className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
            >
              Annuler
            </button>
            <button
              onClick={async () => {
                if (!token || !quote) return;
                
                try {
                  const invoice = await convertQuoteToInvoice(token, quote.id);
                  setShowConvertModal(false);
                  router.push(`/app/billing/invoices/${invoice.id}`);
                } catch (err: any) {
                  const errMsg = err.message || "Erreur inconnue";
                  setShowConvertModal(false);
                  
                  // Afficher le message d'erreur dans un modal
                  const lowerErrMsg = errMsg.toLowerCase();
                  let finalMessage = errMsg;
                  if (lowerErrMsg.includes("signé") || lowerErrMsg.includes("signature") || lowerErrMsg.includes("doit être signé") || lowerErrMsg.includes("impossible de convertir")) {
                    finalMessage = "Le devis doit être signé par le client avant de pouvoir être converti en facture.";
                  }
                  
                  setErrorMessage(finalMessage);
                  setShowErrorModal(true);
                }
              }}
              className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-6 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
            >
              Confirmer
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal d'erreur */}
      <Modal
        isOpen={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
          setErrorMessage(null);
        }}
        title="Erreur lors de la conversion"
        size="md"
      >
        <div className="w-full space-y-4">
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-2xl">❌</span>
            </div>
          </div>
          <p className="text-[#0F172A] text-center">
            {errorMessage || "Une erreur est survenue lors de la conversion du devis en facture."}
          </p>
          <div className="flex justify-end pt-4">
            <button
              onClick={() => {
                setShowErrorModal(false);
                setErrorMessage(null);
              }}
              className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-6 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
            >
              Fermer
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de formulaire d'envoi d'email */}
      <Modal
        isOpen={showSendModal}
        onClose={() => {
          setShowSendModal(false);
          setEmailForm({
            subject: "",
            content: "",
            additionalRecipients: [],
            newRecipient: "",
            additionalAttachments: []
          });
        }}
        title="Envoyer le devis par email"
        size="xl"
      >
        <div className="w-full space-y-4 px-6 py-4">
          {/* Section Expéditeur et Destinataire */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Expéditeur */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#0F172A]">
                Expéditeur
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={senderEmail}
                  readOnly
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm bg-gradient-to-br from-[#F9FAFB] to-[#F3F4F6] text-[#64748B] font-medium"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <span className="text-xs text-[#94A3B8] bg-white px-1.5 py-0.5 rounded border border-[#E5E7EB]">Lecture seule</span>
                </div>
              </div>
            </div>

            {/* Destinataire principal */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#0F172A]">
                Destinataire principal
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={quote?.client_email || (quote?.client_name ? `${quote.client_name} (email non configuré)` : "Chargement...")}
                  readOnly
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-medium ${
                    quote?.client_email 
                      ? "border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 text-green-700" 
                      : "border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50 text-amber-700"
                  }`}
                />
                {quote?.client_email && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <span className="text-xs text-green-600 bg-white px-1.5 py-0.5 rounded border border-green-200">✓ Configuré</span>
                  </div>
                )}
              </div>
              {!quote?.client_email && (
                <div className="p-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-700">
                    Le client n'a pas d'email configuré. Ajoutez un email dans les destinataires supplémentaires.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Destinataires supplémentaires */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#0F172A]">
              Destinataires supplémentaires <span className="text-[#94A3B8] font-normal">(optionnel)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailForm.newRecipient}
                onChange={(e) => setEmailForm({ ...emailForm, newRecipient: e.target.value })}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && emailForm.newRecipient.trim()) {
                    e.preventDefault();
                    if (!emailForm.additionalRecipients.includes(emailForm.newRecipient.trim())) {
                      setEmailForm({
                        ...emailForm,
                        additionalRecipients: [...emailForm.additionalRecipients, emailForm.newRecipient.trim()],
                        newRecipient: ""
                      });
                    }
                  }
                }}
                placeholder="email@exemple.com"
                className="flex-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1 transition-all"
              />
              <button
                onClick={() => {
                  if (emailForm.newRecipient.trim() && !emailForm.additionalRecipients.includes(emailForm.newRecipient.trim())) {
                    setEmailForm({
                      ...emailForm,
                      additionalRecipients: [...emailForm.additionalRecipients, emailForm.newRecipient.trim()],
                      newRecipient: ""
                    });
                  }
                }}
                className="rounded-lg bg-[#F97316] text-white px-4 py-2 text-sm font-medium hover:bg-[#EA580C] transition-colors"
              >
                Ajouter
              </button>
            </div>
            {emailForm.additionalRecipients.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5 p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                {emailForm.additionalRecipients.map((email, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-[#E5E7EB] rounded text-xs text-[#0F172A]"
                  >
                    <span className="font-medium">{email}</span>
                    <button
                      onClick={() => {
                        setEmailForm({
                          ...emailForm,
                          additionalRecipients: emailForm.additionalRecipients.filter((_, i) => i !== idx)
                        });
                      }}
                      className="text-[#94A3B8] hover:text-red-500 transition-colors font-bold text-sm leading-none"
                      title="Supprimer"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Objet */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#0F172A]">
              Objet <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={emailForm.subject}
              onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
              className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1 transition-all bg-white"
              required
              placeholder="Sujet de l'email"
            />
          </div>

          {/* Contenu */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
              <span>Contenu</span>
              <span className="text-red-500">*</span>
            </label>
            <textarea
              value={emailForm.content}
              onChange={(e) => setEmailForm({ ...emailForm, content: e.target.value })}
              rows={10}
              className="w-full rounded-lg border border-[#E5E7EB] px-4 py-3 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1 transition-all bg-white resize-none font-mono"
              required
              placeholder="Contenu de l'email..."
            />
            <p className="text-xs text-[#94A3B8]">
              Vous pouvez modifier le contenu. Le lien de la signature sera inclus automatiquement si disponible.
            </p>
          </div>

          {/* Pièces jointes supplémentaires */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#0F172A]">
              Pièces jointes supplémentaires <span className="text-[#94A3B8] font-normal">(optionnel)</span>
            </label>
            <div className="relative">
              <input
                type="file"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setEmailForm({
                    ...emailForm,
                    additionalAttachments: [...emailForm.additionalAttachments, ...files]
                  });
                }}
                className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1 transition-all bg-white cursor-pointer file:mr-3 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-[#F97316] file:text-white file:cursor-pointer hover:file:bg-[#EA580C]"
              />
            </div>
            {emailForm.additionalAttachments.length > 0 && (
              <div className="mt-1.5 space-y-1.5 p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg">
                {emailForm.additionalAttachments.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between px-2 py-1.5 bg-white border border-[#E5E7EB] rounded text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#0F172A]">{file.name}</span>
                      <span className="text-[#94A3B8]">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setEmailForm({
                          ...emailForm,
                          additionalAttachments: emailForm.additionalAttachments.filter((_, i) => i !== idx)
                        });
                      }}
                      className="text-[#94A3B8] hover:text-red-500 transition-colors font-bold text-sm leading-none px-1"
                      title="Supprimer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Note :</strong> Le PDF du devis sera automatiquement joint à l'email.
              </p>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-[#E5E7EB]">
            <button
              onClick={() => {
                setShowSendModal(false);
                setEmailForm({
                  subject: "",
                  content: "",
                  additionalRecipients: [],
                  newRecipient: "",
                  additionalAttachments: []
                });
              }}
              className="rounded-lg border-2 border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#0F172A] hover:bg-[#F9FAFB] hover:border-[#D1D5DB] transition-all"
            >
              Annuler
            </button>
            <button
              onClick={async () => {
                if (!token || !quote || !emailForm.subject || !emailForm.content) return;
                
                setIsSending(true);
                try {
                  const result = await sendQuoteEmail(token, quote.id, {
                    subject: emailForm.subject,
                    content: emailForm.content,
                    additional_recipients: emailForm.additionalRecipients,
                    additional_attachments: emailForm.additionalAttachments
                  });
                  
                  // Mettre à jour le statut du devis
                  const updatedQuote = await getQuote(token, quote.id);
                  setQuote({
                    ...quote,
                    status: updatedQuote.status as Quote["status"],
                    public_token: updatedQuote.public_token,
                    public_token_expires_at: updatedQuote.public_token_expires_at
                  });
                  
                  setShowSendModal(false);
                  setEmailForm({
                    subject: "",
                    content: "",
                    additionalRecipients: [],
                    newRecipient: "",
                    additionalAttachments: []
                  });
                } catch (err: any) {
                  console.error("Erreur lors de l'envoi de l'email:", err);
                  const errMsg = err.message || "Erreur inconnue lors de l'envoi de l'email";
                  setErrorMessage(errMsg);
                  setShowErrorModal(true);
                } finally {
                  setIsSending(false);
                }
              }}
              disabled={isSending || !emailForm.subject || !emailForm.content}
              className="rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-6 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {isSending ? "Envoi en cours..." : "Envoyer"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

