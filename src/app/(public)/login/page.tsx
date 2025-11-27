"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost, apiGet } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { CurrentUser } from "@/store/auth-store";

type LoginResponse = {
  access_token: string;
  token_type: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiPost<LoginResponse>("/auth/login", {
        email,
        password,
      });

      const user = await apiGet<CurrentUser>("/auth/me", data.access_token);

      setAuth(data.access_token, user);

      // Redirection selon le rôle
      if (user.role === "super_admin") {
        router.push("/admin/companies");
      } else {
        router.push("/app/tasks");
      }
    } catch (err: any) {
      setError(err.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB]">
      <div className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold text-[#0F172A]">
          Connexion
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[#0F172A]"
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
              className="mt-1 block w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              placeholder="votre@email.com"
              disabled={loading}
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#0F172A]"
            >
              Mot de passe
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-sm text-red-600">{error}</p>
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

