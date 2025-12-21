"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { useAuth } from "@/hooks/useAuth";
import { apiGet, apiPost } from "@/lib/api";
import { Download, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/useToast";

export function DataPrivacySection() {
  const { user, token, logout } = useAuth();
  const { toast, showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      // Appel API pour exporter les données
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


  const handleDeleteAccount = async () => {
    // Vérifier que l'utilisateur a bien tapé "supprimer"
    if (deleteConfirmText.toLowerCase().trim() !== "supprimer") {
      showToast("Veuillez taper 'supprimer' pour confirmer", "error");
      return;
    }

    setIsDeleting(true);
    try {
      // Appel API pour supprimer le compte
      await apiPost("/users/me/delete", {}, token);
      
      showToast("Votre compte a été supprimé avec succès", "success");
      
      // Déconnexion et redirection
      setTimeout(() => {
        logout();
        window.location.href = "/";
      }, 2000);
    } catch (error: any) {
      console.error("Erreur lors de la suppression:", error);
      showToast("Erreur lors de la suppression du compte", "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-[#0F172A]">
            Données personnelles
          </h3>
          <p className="text-sm text-[#64748B] mt-1">
            Gérez vos données personnelles conformément au RGPD
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export des données */}
          <div className="border border-[#E5E7EB] rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="w-5 h-5 text-[#F97316]" />
                  <h4 className="text-sm font-semibold text-[#0F172A]">
                    Exporter mes données
                  </h4>
                </div>
                <p className="text-sm text-[#64748B] mb-3">
                  Téléchargez une copie de toutes vos données personnelles au format JSON. 
                  Vous pouvez exercer votre droit à la portabilité des données.
                </p>
                <AnimatedButton
                  variant="secondary"
                  onClick={handleExportData}
                  disabled={isExporting}
                  loading={isExporting}
                >
                  {isExporting ? "Export en cours..." : "Exporter mes données"}
                </AnimatedButton>
              </div>
            </div>
          </div>

          {/* Suppression de compte */}
          <div className="border border-red-200 rounded-lg p-3 bg-red-50">
            <div className="flex items-start gap-2 mb-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h4 className="text-xs font-semibold text-[#0F172A]">
                Supprimer mon compte
              </h4>
            </div>
            <p className="text-xs text-[#64748B] mb-2">
              La suppression de votre compte est définitive et irréversible. 
              Toutes vos données seront supprimées dans un délai de 30 jours, 
              sauf obligation légale de conservation.
            </p>
            {!showDeleteConfirm ? (
              <AnimatedButton
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-xs py-1.5 px-3"
              >
                <Trash2 className="w-3 h-3 mr-1.5" />
                Supprimer mon compte
              </AnimatedButton>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-white rounded-lg border border-red-200">
                  <p className="text-xs font-medium text-red-600 mb-2">
                    ⚠️ Attention : Cette action est irréversible
                  </p>
                  <p className="text-xs text-[#64748B] mb-3">
                    Êtes-vous sûr de vouloir supprimer votre compte ? 
                    Toutes vos données seront définitivement supprimées.
                  </p>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-[#0F172A] block">
                      Pour confirmer, tapez <span className="font-mono text-red-600">supprimer</span> :
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Tapez 'supprimer' pour confirmer"
                      disabled={isDeleting}
                      className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <AnimatedButton
                    variant="secondary"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText("");
                    }}
                    disabled={isDeleting}
                    className="text-xs py-1.5 px-3"
                  >
                    Annuler
                  </AnimatedButton>
                  <AnimatedButton
                    variant="danger"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || deleteConfirmText.toLowerCase().trim() !== "supprimer"}
                    loading={isDeleting}
                    className="text-xs py-1.5 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? "Suppression..." : "Confirmer la suppression"}
                  </AnimatedButton>
                </div>
              </div>
            )}
          </div>

          {/* Informations sur les droits */}
          <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]">
            <h4 className="text-sm font-semibold text-[#0F172A] mb-2">
              Vos droits RGPD
            </h4>
            <ul className="text-xs text-[#64748B] space-y-1 list-disc list-inside">
              <li>Droit d'accès : Vous pouvez demander une copie de vos données</li>
              <li>Droit de rectification : Vous pouvez corriger vos données inexactes</li>
              <li>Droit à l'effacement : Vous pouvez demander la suppression de vos données</li>
              <li>Droit à la portabilité : Vous pouvez récupérer vos données dans un format structuré</li>
              <li>Droit d'opposition : Vous pouvez vous opposer au traitement de vos données</li>
            </ul>
            <p className="text-xs text-[#64748B] mt-3">
              Pour plus d'informations, consultez notre{" "}
              <a href="/legal/privacy" className="text-[#F97316] hover:underline">
                Politique de Confidentialité
              </a>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

