"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { useAuth } from "@/hooks/useAuth";
import { apiGet, apiUploadFile } from "@/lib/api";
import { Download, FileSpreadsheet, FileJson, Upload } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export function ImportExportSection() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Appel API direct pour récupérer les données brutes (sans mapping)
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${API_URL}/clients?limit=10000`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des clients");
      }

      const clients = await response.json();
      
      // Convertir en CSV avec tous les champs disponibles
      const headers = ["Nom", "Email", "Téléphone", "Adresse", "Ville", "Code postal", "Pays", "SIRET", "TVA"];
      const csvRows = [
        headers.join(","),
        ...clients.map((client: any) => [
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

  const handleImportClients = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier que c'est un fichier CSV
    if (!file.name.endsWith('.csv')) {
      showToast("Le fichier doit être au format CSV", "error");
      return;
    }

    setIsImporting(true);
    try {
      const result = await apiUploadFile<{
        message: string;
        created: number;
        updated: number;
        errors: number;
        error_details: string[];
      }>("/clients/import", file, token);

      let message = `Import terminé : ${result.created} créé(s), ${result.updated} mis à jour`;
      if (result.errors > 0) {
        message += `, ${result.errors} erreur(s)`;
        if (result.error_details.length > 0) {
          console.warn("Erreurs d'import:", result.error_details);
        }
      }

      showToast(message, result.errors > 0 ? "info" : "success");
      
      // Réinitialiser l'input pour permettre de réimporter le même fichier
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("Erreur lors de l'import des clients:", error);
      showToast(error.message || "Erreur lors de l'import des clients", "error");
    } finally {
      setIsImporting(false);
    }
  };


  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-[#0F172A]">
          Importer / Exporter mes données
        </h3>
        <p className="text-sm text-[#64748B] mt-1">
          Importez ou exportez vos données pour faciliter la sauvegarde ou la migration
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Import */}
        <div className="border border-[#E5E7EB] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Upload className="w-5 h-5 text-[#F97316]" />
            <h4 className="text-sm font-semibold text-[#0F172A]">
              Importer des clients
            </h4>
          </div>
          <p className="text-sm text-[#64748B] mb-4">
            Importez vos clients depuis un fichier CSV. Format attendu : Nom, Email, Téléphone, Adresse, Ville, Code postal, Pays, SIRET, TVA
          </p>
          <div className="flex flex-wrap gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportClients}
              className="hidden"
              id="csv-import-input"
            />
            <AnimatedButton
              variant="primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              loading={isImporting}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isImporting ? "Import en cours..." : "Importer des clients (CSV)"}
            </AnimatedButton>
          </div>
        </div>

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
                <strong>CSV :</strong> Import/Export des clients uniquement. Format : Nom, Email, Téléphone, Adresse, Ville, Code postal, Pays, SIRET, TVA. Les clients existants (par email ou nom) seront mis à jour.
              </div>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

