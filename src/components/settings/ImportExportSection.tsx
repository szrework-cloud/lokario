"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { useAuth } from "@/hooks/useAuth";
import { apiGet } from "@/lib/api";
import { Download, FileSpreadsheet, FileJson } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export function ImportExportSection() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
      // Appel API pour exporter toutes les données
      const data = await apiGet("/users/me/export", token);
      
      // Créer un fichier JSON téléchargeable
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lokario-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast("Vos données ont été exportées avec succès", "success");
    } catch (error: any) {
      console.error("Erreur lors de l'export:", error);
      showToast("Erreur lors de l'export des données", "error");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportClients = async () => {
    setIsExporting(true);
    try {
      // Appel API pour exporter les clients
      const { getClients } = await import("@/services/clientsService");
      const clients = await getClients(token);
      
      // Convertir en CSV
      const headers = ["Nom", "Email", "Téléphone", "Adresse", "Ville", "Code postal", "Pays", "SIRET", "TVA"];
      const csvRows = [
        headers.join(","),
        ...clients.map(client => [
          `"${client.name || ""}"`,
          `"${client.email || ""}"`,
          `"${client.phone || ""}"`,
          `"${client.address || ""}"`,
          `"${client.city || ""}"`,
          `"${client.postal_code || ""}"`,
          `"${client.country || ""}"`,
          `"${client.siret || ""}"`,
          `"${client.vat_number || ""}"`
        ].join(","))
      ];
      
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lokario-clients-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showToast(`${clients.length} clients exportés avec succès`, "success");
    } catch (error: any) {
      console.error("Erreur lors de l'export des clients:", error);
      showToast("Erreur lors de l'export des clients", "error");
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-[#0F172A]">
          Exporter mes données
        </h3>
        <p className="text-sm text-[#64748B] mt-1">
          Exportez vos données pour faciliter la sauvegarde ou la migration
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export */}
        <div className="border border-[#E5E7EB] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Download className="w-5 h-5 text-[#F97316]" />
            <h4 className="text-sm font-semibold text-[#0F172A]">
              Exporter mes données
            </h4>
          </div>
          <p className="text-sm text-[#64748B] mb-4">
            Téléchargez vos données au format JSON (export complet) ou CSV (clients uniquement).
          </p>
          <div className="flex flex-wrap gap-3">
            <AnimatedButton
              variant="secondary"
              onClick={handleExportAll}
              disabled={isExporting}
              loading={isExporting}
            >
              <FileJson className="w-4 h-4 mr-2" />
              Exporter tout (JSON)
            </AnimatedButton>
            <AnimatedButton
              variant="secondary"
              onClick={handleExportClients}
              disabled={isExporting}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exporter les clients (CSV)
            </AnimatedButton>
          </div>
        </div>


        {/* Informations */}
        <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
          <h4 className="text-sm font-semibold text-[#0F172A] mb-2">
            Formats supportés
          </h4>
          <ul className="text-xs text-[#64748B] space-y-2">
            <li className="flex items-start gap-2">
              <FileJson className="w-4 h-4 mt-0.5 text-[#F97316]" />
              <div>
                <strong>JSON :</strong> Export complet de toutes vos données (clients, projets, tâches, factures, etc.)
              </div>
            </li>
            <li className="flex items-start gap-2">
              <FileSpreadsheet className="w-4 h-4 mt-0.5 text-[#F97316]" />
              <div>
                <strong>CSV :</strong> Export des clients uniquement. Format : Nom, Email, Téléphone, Adresse, Ville, Code postal, Pays, SIRET, TVA
              </div>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

