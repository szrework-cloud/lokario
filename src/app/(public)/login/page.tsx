"use client";

import { FormEvent, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiPost, apiGet } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";
import type { CurrentUser } from "@/store/auth-store";

type LoginResponse = {
  access_token: string;
  token_type: string;
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Afficher un message de succès si l'utilisateur vient de vérifier son email
    if (searchParams.get("verified") === "true") {
      setSuccessMessage("Email vérifié avec succès ! Vous pouvez maintenant vous connecter.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Utilisateurs de démonstration pour le mode mock
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const mockUsers: Record<string, { user: CurrentUser; token: string }> = {
        "admin@lokario.fr": {
          user: {
            id: 1,
            email: "admin@lokario.fr",
            full_name: "Admin Lokario",
            role: "super_admin",
            company_id: 1,
            is_active: true,
            created_at: new Date().toISOString(),
          },
          token: "mock_token_admin",
        },
        "owner@lokario.fr": {
          user: {
            id: 2,
            email: "owner@lokario.fr",
            full_name: "Propriétaire",
            role: "owner",
            company_id: 1,
            is_active: true,
            created_at: new Date().toISOString(),
          },
          token: "mock_token_owner",
        },
        "user@lokario.fr": {
          user: {
            id: 3,
            email: "user@lokario.fr",
            full_name: "Employé",
            role: "user",
            company_id: 1,
            is_active: true,
            created_at: new Date().toISOString(),
          },
          token: "mock_token_user",
        },
      };

      // Vérifier si on est en mode mock (pas de NEXT_PUBLIC_API_URL ou chaîne vide)
      const isMockMode = !apiUrl || apiUrl.trim() === "";

      if (isMockMode) {
        // Mode mock : utiliser les utilisateurs de démonstration
        const mockAuth = mockUsers[email.toLowerCase()];
        
        if (mockAuth && password === "demo123") {
          setAuth(mockAuth.token, mockAuth.user);
          // Utiliser window.location pour forcer une navigation complète
          if (mockAuth.user.role === "super_admin") {
            window.location.href = "/admin/companies";
          } else {
            window.location.href = "/app/dashboard";
          }
          return;
        } else {
          setError("Email ou mot de passe incorrect. Utilisez: admin@lokario.fr / owner@lokario.fr / user@lokario.fr avec le mot de passe: demo123");
          setLoading(false);
          return;
        }
      }

      // Mode avec backend
      const data = await apiPost<LoginResponse>("/auth/login", {
        email,
        password,
      });

      // Vérifier si la réponse est vide (mode mock fallback)
      if (!data || !data.access_token) {
        // Fallback vers mode mock
        const mockAuth = mockUsers[email.toLowerCase()];
        if (mockAuth && password === "demo123") {
          setAuth(mockAuth.token, mockAuth.user);
          if (mockAuth.user.role === "super_admin") {
            window.location.href = "/admin/companies";
          } else {
            window.location.href = "/app/dashboard";
          }
          return;
        } else {
          setError("Email ou mot de passe incorrect");
          setLoading(false);
          return;
        }
      }

      // Utiliser /auth/me/restore pour récupérer l'utilisateur même si suppression en cours
      // Cela permet de récupérer l'utilisateur et de vérifier le statut de suppression
      let user: CurrentUser;
      try {
        user = await apiGet<CurrentUser>("/auth/me/restore", data.access_token);
      } catch (error: any) {
        setError("Erreur lors de la récupération des informations utilisateur");
        setLoading(false);
        return;
      }

      if (!user || !user.id) {
        setError("Erreur lors de la récupération des informations utilisateur");
        setLoading(false);
        return;
      }

      // Vérifier le statut de suppression AVANT de sauvegarder l'auth et de rediriger
      logger.log("🔍 Vérification du statut de suppression pour:", user.email);
      try {
        const deletionStatus = await apiGet<{ deletion_in_progress: boolean }>("/users/me/deletion-status", data.access_token);
        logger.log("📊 Statut de suppression reçu:", deletionStatus);
        
        if (deletionStatus && deletionStatus.deletion_in_progress === true) {
          // Si le compte est en cours de suppression, sauvegarder l'auth et rediriger vers /restore
          logger.log("⚠️ Compte en cours de suppression détecté! Redirection vers /restore");
          setAuth(data.access_token, user);
          // Attendre un peu pour que l'auth soit sauvegardée
          await new Promise(resolve => setTimeout(resolve, 200));
          // Utiliser window.location.replace pour forcer la redirection
          window.location.replace("/restore");
          return; // IMPORTANT: arrêter ici pour éviter la redirection vers le dashboard
        } else {
          logger.log("✅ Pas de suppression en cours, connexion normale");
        }
      } catch (error: any) {
        // Si l'endpoint échoue avec 403, c'est probablement que le compte est bloqué
        // Dans ce cas, rediriger vers /restore
        logger.log("⚠️ Erreur lors de la vérification du statut de suppression:", error);
        console.error("Erreur complète:", error);
        console.error("Message:", error?.message);
        console.error("Status:", error?.status);
        
        if (error?.status === 403 || error?.message?.includes("Account deletion in progress")) {
          // Si erreur 403 ou message indiquant suppression en cours, rediriger vers /restore
          logger.log("⚠️ Erreur 403 détectée - compte probablement en suppression, redirection vers /restore");
          setAuth(data.access_token, user);
          await new Promise(resolve => setTimeout(resolve, 200));
          window.location.replace("/restore");
          return;
        }
        // Sinon, continuer normalement (pour ne pas bloquer la connexion si l'endpoint a un autre problème)
      }

      // Sauvegarder l'authentification (seulement si pas de suppression en cours)
      logger.log("🔐 Sauvegarde de l'authentification:", { 
        token: data.access_token?.substring(0, 20) + "...", 
        user: user.email,
        role: user.role 
      });
      
      setAuth(data.access_token, user);
      
      // Attendre un peu pour que l'auth soit bien sauvegardée
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Vérifier que l'auth est bien sauvegardée
      const savedToken = localStorage.getItem("auth_token");
      const savedUser = localStorage.getItem("auth_user");
      logger.log("✅ Vérification après sauvegarde:", { 
        tokenExists: !!savedToken, 
        userExists: !!savedUser,
        userEmail: savedUser ? JSON.parse(savedUser).email : null
      });
      
      if (!savedToken || !savedUser) {
        console.error("❌ L'authentification n'a pas été sauvegardée correctement");
        setError("Erreur lors de la sauvegarde de l'authentification. Veuillez réessayer.");
        setLoading(false);
        return;
      }

      // Redirection selon le rôle - utiliser window.location.href pour forcer un rechargement complet
      if (user.role === "super_admin") {
        logger.log("🔄 Redirection vers /admin/companies");
        window.location.href = "/admin/companies";
      } else {
        logger.log("🔄 Redirection vers /app/dashboard");
        window.location.href = "/app/dashboard";
      }
    } catch (err: any) {
      // Vérifier si l'erreur est liée à l'email non vérifié
      const errorMessage = err.message || "Erreur de connexion";
      if (errorMessage.includes("Email not verified") || errorMessage.includes("email not verified")) {
        setError("Votre email n'a pas été vérifié. Veuillez vérifier votre boîte de réception ou demander un nouveau lien.");
        // Optionnel : rediriger vers la page de vérification
        setTimeout(() => {
          router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        }, 3000);
      } else {
        setError(errorMessage);
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="w-full max-w-md rounded-2xl border border-[#374151] bg-[#111827] p-8 shadow-lg">
        <h1 className="mb-6 text-2xl font-semibold text-white">
          Connexion
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-200"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-[#374151] bg-[#1F2937] px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              placeholder="votre@email.com"
              disabled={loading}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-200"
              >
                Mot de passe
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-[#F97316] hover:text-[#EA580C] hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-[#374151] bg-[#1F2937] px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>
          {successMessage && (
            <div className="rounded-lg border border-green-600 bg-green-900/30 px-3 py-2">
              <p className="text-sm text-green-300">{successMessage}</p>
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-600 bg-red-900/30 px-3 py-2">
              <p className="text-sm text-red-300">{error}</p>
              {error.includes("email n'a pas été vérifié") && (
                <Link
                  href={`/verify-email?email=${encodeURIComponent(email)}`}
                  className="text-sm text-[#F97316] hover:underline mt-2 block"
                >
                  Demander un nouveau lien de vérification
                </Link>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  useEffect(() => {
    // Forcer le fond noir sur le body pour la page de connexion
    document.body.style.backgroundColor = "#000000";
    
    // Nettoyer au démontage (si nécessaire)
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-black"><div className="text-gray-400">Chargement...</div></div>}>
      <LoginForm />
    </Suspense>
  );
}

