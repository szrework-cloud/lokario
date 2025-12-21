"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { useAuth } from "@/hooks/useAuth";
import { apiGet, apiPost } from "@/lib/api";
import { Download, Trash2, AlertTriangle, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/useToast";

interface DeletionStatus {
  is_scheduled_for_deletion: boolean;
  deletion_requested_at: string | null;
  deletion_scheduled_at: string | null;
  days_remaining: number | null;
}

export function DataPrivacySection() {
  const { user, token, logout } = useAuth();
  const { toast, showToast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletionStatus, setDeletionStatus] = useState<DeletionStatus | null>(null);

  // Charger le statut de suppression au montage
  useEffect(() => {
    const loadDeletionStatus = async () => {
      try {
        const status = await apiGet("/users/me/deletion-status", token);
        setDeletionStatus(status);
      } catch (error) {
        console.error("Erreur lors du chargement du statut:", error);
      }
    };
    if (token) {
      loadDeletionStatus();
    }
  }, [token]);

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
      // Appel API pour demander la suppression (délai de grâce de 30 jours)
      const response = await apiPost("/users/me/delete", {}, token);
      
      showToast(
        `Suppression programmée. Votre compte sera supprimé dans ${response.days_remaining} jours. Vous pouvez le récupérer avant cette date.`,
        "success"
      );
      
      // Recharger le statut
      const status = await apiGet("/users/me/deletion-status", token);
      setDeletionStatus(status);
      
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
    } catch (error: any) {
      console.error("Erreur lors de la suppression:", error);
      showToast("Erreur lors de la demande de suppression", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreAccount = async () => {
    setIsRestoring(true);
    try {
      await apiPost("/users/me/restore", {}, token);
      showToast("Votre compte a été restauré avec succès", "success");
      
      // Recharger le statut
      const status = await apiGet("/users/me/deletion-status", token);
      setDeletionStatus(status);
    } catch (error: any) {
      console.error("Erreur lors de la restauration:", error);
      showToast("Erreur lors de la restauration du compte", "error");
    } finally {
      setIsRestoring(false);
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

          {/* Statut de suppression en cours */}
          {deletionStatus?.is_scheduled_for_deletion && (
            <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-orange-800 mb-1">
                    Suppression programmée
                  </h4>
                  <p className="text-xs text-orange-700 mb-3">
                    Votre compte est programmé pour être supprimé le{" "}
                    <strong>
                      {deletionStatus.deletion_scheduled_at
                        ? new Date(deletionStatus.deletion_scheduled_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })
                        : "date inconnue"}
                    </strong>
                    {deletionStatus.days_remaining !== null && (
                      <> ({deletionStatus.days_remaining} jour{deletionStatus.days_remaining > 1 ? "s" : ""} restant{deletionStatus.days_remaining > 1 ? "s" : ""})</>
                    )}
                  </p>
                  <p className="text-xs text-orange-700 mb-3">
                    Vous pouvez toujours accéder à vos données et récupérer votre compte avant cette date.
                  </p>
                  <AnimatedButton
                    variant="secondary"
                    onClick={handleRestoreAccount}
                    disabled={isRestoring}
                    loading={isRestoring}
                    className="text-xs py-1.5 px-3"
                  >
                    <RotateCcw className="w-3 h-3 mr-1.5" />
                    {isRestoring ? "Restauration..." : "Récupérer mon compte"}
                  </AnimatedButton>
                </div>
              </div>
            </div>
          )}

          {/* Suppression de compte */}
          <div className="border border-red-200 rounded-lg p-3 bg-red-50">
            <div className="flex items-start gap-2 mb-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <h4 className="text-xs font-semibold text-[#0F172A]">
                {deletionStatus?.is_scheduled_for_deletion ? "Annuler la suppression" : "Supprimer mon compte"}
              </h4>
            </div>
            <p className="text-xs text-[#64748B] mb-2">
              {deletionStatus?.is_scheduled_for_deletion ? (
                <>
                  Votre compte est déjà programmé pour suppression. 
                  Utilisez le bouton "Récupérer mon compte" ci-dessus pour annuler.
                </>
              ) : (
                <>
                  La suppression de votre compte sera effective après un délai de grâce de 30 jours. 
                  <strong className="text-red-600"> Important :</strong> Exportez vos données avant de demander la suppression, 
                  car vous ne pourrez plus y accéder après la suppression définitive. 
                  Les factures seront conservées pour obligations légales (10 ans) mais ne seront plus accessibles.
                  <br />
                  <strong>Vous pourrez récupérer votre compte pendant les 30 jours suivant la demande.</strong>
                </>
              )}
            </p>
            {!deletionStatus?.is_scheduled_for_deletion && (
              <>
                {!showDeleteConfirm ? (
                  <AnimatedButton
                    variant="danger"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-xs py-1.5 px-3"
                  >
                    <Trash2 className="w-3 h-3 mr-1.5" />
                    Demander la suppression
                  </AnimatedButton>
                ) : (
              <div className="space-y-3">
                <div className="p-3 bg-white rounded-lg border border-red-200">
                  <p className="text-xs font-medium text-red-600 mb-2">
                    ⚠️ Attention : Cette action est irréversible
                  </p>
                  <p className="text-xs text-[#64748B] mb-2">
                    Êtes-vous sûr de vouloir demander la suppression de votre compte ? 
                    Votre compte sera supprimé dans 30 jours. Vous pourrez le récupérer avant cette date.
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
                    <p className="text-xs text-yellow-800 font-medium mb-1">
                      ⚠️ Avez-vous exporté vos données ?
                    </p>
                    <p className="text-xs text-yellow-700">
                      Après la suppression, vous ne pourrez plus accéder à vos données. 
                      Les factures seront conservées pour obligations légales mais ne seront plus accessibles. 
                      <strong> Assurez-vous d'avoir exporté vos données avant de continuer.</strong>
                    </p>
                  </div>
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
                    {isDeleting ? "Demande en cours..." : "Confirmer la demande"}
                  </AnimatedButton>
                </div>
              </div>
                )}
              </>
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

