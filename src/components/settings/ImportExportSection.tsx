"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";
import { apiGet, apiUploadFile } from "@/lib/api";
import { Download, FileSpreadsheet, FileJson, Upload, Info } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export function ImportExportSection() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showCsvInfoModal, setShowCsvInfoModal] = useState(false);
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
      const headers = ["Nom", "Email", "Téléphone", "Adresse", "Ville", "Code postal", "Pays", "SIRET"];
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
          `"${client.siret || ""}"`
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
        <div className="border border-[#E5E7EB] rounded-lg p-6">
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
              onClick={() => setShowCsvInfoModal(true)}
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
                <strong>CSV :</strong> Import/Export des clients uniquement. 
                <br />
                <strong>Format attendu :</strong> Nom, Email, Téléphone, Adresse, Ville, Code postal, Pays, SIRET
                <br />
                <strong>Note :</strong> L'export génère un fichier CSV que vous pouvez réimporter directement. Les colonnes sont insensibles à la casse. Les clients existants (par email ou nom) seront mis à jour automatiquement.
              </div>
            </li>
          </ul>
        </div>
      </CardContent>

      {/* Modal d'information sur le format CSV */}
      <Modal
        isOpen={showCsvInfoModal}
        onClose={() => setShowCsvInfoModal(false)}
        title="Format CSV pour l'import de clients"
        size="lg"
      >
        <div className="w-full space-y-6 px-3 py-3">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  Comment organiser votre fichier CSV
                </h3>
                <p className="text-sm text-blue-800">
                  Votre fichier CSV doit contenir les colonnes suivantes (dans l'ordre ou non, insensible à la casse) :
                </p>
              </div>
            </div>
          </div>

          {/* Format du CSV */}
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-4">
            <h4 className="text-sm font-semibold text-[#0F172A] mb-3">
              Colonnes requises :
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#F97316] rounded-full"></span>
                <span className="text-[#64748B]"><strong>Nom</strong> (requis si pas d'email)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#F97316] rounded-full"></span>
                <span className="text-[#64748B]"><strong>Email</strong> (requis si pas de nom)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span className="text-[#64748B]">Téléphone</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span className="text-[#64748B]">Adresse</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span className="text-[#64748B]">Ville</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span className="text-[#64748B]">Code postal</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span className="text-[#64748B]">Pays</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                <span className="text-[#64748B]">SIRET</span>
              </div>
            </div>
          </div>

          {/* Exemple */}
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-4">
            <h4 className="text-sm font-semibold text-[#0F172A] mb-3">
              Exemple de fichier CSV :
            </h4>
            <div className="bg-white border border-[#E5E7EB] rounded p-3 overflow-x-auto">
              <pre className="text-xs text-[#64748B] font-mono whitespace-pre">
{`Nom,Email,Téléphone,Adresse,Ville,Code postal,Pays,SIRET
"Jean Dupont","jean.dupont@example.com","01 23 45 67 89","123 Rue de la Paix","Paris","75001","France","12345678901234"
"Marie Martin","marie.martin@example.com","06 12 34 56 78","456 Avenue des Champs","Lyon","69001","France","98765432109876"`}
              </pre>
            </div>
          </div>

          {/* Notes importantes */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-yellow-900 mb-2">
              Notes importantes :
            </h4>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              <li>Les colonnes sont <strong>insensibles à la casse</strong> (Nom, nom, NOM fonctionnent)</li>
              <li>Au minimum, <strong>Nom</strong> ou <strong>Email</strong> est requis pour chaque ligne</li>
              <li>Les clients existants (par email ou nom) seront <strong>mis à jour</strong> automatiquement</li>
              <li>Le fichier doit être encodé en <strong>UTF-8</strong> ou <strong>Latin-1</strong></li>
              <li>Vous pouvez utiliser le fichier exporté comme modèle</li>
            </ul>
          </div>

          {/* Boutons d'action */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
            <AnimatedButton
              variant="secondary"
              onClick={() => setShowCsvInfoModal(false)}
            >
              Annuler
            </AnimatedButton>
            <AnimatedButton
              variant="primary"
              onClick={() => {
                setShowCsvInfoModal(false);
                // Petit délai pour que le modal se ferme avant d'ouvrir le sélecteur de fichier
                setTimeout(() => {
                  fileInputRef.current?.click();
                }, 100);
              }}
            >
              <Upload className="w-4 h-4 mr-2" />
              Choisir un fichier CSV
            </AnimatedButton>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

