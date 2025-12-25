"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageTitle } from "@/components/layout/PageTitle";
import { Quote, QuoteStatus, Invoice, InvoiceStatus, BillingLine } from "@/components/billing/types";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tag } from "@/components/ui/Tag";
import { Modal } from "@/components/ui/Modal";
import { getQuoteStatusColor, getInvoiceStatusColor, formatAmount, isInvoiceOverdue } from "@/components/billing/utils";
import { useAuth } from "@/hooks/useAuth";
import { PageTransition } from "@/components/ui/PageTransition";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { downloadQuotePDF, convertQuoteToInvoice, Quote as QuoteAPI } from "@/services/quotesService";
import { Invoice as InvoiceAPI } from "@/services/invoicesService";
import { useQuotes } from "@/hooks/queries/useQuotes";
import { useInvoices } from "@/hooks/queries/useInvoices";
import { useClients } from "@/hooks/queries/useClients";
import Link from "next/link";
import { logger } from "@/lib/logger";

type TabType = "quotes" | "invoices";

export default function BillingPage() {
  const router = useRouter();
  const { token } = useAuth();
  
  // Onglet actif
  const [activeTab, setActiveTab] = useState<TabType>("quotes");
  
  // Filtres devis
  const [quoteStatusFilter, setQuoteStatusFilter] = useState<QuoteStatus | "all">("all");
  const [quoteSearchQuery, setQuoteSearchQuery] = useState("");
  const [quoteClientFilter, setQuoteClientFilter] = useState<number | "all">("all");
  const [quoteDateFrom, setQuoteDateFrom] = useState<string>("");
  const [quoteDateTo, setQuoteDateTo] = useState<string>("");
  const [quoteAmountMin, setQuoteAmountMin] = useState<string>("");
  const [quoteAmountMax, setQuoteAmountMax] = useState<string>("");
  const [showQuoteFilters, setShowQuoteFilters] = useState(false);
  
  // Filtres factures
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [invoiceClientFilter, setInvoiceClientFilter] = useState<number | "all">("all");
  const [invoiceDateFrom, setInvoiceDateFrom] = useState<string>("");
  const [invoiceDateTo, setInvoiceDateTo] = useState<string>("");
  const [invoiceAmountMin, setInvoiceAmountMin] = useState<string>("");
  const [invoiceAmountMax, setInvoiceAmountMax] = useState<string>("");
  const [showInvoiceFilters, setShowInvoiceFilters] = useState(false);
  
  // États locaux (modals, etc.)
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [quoteToConvert, setQuoteToConvert] = useState<Quote | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Charger les clients avec React Query (cache automatique)
  const { data: clients = [] } = useClients();

  // Charger les devis avec React Query (cache automatique)
  const {
    data: quotesData = [],
    isLoading: isLoadingQuotes,
    error: quotesError,
  } = useQuotes({
    status: quoteStatusFilter !== "all" ? quoteStatusFilter : undefined,
  });

  // Charger les factures avec React Query (cache automatique)
  const {
    data: invoicesData = [],
    isLoading: isLoadingInvoices,
    error: invoicesError,
  } = useInvoices({
    status: invoiceStatusFilter !== "all" ? invoiceStatusFilter : undefined,
    client_id: invoiceClientFilter !== "all" ? invoiceClientFilter : undefined,
    search: invoiceSearchQuery || undefined,
  });

  // Adapter les données des devis (même logique qu'avant, maintenant dans useMemo pour performance)
  const quotes = useMemo<Quote[]>(() => {
    return quotesData.map((q: QuoteAPI) => ({
      ...q,
      client_name: q.client_name || "",
      lines: (q.lines || []).map((line) => ({
        id: line.id || 0,
        description: line.description,
        quantity: Number(line.quantity) || 0,
        unitPrice: Number(line.unit_price_ht) || 0,
        taxRate: Number(line.tax_rate) || 0,
        total: Number(line.total_ttc) || 0,
      })),
      subtotal: Number(q.subtotal_ht) || 0,
      tax: Number(q.total_tax) || 0,
      total: Number(q.total_ttc) || Number(q.amount) || 0,
      timeline: [],
      history: [],
    })) as Quote[];
  }, [quotesData]);

  // Adapter les données des factures (même logique qu'avant, maintenant dans useMemo pour performance)
  const invoices = useMemo<Invoice[]>(() => {
    return invoicesData.map((inv: InvoiceAPI) => {
      const adaptedLines: BillingLine[] = (inv.lines || []).map((line) => ({
        id: line.id || 0,
        description: line.description,
        quantity: Number(line.quantity) || 0,
        unitPrice: Number(line.unit_price_ht) || 0,
        taxRate: Number(line.tax_rate) || 0,
        total: Number(line.total_ttc) || 0,
      }));

      // Valider operation_category pour s'assurer qu'il correspond au type attendu
      const validOperationCategory =
        inv.operation_category &&
        (inv.operation_category === "vente" ||
          inv.operation_category === "prestation" ||
          inv.operation_category === "les deux")
          ? (inv.operation_category as "vente" | "prestation" | "les deux")
          : undefined;

      return {
        ...inv,
        client_name: inv.client_name || "",
        due_date: inv.due_date || new Date().toISOString().split("T")[0],
        operation_category: validOperationCategory,
        vat_on_debit: inv.vat_on_debit ?? false,
        vat_applicable: inv.vat_applicable ?? true,
        amount: inv.amount || inv.total_ttc || 0,
        lines: adaptedLines,
        amount_paid: 0,
        amount_remaining: Number(inv.total_ttc) || Number(inv.amount) || 0,
        subtotal: Number(inv.subtotal_ht) || 0,
        tax: Number(inv.total_tax) || 0,
        total: Number(inv.total_ttc) || Number(inv.amount) || 0,
        timeline: [],
        history: [],
        payments: [],
      } as Invoice;
    });
  }, [invoicesData]);

  // États de chargement et erreur combinés (pour compatibilité avec le code existant)
  const isLoading = activeTab === "quotes" ? isLoadingQuotes : isLoadingInvoices;
  const error: string | null = quotesError?.message || invoicesError?.message || null;

  // Filtrer les devis
  const filteredQuotes = useMemo(() => {
    let filtered = quotes;
    
    if (quoteStatusFilter !== "all") {
      filtered = filtered.filter((q) => q.status === quoteStatusFilter);
    }
    
    if (quoteClientFilter !== "all") {
      filtered = filtered.filter((q) => q.client_id === quoteClientFilter);
    }
    
    if (quoteSearchQuery) {
      const query = quoteSearchQuery.toLowerCase();
      filtered = filtered.filter((q) => 
        q.number.toLowerCase().includes(query) ||
        q.client_name.toLowerCase().includes(query)
      );
    }
    
    if (quoteDateFrom) {
      const fromDate = new Date(quoteDateFrom);
      filtered = filtered.filter((q) => {
        const qDate = new Date(q.created_at);
        return qDate >= fromDate;
      });
    }
    
    if (quoteDateTo) {
      const toDate = new Date(quoteDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((q) => {
        const qDate = new Date(q.created_at);
        return qDate <= toDate;
      });
    }
    
    if (quoteAmountMin) {
      const min = parseFloat(quoteAmountMin);
      if (!isNaN(min)) {
        filtered = filtered.filter((q) => q.total >= min);
      }
    }
    
    if (quoteAmountMax) {
      const max = parseFloat(quoteAmountMax);
      if (!isNaN(max)) {
        filtered = filtered.filter((q) => q.total <= max);
      }
    }
    
    return filtered;
  }, [quotes, quoteStatusFilter, quoteClientFilter, quoteSearchQuery, quoteDateFrom, quoteDateTo, quoteAmountMin, quoteAmountMax]);

  // Filtrer les factures
  const filteredInvoices = useMemo(() => {
    let filtered = invoices;
    
    if (invoiceStatusFilter !== "all") {
      filtered = filtered.filter((inv) => {
        if (invoiceStatusFilter === "en retard") {
          return isInvoiceOverdue(inv) && inv.status !== "payée";
        }
        return inv.status === invoiceStatusFilter;
      });
    }
    
    if (invoiceDateFrom) {
      const fromDate = new Date(invoiceDateFrom);
      filtered = filtered.filter((inv) => {
        const invDate = new Date(inv.created_at);
        return invDate >= fromDate;
      });
    }
    
    if (invoiceDateTo) {
      const toDate = new Date(invoiceDateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((inv) => {
        const invDate = new Date(inv.created_at);
        return invDate <= toDate;
      });
    }
    
    if (invoiceAmountMin) {
      const min = parseFloat(invoiceAmountMin);
      if (!isNaN(min)) {
        filtered = filtered.filter((inv) => inv.total >= min);
      }
    }
    
    if (invoiceAmountMax) {
      const max = parseFloat(invoiceAmountMax);
      if (!isNaN(max)) {
        filtered = filtered.filter((inv) => inv.total <= max);
      }
    }
    
    return filtered;
  }, [invoices, invoiceStatusFilter, invoiceDateFrom, invoiceDateTo, invoiceAmountMin, invoiceAmountMax]);

  // Grouper les factures liées selon la même logique que le backend
  // (basé sur quote_id et original_invoice_id)
  const groupedInvoices = useMemo(() => {
    const processed = new Set<number>();
    const groups: Invoice[][] = [];
    const invoiceMap = new Map<number, Invoice>();
    
    // Créer un map pour accès rapide par ID
    filteredInvoices.forEach(inv => {
      invoiceMap.set(inv.id, inv);
    });
    
    // Traiter chaque facture
    filteredInvoices.forEach((invoice) => {
      if (processed.has(invoice.id)) return;
      
      const group: Invoice[] = [];
      
      // Si c'est un avoir, trouver la facture originale
      if (invoice.invoice_type === "avoir" && invoice.original_invoice_id) {
        const originalInvoice = invoiceMap.get(invoice.original_invoice_id);
        if (originalInvoice && !processed.has(originalInvoice.id)) {
          group.push(originalInvoice);
          processed.add(originalInvoice.id);
          
          // Si la facture originale a un quote_id, trouver toutes les factures du même devis
          if (originalInvoice.quote_id) {
            filteredInvoices.forEach(inv => {
              if (inv.quote_id === originalInvoice.quote_id && 
                  inv.id !== originalInvoice.id && 
                  !processed.has(inv.id)) {
                group.push(inv);
                processed.add(inv.id);
              }
            });
          }
        }
      } 
      // Si c'est une facture normale
      else if (invoice.invoice_type !== "avoir") {
        group.push(invoice);
        processed.add(invoice.id);
        
        // Trouver tous les avoirs liés à cette facture
        filteredInvoices.forEach(inv => {
          if (inv.invoice_type === "avoir" && 
              inv.original_invoice_id === invoice.id && 
              !processed.has(inv.id)) {
            group.push(inv);
            processed.add(inv.id);
          }
        });
        
        // Si cette facture a un quote_id, trouver toutes les autres factures du même devis
        if (invoice.quote_id) {
          filteredInvoices.forEach(inv => {
            if (inv.quote_id === invoice.quote_id && 
                inv.id !== invoice.id && 
                !processed.has(inv.id)) {
              group.push(inv);
              processed.add(inv.id);
              
              // Si cette autre facture a des avoirs, les ajouter aussi
              filteredInvoices.forEach(avoir => {
                if (avoir.invoice_type === "avoir" && 
                    avoir.original_invoice_id === inv.id && 
                    !processed.has(avoir.id)) {
                  group.push(avoir);
                  processed.add(avoir.id);
                }
              });
            }
          });
        }
      }
      // Si c'est un avoir sans original_invoice_id (cas rare)
      else {
        group.push(invoice);
        processed.add(invoice.id);
      }
      
      // Trier le groupe : factures normales d'abord, puis avoirs
      // Dans chaque catégorie, trier par date (plus récent en premier)
      group.sort((a, b) => {
        const aIsAvoir = a.invoice_type === "avoir";
        const bIsAvoir = b.invoice_type === "avoir";
        if (aIsAvoir && !bIsAvoir) return 1; // Avoir après facture
        if (!aIsAvoir && bIsAvoir) return -1; // Facture avant avoir
        // Même type, trier par date décroissante
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      if (group.length > 0) {
        groups.push(group);
      }
    });
    
    // Trier les groupes par date de la facture principale (plus récent en premier)
    groups.sort((a, b) => {
      const mainA = a.find(inv => inv.invoice_type !== "avoir") || a[0];
      const mainB = b.find(inv => inv.invoice_type !== "avoir") || b[0];
      return new Date(mainB.created_at).getTime() - new Date(mainA.created_at).getTime();
    });
    
    return groups;
  }, [filteredInvoices]);

  // Créer un tableau plat avec les factures et les séparateurs
  const invoiceRows = useMemo(() => {
    const rows: Array<{ type: 'invoice'; invoice: Invoice; index: number } | { type: 'separator'; key: string }> = [];
    
    groupedInvoices.forEach((group, groupIndex) => {
      group.forEach((invoice, invoiceIndex) => {
        rows.push({ type: 'invoice', invoice, index: invoiceIndex });
      });
      
      // Ajouter un séparateur après chaque groupe sauf le dernier
      if (groupIndex < groupedInvoices.length - 1) {
        rows.push({ type: 'separator', key: `sep-${groupIndex}` });
      }
    });
    
    return rows;
  }, [groupedInvoices]);

  // Statistiques devis
  const quoteStats = useMemo(() => {
    const total = filteredQuotes.reduce((sum, q) => sum + Number(q.total || 0), 0);
    const accepted = filteredQuotes
      .filter((q) => q.status === "accepté")
      .reduce((sum, q) => sum + Number(q.total || 0), 0);
    const sent = filteredQuotes
      .filter((q) => q.status === "envoyé")
      .reduce((sum, q) => sum + Number(q.total || 0), 0);
    const draft = filteredQuotes
      .filter((q) => q.status === "brouillon")
      .reduce((sum, q) => sum + Number(q.total || 0), 0);
    
    return { total, accepted, sent, draft };
  }, [filteredQuotes]);

  // Statistiques factures
  const invoiceStats = useMemo(() => {
    const total = filteredInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
    const paid = filteredInvoices
      .filter((inv) => inv.status === "payée")
      .reduce((sum, inv) => sum + Number(inv.total || 0), 0);
    const pending = filteredInvoices
      .filter((inv) => inv.status === "envoyée" || inv.status === "impayée")
      .reduce((sum, inv) => sum + Number(inv.total || 0), 0);
    const overdue = filteredInvoices
      .filter((inv) => isInvoiceOverdue(inv) && inv.status !== "payée")
      .reduce((sum, inv) => sum + Number(inv.total || 0), 0);
    
    return { total, paid, pending, overdue };
  }, [filteredInvoices]);

  const quoteStatusLabels: Record<QuoteStatus | "all", string> = {
    all: "Tous",
    brouillon: "Brouillon",
    envoyé: "Envoyé",
    vu: "Vu",
    accepté: "Accepté",
    refusé: "Refusé",
  };

  const invoiceStatusLabels: Record<InvoiceStatus | "all", string> = {
    all: "Tous",
    brouillon: "Brouillon",
    envoyée: "Envoyée",
    payée: "Payée",
    impayée: "Impayée",
    "en retard": "En retard",
    annulée: "Annulée",
  };

  const resetQuoteFilters = () => {
    setQuoteStatusFilter("all");
    setQuoteSearchQuery("");
    setQuoteClientFilter("all");
    setQuoteDateFrom("");
    setQuoteDateTo("");
    setQuoteAmountMin("");
    setQuoteAmountMax("");
  };

  const resetInvoiceFilters = () => {
    setInvoiceStatusFilter("all");
    setInvoiceSearchQuery("");
    setInvoiceClientFilter("all");
    setInvoiceDateFrom("");
    setInvoiceDateTo("");
    setInvoiceAmountMin("");
    setInvoiceAmountMax("");
  };

  const hasActiveQuoteFilters = quoteStatusFilter !== "all" || quoteSearchQuery || quoteClientFilter !== "all" || quoteDateFrom || quoteDateTo || quoteAmountMin || quoteAmountMax;
  const hasActiveInvoiceFilters = invoiceStatusFilter !== "all" || invoiceSearchQuery || invoiceClientFilter !== "all" || invoiceDateFrom || invoiceDateTo || invoiceAmountMin || invoiceAmountMax;

  if (isLoading && activeTab === "quotes") {
    return (
      <PageTransition>
        <PageTitle title="Devis & Factures" />
        <div className="space-y-6">
          <div className="flex items-center justify-center p-8">
            <div className="text-[#64748B]">Chargement...</div>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <PageTitle title="Devis & Factures" />
        <div className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Erreur</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <PageTitle title="Devis & Factures" />
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A]">Devis & Factures</h1>
            <p className="mt-2 text-slate-600">
              Gérez tous vos devis et factures en un seul endroit
            </p>
          </div>
          {activeTab === "quotes" && (
            <AnimatedButton
              variant="primary"
              onClick={() => router.push("/app/billing/quotes/new")}
            >
              + Créer un devis
            </AnimatedButton>
          )}
        </div>

        {/* Onglets */}
        <div className="flex gap-2 border-b border-[#E5E7EB]">
          <button
            onClick={() => setActiveTab("quotes")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "quotes"
                ? "border-[#F97316] text-[#F97316]"
                : "border-transparent text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Devis ({quotes.length})
          </button>
          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              activeTab === "invoices"
                ? "border-[#F97316] text-[#F97316]"
                : "border-transparent text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            Factures ({invoices.length})
          </button>
        </div>

        {/* Statistiques */}
        {activeTab === "quotes" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm text-[#64748B] mb-1">Total devis</div>
              <div className="text-2xl font-bold text-[#0F172A]">{formatAmount(quoteStats.total)}</div>
              <div className="text-xs text-[#64748B] mt-1">{filteredQuotes.length} devis</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-[#64748B] mb-1">Acceptés</div>
              <div className="text-2xl font-bold text-green-600">{formatAmount(quoteStats.accepted)}</div>
              <div className="text-xs text-[#64748B] mt-1">
                {filteredQuotes.filter((q) => q.status === "accepté").length} devis
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-[#64748B] mb-1">Envoyés</div>
              <div className="text-2xl font-bold text-orange-600">{formatAmount(quoteStats.sent)}</div>
              <div className="text-xs text-[#64748B] mt-1">
                {filteredQuotes.filter((q) => q.status === "envoyé").length} devis
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-[#64748B] mb-1">Brouillons</div>
              <div className="text-2xl font-bold text-gray-600">{formatAmount(quoteStats.draft)}</div>
              <div className="text-xs text-[#64748B] mt-1">
                {filteredQuotes.filter((q) => q.status === "brouillon").length} devis
              </div>
            </Card>
          </div>
        )}

        {activeTab === "invoices" && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm text-[#64748B] mb-1">Total facturé</div>
              <div className="text-2xl font-bold text-[#0F172A]">{formatAmount(invoiceStats.total)}</div>
              <div className="text-xs text-[#64748B] mt-1">{filteredInvoices.length} facture(s)</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-[#64748B] mb-1">Payées</div>
              <div className="text-2xl font-bold text-green-600">{formatAmount(invoiceStats.paid)}</div>
              <div className="text-xs text-[#64748B] mt-1">
                {filteredInvoices.filter((inv) => inv.status === "payée").length} facture(s)
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-[#64748B] mb-1">En attente</div>
              <div className="text-2xl font-bold text-orange-600">{formatAmount(invoiceStats.pending)}</div>
              <div className="text-xs text-[#64748B] mt-1">
                {filteredInvoices.filter((inv) => inv.status === "envoyée" || inv.status === "impayée").length} facture(s)
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-[#64748B] mb-1">En retard</div>
              <div className="text-2xl font-bold text-red-600">{formatAmount(invoiceStats.overdue)}</div>
              <div className="text-xs text-[#64748B] mt-1">
                {filteredInvoices.filter((inv) => isInvoiceOverdue(inv) && inv.status !== "payée").length} facture(s)
              </div>
            </Card>
          </div>
        )}

        {/* Filtres et recherche - DEVIS */}
        {activeTab === "quotes" && (
          <>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Rechercher par numéro, client..."
                  value={quoteSearchQuery}
                  onChange={(e) => setQuoteSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowQuoteFilters(!showQuoteFilters)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showQuoteFilters || hasActiveQuoteFilters
                    ? "bg-[#F97316] text-white"
                    : "bg-white border border-[#E5E7EB] text-[#64748B] hover:bg-[#F9FAFB]"
                }`}
              >
                {showQuoteFilters ? "▼" : "▶"} Filtres avancés
                {hasActiveQuoteFilters && !showQuoteFilters && (
                  <span className="ml-2 bg-white text-[#F97316] px-2 py-0.5 rounded-full text-xs">
                    {[
                      quoteStatusFilter !== "all" ? 1 : 0,
                      quoteClientFilter !== "all" ? 1 : 0,
                      quoteDateFrom ? 1 : 0,
                      quoteDateTo ? 1 : 0,
                      quoteAmountMin ? 1 : 0,
                      quoteAmountMax ? 1 : 0,
                    ].reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </button>
              {hasActiveQuoteFilters && (
                <button
                  onClick={resetQuoteFilters}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F9FAFB]"
                >
                  Réinitialiser
                </button>
              )}
            </div>

            {showQuoteFilters && (
              <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">Statut</label>
                    <select
                      value={quoteStatusFilter}
                      onChange={(e) => setQuoteStatusFilter(e.target.value as QuoteStatus | "all")}
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    >
                      {(Object.keys(quoteStatusLabels) as Array<QuoteStatus | "all">).map((status) => (
                        <option key={status} value={status}>
                          {quoteStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">Client</label>
                    <select
                      value={quoteClientFilter}
                      onChange={(e) => setQuoteClientFilter(e.target.value === "all" ? "all" : parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    >
                      <option value="all">Tous les clients</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">Date de début</label>
                    <input
                      type="date"
                      value={quoteDateFrom}
                      onChange={(e) => setQuoteDateFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">Date de fin</label>
                    <input
                      type="date"
                      value={quoteDateTo}
                      onChange={(e) => setQuoteDateTo(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">Montant minimum (€)</label>
                    <input
                      type="number"
                      value={quoteAmountMin}
                      onChange={(e) => setQuoteAmountMin(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">Montant maximum (€)</label>
                    <input
                      type="number"
                      value={quoteAmountMax}
                      onChange={(e) => setQuoteAmountMax(e.target.value)}
                      placeholder="∞"
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>
                </div>
              </Card>
            )}

          </>
        )}

        {/* Filtres et recherche - FACTURES */}
        {activeTab === "invoices" && (
          <>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder="Rechercher par numéro, client..."
                  value={invoiceSearchQuery}
                  onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowInvoiceFilters(!showInvoiceFilters)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showInvoiceFilters || hasActiveInvoiceFilters
                    ? "bg-[#F97316] text-white"
                    : "bg-white border border-[#E5E7EB] text-[#64748B] hover:bg-[#F9FAFB]"
                }`}
              >
                {showInvoiceFilters ? "▼" : "▶"} Filtres avancés
                {hasActiveInvoiceFilters && !showInvoiceFilters && (
                  <span className="ml-2 bg-white text-[#F97316] px-2 py-0.5 rounded-full text-xs">
                    {[
                      invoiceStatusFilter !== "all" ? 1 : 0,
                      invoiceClientFilter !== "all" ? 1 : 0,
                      invoiceDateFrom ? 1 : 0,
                      invoiceDateTo ? 1 : 0,
                      invoiceAmountMin ? 1 : 0,
                      invoiceAmountMax ? 1 : 0,
                    ].reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </button>
              {hasActiveInvoiceFilters && (
                <button
                  onClick={resetInvoiceFilters}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-[#F9FAFB]"
                >
                  Réinitialiser
                </button>
              )}
            </div>

            {showInvoiceFilters && (
              <Card className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">Statut</label>
                    <select
                      value={invoiceStatusFilter}
                      onChange={(e) => setInvoiceStatusFilter(e.target.value as InvoiceStatus | "all")}
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    >
                      {(Object.keys(invoiceStatusLabels) as Array<InvoiceStatus | "all">).map((status) => (
                        <option key={status} value={status}>
                          {invoiceStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">Client</label>
                    <select
                      value={invoiceClientFilter}
                      onChange={(e) => setInvoiceClientFilter(e.target.value === "all" ? "all" : parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    >
                      <option value="all">Tous les clients</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">Date de début</label>
                    <input
                      type="date"
                      value={invoiceDateFrom}
                      onChange={(e) => setInvoiceDateFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">Date de fin</label>
                    <input
                      type="date"
                      value={invoiceDateTo}
                      onChange={(e) => setInvoiceDateTo(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">Montant minimum (€)</label>
                    <input
                      type="number"
                      value={invoiceAmountMin}
                      onChange={(e) => setInvoiceAmountMin(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] mb-2">Montant maximum (€)</label>
                    <input
                      type="number"
                      value={invoiceAmountMax}
                      onChange={(e) => setInvoiceAmountMax(e.target.value)}
                      placeholder="∞"
                      className="w-full px-3 py-2 border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>
                </div>
              </Card>
            )}

          </>
        )}

        {/* Tableau DEVIS */}
        {activeTab === "quotes" && (
          filteredQuotes.length === 0 ? (
            <Card>
              <EmptyState
                title="Aucun devis"
                description={
                  quoteStatusFilter === "all"
                    ? "Créez votre premier devis pour commencer."
                    : `Aucun devis avec le statut "${quoteStatusLabels[quoteStatusFilter]}".`
                }
                action={
                  quoteStatusFilter === "all" && (
                    <button
                      onClick={() => router.push("/app/billing/quotes/new")}
                      className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
                    >
                      Créer un devis
                    </button>
                  )
                }
                icon="📄"
              />
            </Card>
          ) : (
            <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-[#F9FAFB]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                        Numéro
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {filteredQuotes.map((quote) => (
                      <tr
                        key={quote.id}
                        className="hover:bg-[#F9FAFB] cursor-pointer"
                        onClick={() => router.push(`/app/billing/quotes/${quote.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0F172A]">
                          {quote.number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#0F172A]">
                          <Link
                            href={`/app/clients?client=${encodeURIComponent(quote.client_name)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-[#F97316]"
                          >
                            {quote.client_name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0F172A]">
                          {formatAmount(quote.total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748B]">
                          {new Date(quote.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getQuoteStatusColor(
                              quote.status
                            )}`}
                          >
                            {quoteStatusLabels[quote.status]}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => router.push(`/app/billing/quotes/${quote.id}`)}
                              className="text-[#64748B] hover:text-[#0F172A] font-medium"
                            >
                              Voir
                            </button>
                            <span className="text-[#E5E7EB]">|</span>
                            <button
                              onClick={async () => {
                                if (!token) return;
                                try {
                                  const blob = await downloadQuotePDF(token, quote.id);
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
                                  alert(`Erreur lors du téléchargement du PDF: ${err.message || "Erreur inconnue"}`);
                                }
                              }}
                              className="text-blue-600 hover:text-blue-700 font-medium"
                            >
                              PDF
                            </button>
                            {quote.status === "envoyé" && (
                              <>
                                <span className="text-[#E5E7EB]">|</span>
                                <button
                                  onClick={() => router.push(`/app/relances?quote=${quote.id}`)}
                                  className="text-purple-600 hover:text-purple-700 font-medium"
                                >
                                  ✨ Relancer IA
                                </button>
                              </>
                            )}
                            {(quote.status === "accepté" || quote.status === "envoyé") && (
                              <>
                                <span className="text-[#E5E7EB]">|</span>
                                <button
                                  onClick={() => {
                                    setQuoteToConvert(quote);
                                    setShowConvertModal(true);
                                  }}
                                  className="text-green-600 hover:text-green-700 font-medium"
                                >
                                  💰 Facture
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {/* Tableau FACTURES */}
        {activeTab === "invoices" && (
          filteredInvoices.length === 0 ? (
            <Card>
              <EmptyState
                title="Aucune facture"
                description={
                  invoiceStatusFilter === "all"
                    ? "Créez votre première facture pour commencer."
                    : `Aucune facture avec le statut "${invoiceStatusLabels[invoiceStatusFilter]}".`
                }
                action={
                  invoiceStatusFilter === "all" && (
                    <button
                      onClick={() => router.push("/app/billing/invoices/new")}
                      className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
                    >
                      Créer une facture
                    </button>
                  )
                }
                icon="💰"
              />
            </Card>
          ) : (
            <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead className="bg-[#F9FAFB]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                        Numéro
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                        Montant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                        Montant payé
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {invoiceRows.map((row) => {
                      if (row.type === 'separator') {
                        return (
                          <tr key={row.key}>
                            <td colSpan={7} className="px-6 py-2 bg-[#F9FAFB] border-t-2 border-[#E5E7EB]">
                              <div className="h-px"></div>
                            </td>
                          </tr>
                        );
                      }
                      
                      const { invoice, index: invoiceIndex } = row;
                      return (
                        <tr
                          key={invoice.id}
                          className={`hover:bg-[#F9FAFB] cursor-pointer ${
                            invoiceIndex > 0 ? "bg-[#FAFBFC]" : ""
                          }`}
                          onClick={() => router.push(`/app/billing/invoices/${invoice.id}`)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0F172A]">
                            {invoiceIndex > 0 && (
                              <span className="inline-block w-2 h-2 rounded-full bg-purple-300 mr-2" title="Document lié"></span>
                            )}
                            {invoice.number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#0F172A]">
                            <Link
                              href={`/app/clients?client=${encodeURIComponent(invoice.client_name)}`}
                              onClick={(e) => e.stopPropagation()}
                              className="hover:text-[#F97316]"
                            >
                              {invoice.client_name}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#0F172A]">
                            {formatAmount(invoice.total)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748B]">
                            {formatAmount(invoice.amount_paid)} / {formatAmount(invoice.total)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748B]">
                            {new Date(invoice.created_at).toLocaleDateString("fr-FR")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {invoice.invoice_type === "avoir" ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Avoir
                              </span>
                            ) : (
                              <>
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getInvoiceStatusColor(
                                    invoice.status
                                  )}`}
                                >
                                  {invoiceStatusLabels[invoice.status]}
                                </span>
                                {(invoice.invoice_type === "facture" || !invoice.invoice_type) && isInvoiceOverdue(invoice) && (
                                  <span className="ml-2 text-xs text-red-600">
                                    ({Math.floor((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))} jours)
                                  </span>
                                )}
                              </>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div
                              className="flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => router.push(`/app/billing/invoices/${invoice.id}`)}
                                className="text-[#64748B] hover:text-[#0F172A] font-medium"
                              >
                                Voir
                              </button>
                              <span className="text-[#E5E7EB]">|</span>
                              <button
                                onClick={() => {
                                  // TODO: Générer PDF
                                  logger.log("Download PDF:", invoice.number);
                                }}
                                className="text-blue-600 hover:text-blue-700 font-medium"
                              >
                                PDF
                              </button>
                              {invoice.status !== "payée" && (
                                <>
                                  <span className="text-[#E5E7EB]">|</span>
                                  <button
                                    onClick={() => router.push(`/app/relances?invoice=${invoice.id}`)}
                                    className="text-purple-600 hover:text-purple-700 font-medium"
                                  >
                                    ✨ Relancer IA
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>

      {/* Modal de confirmation de conversion */}
      <Modal
        isOpen={showConvertModal}
        onClose={() => {
          setShowConvertModal(false);
          setQuoteToConvert(null);
        }}
        title="Convertir le devis en facture"
        size="md"
      >
        <div className="w-full space-y-4">
          <p className="text-[#0F172A] text-center">
            Voulez-vous convertir ce devis en facture ? La facture sera créée automatiquement.
          </p>
          {quoteToConvert && (
            <div className="bg-[#F9FAFB] p-4 rounded-lg">
              <p className="text-sm text-[#64748B] mb-1">Devis</p>
              <p className="text-sm font-medium text-[#0F172A]">{quoteToConvert.number}</p>
              <p className="text-sm text-[#64748B] mt-2 mb-1">Montant</p>
              <p className="text-sm font-medium text-[#0F172A]">{formatAmount(quoteToConvert.total)}</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowConvertModal(false);
                setQuoteToConvert(null);
              }}
              className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
            >
              Annuler
            </button>
            <button
              onClick={async () => {
                if (!token || !quoteToConvert) return;
                
                try {
                  const invoice = await convertQuoteToInvoice(token, quoteToConvert.id);
                  setShowConvertModal(false);
                  setQuoteToConvert(null);
                  router.push(`/app/billing/invoices/${invoice.id}`);
                } catch (err: any) {
                  const errMsg = err.message || "Erreur inconnue";
                  setShowConvertModal(false);
                  setQuoteToConvert(null);
                  
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
    </PageTransition>
  );
}
