"use client";

import { useState, useEffect } from "react";
import { InvoiceAuditLog as InvoiceAuditLogType } from "./types";
import { getInvoiceAuditLogs } from "@/services/invoicesService";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Loader } from "@/components/ui/Loader";

interface InvoiceAuditLogProps {
  invoiceId: number;
}

export function InvoiceAuditLog({ invoiceId }: InvoiceAuditLogProps) {
  const { token } = useAuth();
  const [logs, setLogs] = useState<InvoiceAuditLogType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLogs = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const auditLogs = await getInvoiceAuditLogs(token, invoiceId);
        setLogs(auditLogs);
      } catch (err: any) {
        console.error("Erreur lors du chargement des logs:", err);
        setError(err.message || "Erreur lors du chargement de l'historique");
      } finally {
        setIsLoading(false);
      }
    };

    loadLogs();
  }, [invoiceId, token]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "created":
        return "bg-green-100 text-green-800";
      case "deleted":
        return "bg-red-100 text-red-800";
      case "status_changed":
        return "bg-blue-100 text-blue-800";
      case "archived":
        return "bg-gray-100 text-gray-800";
      case "credit_note_created":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      created: "Création",
      updated: "Modification",
      field_updated: "Modification",
      status_changed: "Changement de statut",
      deleted: "Suppression",
      archived: "Archivage",
      credit_note_created: "Avoir créé",
    };
    return labels[action] || action;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-[#0F172A]">Historique des modifications</h3>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-[#0F172A]">Historique des modifications</h3>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-[#0F172A]">Historique des modifications</h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[#64748B]">Aucune modification enregistrée</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-[#0F172A]">Historique des modifications</h3>
        <p className="text-sm text-[#64748B] mt-1">
          Toutes les modifications apportées à cette facture sont enregistrées
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-4 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(log.action)}`}
                  >
                    {getActionLabel(log.action)}
                  </span>
                  {log.field_name && (
                    <span className="text-xs text-[#64748B]">
                      Champ: {log.field_name}
                    </span>
                  )}
                </div>
                <span className="text-xs text-[#64748B]">{formatDate(log.timestamp)}</span>
              </div>

              {log.description && (
                <p className="text-sm text-[#0F172A] mb-2">{log.description}</p>
              )}

              {log.old_value && log.new_value && (
                <div className="mt-2 p-2 bg-[#F9FAFB] rounded text-xs">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <span className="text-[#64748B]">Ancienne valeur:</span>
                      <p className="text-[#0F172A] font-mono mt-1 break-all">
                        {log.old_value.length > 100
                          ? `${log.old_value.substring(0, 100)}...`
                          : log.old_value}
                      </p>
                    </div>
                    <div className="flex-1">
                      <span className="text-[#64748B]">Nouvelle valeur:</span>
                      <p className="text-[#0F172A] font-mono mt-1 break-all">
                        {log.new_value.length > 100
                          ? `${log.new_value.substring(0, 100)}...`
                          : log.new_value}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E5E7EB]">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#64748B]">
                    Par: {log.user_name || `Utilisateur #${log.user_id}`}
                  </span>
                </div>
                {log.ip_address && (
                  <span className="text-xs text-[#64748B]">
                    IP: {log.ip_address}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
