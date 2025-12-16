// Utilitaires pour le module Devis & Factures

import { BillingNumbering, Quote, Invoice, BillingLine } from "./types";

/**
 * Génère le prochain numéro de devis
 */
export function generateQuoteNumber(lastNumber: number, year: number): string {
  const nextNumber = lastNumber + 1;
  return `DEV-${year}-${String(nextNumber).padStart(3, "0")}`;
}

/**
 * Génère le prochain numéro de facture
 */
export function generateInvoiceNumber(lastNumber: number, year: number): string {
  const nextNumber = lastNumber + 1;
  return `FAC-${year}-${String(nextNumber).padStart(3, "0")}`;
}

/**
 * Calcule le total d'une ligne (quantité * prix unitaire * (1 + TVA))
 */
export function calculateLineTotal(line: BillingLine): number {
  const subtotal = line.quantity * line.unitPrice;
  const tax = subtotal * (line.taxRate / 100);
  return subtotal + tax;
}

/**
 * Calcule le sous-total de toutes les lignes
 */
export function calculateSubtotal(lines: BillingLine[]): number {
  return lines.reduce((sum, line) => {
    return sum + line.quantity * line.unitPrice;
  }, 0);
}

/**
 * Calcule le total de la TVA
 */
export function calculateTax(lines: BillingLine[]): number {
  return lines.reduce((sum, line) => {
    const subtotal = line.quantity * line.unitPrice;
    return sum + subtotal * (line.taxRate / 100);
  }, 0);
}

/**
 * Calcule le total TTC
 */
export function calculateTotal(lines: BillingLine[]): number {
  return calculateSubtotal(lines) + calculateTax(lines);
}

/**
 * Formate un montant en euros
 */
export function formatAmount(amount: number | string | null | undefined): string {
  // Convertir en nombre si c'est une chaîne
  const numAmount = typeof amount === "string" ? parseFloat(amount) : (amount || 0);
  
  // Vérifier que c'est un nombre valide
  if (isNaN(numAmount)) {
    return "0,00 €";
  }
  
  return `${numAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

/**
 * Récupère la couleur du statut pour un devis
 */
export function getQuoteStatusColor(status: Quote["status"]): string {
  const colors = {
    brouillon: "bg-slate-100 text-slate-800",
    envoyé: "bg-blue-100 text-blue-800",
    accepté: "bg-green-100 text-green-800",
    refusé: "bg-red-100 text-red-800",
    vu: "bg-blue-100 text-blue-800",
  };
  return colors[status] || colors.brouillon;
}

/**
 * Récupère la couleur du statut pour une facture
 */
export function getInvoiceStatusColor(status: Invoice["status"]): string {
  const colors: Record<Invoice["status"], string> = {
    brouillon: "bg-slate-100 text-slate-800",
    envoyée: "bg-blue-100 text-blue-800",
    payée: "bg-green-100 text-green-800",
    impayée: "bg-orange-100 text-orange-800",
    "en retard": "bg-red-100 text-red-800",
    annulée: "bg-gray-100 text-gray-800",
  };
  return colors[status] || colors.impayée;
}

/**
 * Vérifie si une facture est en retard
 */
export function isInvoiceOverdue(invoice: Invoice): boolean {
  if (invoice.status === "payée") return false;
  const dueDate = new Date(invoice.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
}

/**
 * Calcule le nombre de jours de retard
 */
export function getDaysOverdue(invoice: Invoice): number {
  if (!isInvoiceOverdue(invoice)) return 0;
  const dueDate = new Date(invoice.due_date);
  const today = new Date();
  const diffTime = today.getTime() - dueDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

