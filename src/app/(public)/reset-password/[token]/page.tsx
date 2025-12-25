"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost } from "@/lib/api";
import { logger } from "@/lib/logger";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const isMockMode = !apiUrl || apiUrl.trim() === "";

      if (isMockMode) {
        // Mode mock : simuler la réinitialisation
        logger.log("[MOCK] Réinitialisation du mot de passe avec token", token);
        setSuccess(true);
        setLoading(false);
        return;
      }

      await apiPost("/auth/reset-password", {
        token,
        new_password: password,
      });

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la réinitialisation du mot de passe");
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
              Mot de passe réinitialisé !
            </h1>
            <p className="text-sm text-gray-300">
              Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.
            </p>
          </div>

          <div className="text-center">
            <Link
              href="/login"
              className="inline-block rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 transition-all focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="w-full max-w-md rounded-2xl border border-[#374151] bg-[#111827] p-8 shadow-lg">
        <h1 className="mb-6 text-2xl font-semibold text-white">
          Réinitialiser le mot de passe
        </h1>
        <p className="mb-6 text-sm text-gray-300">
          Entrez votre nouveau mot de passe ci-dessous.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-200"
            >
              Nouveau mot de passe
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1 block w-full rounded-lg border border-[#374151] bg-[#1F2937] px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              placeholder="••••••••"
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-400">
              Minimum 8 caractères
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-200"
            >
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1 block w-full rounded-lg border border-[#374151] bg-[#1F2937] px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              placeholder="••••••••"
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
            {loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
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

