"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost, apiGet } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { RotateCcw, AlertTriangle, CheckCircle } from "lucide-react";
import type { CurrentUser } from "@/store/auth-store";

interface DeletionStatus {
  deletion_in_progress: boolean;
  deletion_requested_at: string | null;
  deletion_scheduled_at: string | null;
  days_remaining: number | null;
}

export default function RestoreAccountPage() {
  const router = useRouter();
  const { token, setAuth } = useAuth();
  const [status, setStatus] = useState<DeletionStatus | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Forcer le fond noir sur le body
    document.body.style.backgroundColor = "#000000";
    
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  useEffect(() => {
    const loadStatus = async () => {
      // Attendre un peu pour que le token soit chargé
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Vérifier le token depuis le storage directement
      const { getAuthToken } = await import("@/lib/auth-storage");
      const storedToken = typeof window !== "undefined" ? getAuthToken() : null;
      const tokenToUse = token || storedToken;
      
      if (!tokenToUse) {
        // Si vraiment pas de token, rediriger vers login
        console.log("⚠️ Restore: Pas de token, redirection vers login");
        window.location.href = "/login";
        return;
      }

      try {
        console.log("🔍 Restore: Vérification du statut de suppression...");
        const deletionStatus = await apiGet<DeletionStatus>("/users/me/deletion-status", tokenToUse);
        console.log("📊 Restore: Statut reçu:", deletionStatus);
        setStatus(deletionStatus);
        
        if (!deletionStatus.deletion_in_progress) {
          // Si pas de suppression en cours, rediriger vers le dashboard
          console.log("✅ Restore: Pas de suppression, redirection vers dashboard");
          window.location.href = "/app/dashboard";
        } else {
          console.log("⚠️ Restore: Suppression en cours, affichage du formulaire");
        }
      } catch (error: any) {
        console.error("⚠️ Restore: Erreur lors du chargement du statut:", error);
        console.error("Status:", error?.status, "Message:", error?.message);
        
        // Si erreur 403 ou 500, c'est probablement que le compte est bloqué
        // Dans ce cas, on affiche quand même le formulaire (on assume que c'est une suppression)
        if (error?.status === 403 || error?.status === 500) {
          console.log("⚠️ Restore: Erreur 403/500 - compte probablement en suppression, affichage du formulaire");
          // Afficher un statut par défaut pour permettre la restauration
          setStatus({
            deletion_in_progress: true,
            deletion_requested_at: null,
            deletion_scheduled_at: null,
            days_remaining: null
          });
        } else if (error?.status === 401) {
          // Si erreur 401, le token est peut-être invalide, mais on essaie quand même
          console.log("⚠️ Restore: Erreur 401 - token peut-être invalide, mais on continue");
          setStatus({
            deletion_in_progress: true,
            deletion_requested_at: null,
            deletion_scheduled_at: null,
            days_remaining: null
          });
        } else {
          setError("Erreur lors du chargement du statut de suppression");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadStatus();
  }, [token]);

  const handleRestore = async (e: FormEvent) => {
    e.preventDefault();
    setIsRestoring(true);
    setError(null);

    try {
      await apiPost("/users/me/restore", {}, token);
      setSuccess(true);
      
      // Rafraîchir les données utilisateur
      const user = await apiGet<CurrentUser>("/auth/me/restore", token);
      setAuth(token!, user);
      
      // Rediriger vers le dashboard après 2 secondes
      setTimeout(() => {
        window.location.href = "/app/dashboard";
      }, 2000);
    } catch (error: any) {
      console.error("Erreur lors de la restauration:", error);
      setError(error.message || "Erreur lors de la restauration du compte");
    } finally {
      setIsRestoring(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-gray-400">Chargement...</div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="w-full max-w-md rounded-2xl border border-green-500 bg-[#111827] p-8 shadow-lg">
          <div className="flex flex-col items-center text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h1 className="text-2xl font-semibold text-white mb-2">
              Compte restauré avec succès !
            </h1>
            <p className="text-gray-300 mb-4">
              Votre compte a été restauré. Vous allez être redirigé vers votre tableau de bord.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!status?.deletion_in_progress) {
    return null; // Sera redirigé par useEffect
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="w-full max-w-md rounded-2xl border border-orange-500 bg-[#111827] p-8 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="w-8 h-8 text-orange-500" />
          <h1 className="text-2xl font-semibold text-white">
            Restauration de compte
          </h1>
        </div>

        <div className="mb-6 p-4 bg-orange-900/20 border border-orange-500/50 rounded-lg">
          <p className="text-sm text-orange-200 mb-2">
            <strong>Votre compte est en cours de suppression.</strong>
          </p>
          {status.days_remaining !== null && (
            <p className="text-sm text-orange-300">
              Il reste <strong className="text-white">{status.days_remaining} jour{status.days_remaining > 1 ? 's' : ''}</strong> avant la suppression définitive.
            </p>
          )}
          {status.deletion_scheduled_at && (
            <p className="text-xs text-orange-400 mt-2">
              Date de suppression prévue :{" "}
              {new Date(status.deletion_scheduled_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          )}
        </div>

        <p className="text-gray-300 mb-6">
          Vous pouvez restaurer votre compte maintenant. Une fois restauré, vous pourrez accéder à toutes vos données normalement.
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-600 bg-red-900/30 px-3 py-2">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleRestore} className="space-y-4">
          <AnimatedButton
            type="submit"
            variant="secondary"
            disabled={isRestoring}
            loading={isRestoring}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {isRestoring ? "Restauration..." : "Restaurer mon compte"}
          </AnimatedButton>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-[#F97316] hover:text-[#EA580C] hover:underline"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}

