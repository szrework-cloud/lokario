"use client";

import { ClientInfo } from "./types";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import Link from "next/link";

interface ClientInfoPanelProps {
  clientInfo: ClientInfo | null;
  onClose: () => void;
}

export function ClientInfoPanel({ clientInfo, onClose }: ClientInfoPanelProps) {
  if (!clientInfo) return null;

  const statusColors = {
    nouveau: "bg-blue-100 text-blue-800",
    récurrent: "bg-green-100 text-green-800",
    VIP: "bg-purple-100 text-purple-800",
  };

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-[#E5E7EB] shadow-xl z-50 overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#0F172A]">Fiche client</h2>
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-[#0F172A]"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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

        {/* Nom et statut */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
            {clientInfo.name}
          </h3>
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${
              statusColors[clientInfo.status]
            }`}
          >
            {clientInfo.status}
          </span>
        </div>

        {/* Informations de contact */}
        <Card className="mb-4">
          <CardHeader>
            <h4 className="text-sm font-semibold text-[#0F172A]">Contact</h4>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {clientInfo.email && (
              <div>
                <span className="text-[#64748B]">Email:</span>{" "}
                <a
                  href={`mailto:${clientInfo.email}`}
                  className="text-[#F97316] hover:underline"
                >
                  {clientInfo.email}
                </a>
              </div>
            )}
            {clientInfo.phone && (
              <div>
                <span className="text-[#64748B]">Téléphone:</span>{" "}
                <a
                  href={`tel:${clientInfo.phone}`}
                  className="text-[#F97316] hover:underline"
                >
                  {clientInfo.phone}
                </a>
              </div>
            )}
            {clientInfo.address && (
              <div>
                <span className="text-[#64748B]">Adresse:</span>{" "}
                <span className="text-[#0F172A]">{clientInfo.address}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Statistiques */}
        <Card className="mb-4">
          <CardHeader>
            <h4 className="text-sm font-semibold text-[#0F172A]">Statistiques</h4>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {clientInfo.totalPurchases !== undefined && (
              <div className="flex justify-between">
                <span className="text-[#64748B]">Total achats:</span>
                <span className="font-medium text-[#0F172A]">
                  {clientInfo.totalPurchases} €
                </span>
              </div>
            )}
            {clientInfo.lastPurchaseDate && (
              <div className="flex justify-between">
                <span className="text-[#64748B]">Dernier achat:</span>
                <span className="font-medium text-[#0F172A]">
                  {new Date(clientInfo.lastPurchaseDate).toLocaleDateString("fr-FR")}
                </span>
              </div>
            )}
            {clientInfo.invoicesCount !== undefined && (
              <div className="flex justify-between">
                <span className="text-[#64748B]">Factures:</span>
                <Link
                  href={`/app/billing?client=${encodeURIComponent(clientInfo.name)}`}
                  className="font-medium text-[#F97316] hover:underline"
                >
                  {clientInfo.invoicesCount} facture{clientInfo.invoicesCount > 1 ? "s" : ""}
                </Link>
              </div>
            )}
            {clientInfo.quotesCount !== undefined && (
              <div className="flex justify-between">
                <span className="text-[#64748B]">Devis:</span>
                <Link
                  href={`/app/billing?client=${encodeURIComponent(clientInfo.name)}&type=quotes`}
                  className="font-medium text-[#F97316] hover:underline"
                >
                  {clientInfo.quotesCount} devis
                </Link>
              </div>
            )}
            {clientInfo.projectsCount !== undefined && (
              <div className="flex justify-between">
                <span className="text-[#64748B]">Projets:</span>
                <Link
                  href={`/app/projects?client=${encodeURIComponent(clientInfo.name)}`}
                  className="font-medium text-[#F97316] hover:underline"
                >
                  {clientInfo.projectsCount} projet{clientInfo.projectsCount > 1 ? "s" : ""}
                </Link>
              </div>
            )}
            {clientInfo.conversationsCount !== undefined && (
              <div className="flex justify-between">
                <span className="text-[#64748B]">Conversations:</span>
                <span className="font-medium text-[#0F172A]">
                  {clientInfo.conversationsCount}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions rapides */}
        <div className="space-y-2">
          <Link
            href={`/app/clients?id=${clientInfo.id}`}
            className="block w-full text-center rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#F9FAFB]"
          >
            Voir la fiche complète
          </Link>
          <Link
            href={`/app/billing?new=true&client=${encodeURIComponent(clientInfo.name)}`}
            className="block w-full text-center rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110"
          >
            Créer un devis
          </Link>
        </div>
      </div>
    </div>
  );
}

