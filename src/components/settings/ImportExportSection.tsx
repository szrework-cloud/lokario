"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";
import { apiGet, apiUploadFile } from "@/lib/api";
import { Download, FileSpreadsheet, FileJson, Upload, Info, AlertCircle, X } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export function ImportExportSection() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showCsvInfoModal, setShowCsvInfoModal] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importErrorDetails, setImportErrorDetails] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    errors: number;
  } | null>(null);
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
      
      // Fonction pour échapper correctement les valeurs CSV
      const escapeCsvValue = (value: any): string => {
        if (value === null || value === undefined) return "";
        const str = String(value);
        // Si la valeur contient des guillemets, des virgules, ou des retours à la ligne, il faut la mettre entre guillemets
        // et échapper les guillemets doubles
        if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      
      // Convertir en CSV avec tous les champs disponibles
      const headers = ["Nom", "Email", "Téléphone", "Adresse", "Ville", "Code postal", "Pays", "SIRET"];
      const csvRows = [
        headers.map(escapeCsvValue).join(","),
        ...clients.map((client: any) => [
          escapeCsvValue(client.name),
          escapeCsvValue(client.email),
          escapeCsvValue(client.phone),
          escapeCsvValue(client.address),
          escapeCsvValue(client.city),
          escapeCsvValue(client.postal_code),
          escapeCsvValue(client.country),
          escapeCsvValue(client.siret)
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

    // Réinitialiser les erreurs précédentes
    setImportError(null);
    setImportErrorDetails([]);
    setImportResult(null);

    // Vérifier que c'est un fichier CSV
    if (!file.name.endsWith('.csv')) {
      const errorMsg = "Le fichier doit être au format CSV";
      setImportError(errorMsg);
      showToast(errorMsg, "error");
      return;
    }

    // Afficher un message de début
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    showToast(`Import en cours... (${fileSizeMB} MB)`, "info");

    setIsImporting(true);
    try {
      console.log(`[Import CSV] Début import: ${file.name} (${fileSizeMB} MB)`);
      
      const result = await apiUploadFile<{
        message: string;
        created: number;
        updated: number;
        errors: number;
        error_details: string[];
      }>("/clients/import", file, token);

      console.log(`[Import CSV] Résultat:`, result);

      // Stocker le résultat pour l'affichage
      setImportResult({
        created: result.created,
        updated: result.updated,
        errors: result.errors
      });

      let message = `Import terminé : ${result.created} créé(s), ${result.updated} mis à jour`;
      if (result.errors > 0) {
        message += `, ${result.errors} erreur(s)`;
        setImportErrorDetails(result.error_details || []);
      }

      showToast(message, result.errors > 0 ? "info" : "success");
      
      // Réinitialiser l'input pour permettre de réimporter le même fichier
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      console.error("Erreur lors de l'import des clients:", error);
      const errorMessage = error.message || "Erreur lors de l'import des clients";
      setImportError(errorMessage);
      showToast(errorMessage, "error");
      console.error("Détails de l'erreur:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Fonction pour formater les messages d'erreur avec les emojis et sections
  const formatErrorMessage = (message: string): React.ReactNode => {
    // Diviser le message en lignes
    const lines = message.split('\n');
    
    let inList = false;
    let listItems: string[] = [];
    const elements: React.ReactNode[] = [];
    
    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 ml-2 mt-1">
            {listItems.map((item, idx) => (
              <li key={idx} className="text-sm text-gray-700">
                {item}
              </li>
            ))}
          </ul>
        );
        listItems = [];
      }
      inList = false;
    };
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Ignorer les lignes vides
      if (!trimmedLine) {
        flushList();
        return;
      }
      
      // Titre avec emoji
      if (trimmedLine.startsWith('❌')) {
        flushList();
        elements.push(
          <h4 key={index} className="font-semibold text-red-700 text-base mt-3 first:mt-0">
            {trimmedLine}
          </h4>
        );
        return;
      }
      
      // Section Causes probables
      if (trimmedLine.startsWith('🔍')) {
        flushList();
        elements.push(
          <h5 key={index} className="font-semibold text-gray-800 text-sm mt-3">
            {trimmedLine}
          </h5>
        );
        inList = true;
        return;
      }
      
      // Section Solutions
      if (trimmedLine.startsWith('✅')) {
        flushList();
        elements.push(
          <h5 key={index} className="font-semibold text-green-700 text-sm mt-3">
            {trimmedLine}
          </h5>
        );
        inList = true;
        return;
      }
      
      // Section Astuce
      if (trimmedLine.startsWith('💡')) {
        flushList();
        elements.push(
          <p key={index} className="text-sm text-blue-700 italic mt-3 bg-blue-50 p-2 rounded">
            {trimmedLine}
          </p>
        );
        return;
      }
      
      // Section Colonnes
      if (trimmedLine.startsWith('📋')) {
        flushList();
        elements.push(
          <p key={index} className="text-sm text-gray-700 font-medium mt-2">
            {trimmedLine}
          </p>
        );
        return;
      }
      
      // Liste à puces
      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
        if (!inList) {
          flushList();
          inList = true;
        }
        listItems.push(trimmedLine.substring(1).trim());
        return;
      }
      
      // Numérotation
      if (/^\d+\./.test(trimmedLine)) {
        if (!inList) {
          flushList();
          inList = true;
        }
        listItems.push(trimmedLine.substring(trimmedLine.indexOf('.') + 1).trim());
        return;
      }
      
      // Texte normal
      flushList();
      elements.push(
        <p key={index} className="text-sm text-gray-700 mt-1">
          {trimmedLine}
        </p>
      );
    });
    
    flushList();
    
    return <div className="space-y-1">{elements}</div>;
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

          {/* Résultat de l'import */}
          {importResult && (
            <div className={`mt-4 p-4 rounded-lg border ${
              importResult.errors > 0 
                ? 'bg-yellow-50 border-yellow-200' 
                : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-start gap-2">
                <Info className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  importResult.errors > 0 ? 'text-yellow-600' : 'text-green-600'
                }`} />
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    importResult.errors > 0 ? 'text-yellow-900' : 'text-green-900'
                  }`}>
                    Import terminé : {importResult.created} créé(s), {importResult.updated} mis à jour
                    {importResult.errors > 0 && `, ${importResult.errors} erreur(s)`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Erreur principale */}
          {importError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-red-900 mb-2">
                      Erreur lors de l'import
                    </h4>
                    <button
                      onClick={() => setImportError(null)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      aria-label="Fermer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-sm text-red-800 whitespace-pre-wrap">
                    {formatErrorMessage(importError)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Détails des erreurs de validation */}
          {importErrorDetails.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-yellow-900 mb-2">
                      Erreurs de validation ({importErrorDetails.length})
                    </h4>
                    <button
                      onClick={() => setImportErrorDetails([])}
                      className="text-yellow-600 hover:text-yellow-800 transition-colors"
                      aria-label="Fermer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <ul className="text-sm text-yellow-800 space-y-1 max-h-60 overflow-y-auto">
                    {importErrorDetails.map((error, index) => (
                      <li key={index} className="list-disc list-inside">
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
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

