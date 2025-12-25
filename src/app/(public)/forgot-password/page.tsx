"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost } from "@/lib/api";
import { logger } from "@/lib/logger";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const isMockMode = !apiUrl || apiUrl.trim() === "";

      if (isMockMode) {
        // Mode mock : simuler l'envoi
        logger.log("[MOCK] Demande de réinitialisation pour", email);
        setSuccess(true);
        setLoading(false);
        return;
      }

      await apiPost("/auth/forgot-password", {
        email: email.toLowerCase(),
      });

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la demande de réinitialisation");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="w-full max-w-md rounded-2xl border border-[#374151] bg-[#111827] p-8 shadow-lg">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 bg-green-900 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">
              Email envoyé !
            </h1>
            <p className="text-sm text-gray-300">
              Si un compte existe avec l'adresse <strong className="text-white">{email}</strong>, vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-[#374151] bg-[#1F2937] p-4">
              <p className="text-sm text-gray-300 mb-2">
                <strong className="text-white">Instructions :</strong>
              </p>
              <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                <li>Vérifiez votre boîte de réception</li>
                <li>Cliquez sur le lien dans l'email</li>
                <li>Créez un nouveau mot de passe</li>
              </ol>
            </div>

            <div className="text-center">
              <Link
                href="/login"
                className="text-sm text-[#F97316] hover:text-[#EA580C] hover:underline"
              >
                Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="w-full max-w-md rounded-2xl border border-[#374151] bg-[#111827] p-8 shadow-lg">
        <h1 className="mb-6 text-2xl font-semibold text-white">
          Mot de passe oublié
        </h1>
        <p className="mb-6 text-sm text-gray-300">
          Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
        </p>

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

          {error && (
            <div className="rounded-lg border border-red-800 bg-red-900/20 px-3 py-2">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
          >
            {loading ? "Envoi en cours..." : "Envoyer le lien de réinitialisation"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm text-[#F97316] hover:text-[#EA580C] hover:underline"
          >
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}

