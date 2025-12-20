"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost, apiGet } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import type { CurrentUser } from "@/store/auth-store";

type RegisterResponse = CurrentUser;

type LoginResponse = {
  access_token: string;
  token_type: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuth();
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptCGU, setAcceptCGU] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!acceptCGU) {
      setError("Vous devez accepter les Conditions Générales d'Utilisation et de Vente pour créer un compte.");
      return;
    }
    
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const isMockMode = !apiUrl || apiUrl.trim() === "";

      if (isMockMode) {
        // Mode mock : créer un utilisateur mock
        const mockCompanyId = companyCode ? parseInt(companyCode) % 1000 : Date.now();
        const mockUser: CurrentUser = {
          id: Date.now(),
          email: email.toLowerCase(),
          full_name: fullName || null,
          role: companyCode ? "user" : "owner",
          company_id: mockCompanyId,
          is_active: true,
          created_at: new Date().toISOString(),
        };
        
        setAuth("mock_token_" + mockUser.id, mockUser);
        window.location.href = "/app/dashboard";
        return;
      }

      // Mode avec backend
      const payload: any = {
        email: email.toLowerCase().trim(),
        password,
        role: "owner",
      };

      // Ajouter full_name seulement s'il est fourni (ne pas envoyer null)
      if (fullName && fullName.trim() !== "") {
        payload.full_name = fullName.trim();
      }

      // Si un code entreprise est fourni, l'utiliser (pour créer un user dans une entreprise existante)
      if (companyCode && companyCode.trim() !== "") {
        payload.company_code = companyCode.trim();
        payload.role = "user"; // Si code entreprise fourni, créer un user
      } else if (companyName && companyName.trim() !== "") {
        // Sinon, créer une nouvelle entreprise
        payload.company_name = companyName.trim();
        payload.role = "owner";
      } else {
        setError("Veuillez fournir soit un nom d'entreprise, soit un code d'entreprise");
        setLoading(false);
        return;
      }

      const userData = await apiPost<RegisterResponse>("/auth/register", payload);

      if (!userData || !userData.id) {
        setError("Erreur lors de l'inscription");
        setLoading(false);
        return;
      }

      // Rediriger vers la page de vérification email
      router.push(`/verify-email?email=${encodeURIComponent(email.toLowerCase())}`);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="w-full max-w-md rounded-2xl border border-[#374151] bg-[#111827] p-8 shadow-lg">
        <h1 className="mb-6 text-2xl font-semibold text-white">
          Inscription
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="company"
              className="block text-sm font-medium text-gray-200"
            >
              Nom de l'entreprise <span className="text-gray-400">(nouvelle entreprise)</span>
            </label>
            <input
              type="text"
              id="company"
              name="company"
              value={companyName}
              onChange={(e) => {
                setCompanyName(e.target.value);
                if (e.target.value) setCompanyCode(""); // Vider le code si on entre un nom
              }}
              className="mt-1 block w-full rounded-lg border border-[#374151] bg-[#1F2937] px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              placeholder="Mon Commerce"
              disabled={loading}
            />
          </div>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#374151]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[#111827] text-gray-400">OU</span>
            </div>
          </div>
          <div>
            <label
              htmlFor="companyCode"
              className="block text-sm font-medium text-gray-200"
            >
              Code entreprise <span className="text-gray-400">(rejoindre une entreprise existante)</span>
            </label>
            <input
              type="text"
              id="companyCode"
              name="companyCode"
              value={companyCode}
              onChange={(e) => {
                // Ne garder que les chiffres, max 6
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCompanyCode(value);
                if (value) setCompanyName(""); // Vider le nom si on entre un code
              }}
              className="mt-1 block w-full rounded-lg border border-[#374151] bg-[#1F2937] px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              placeholder="123456"
              maxLength={6}
              disabled={loading}
            />
            <p className="mt-1 text-xs text-gray-400">
              Code à 6 chiffres fourni par votre entreprise. Vous serez créé en tant que "User"
            </p>
          </div>
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-gray-200"
            >
              Nom complet
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-[#374151] bg-[#1F2937] px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              placeholder="Jean Dupont"
              disabled={loading}
            />
          </div>
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
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-200"
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
              minLength={6}
              className="mt-1 block w-full rounded-lg border border-[#374151] bg-[#1F2937] px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>
          {/* Acceptation CGU/CGV */}
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="acceptCGU"
              name="acceptCGU"
              checked={acceptCGU}
              onChange={(e) => setAcceptCGU(e.target.checked)}
              required
              className="mt-1 h-4 w-4 rounded border-[#E5E7EB] text-[#F97316] focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
            />
            <label htmlFor="acceptCGU" className="text-sm text-gray-300 leading-relaxed">
              J'accepte les{" "}
              <Link href="/legal/cgu" target="_blank" className="text-[#F97316] hover:underline">
                Conditions Générales d'Utilisation
              </Link>
              {" "}et les{" "}
              <Link href="/legal/cgv" target="_blank" className="text-[#F97316] hover:underline">
                Conditions Générales de Vente
              </Link>
              {" "}de Lokario
            </label>
          </div>
          
          {error && (
            <div className="rounded-lg border border-red-600 bg-red-900/30 px-3 py-2">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
          >
            {loading ? "Création du compte..." : "Créer mon compte"}
          </button>
          <p className="text-center text-sm text-gray-300">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-[#F97316] hover:underline">
              Se connecter
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

