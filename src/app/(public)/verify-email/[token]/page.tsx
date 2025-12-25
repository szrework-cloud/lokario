"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { apiPost } from "@/lib/api";
import { logger } from "@/lib/logger";

export default function VerifyEmailTokenPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  // Forcer le fond noir sur le body
  useEffect(() => {
    document.body.style.backgroundColor = "#000000";
    return () => {
      document.body.style.backgroundColor = "";
    };
  }, []);

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Token invalide");
        return;
      }

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const isMockMode = !apiUrl || apiUrl.trim() === "";

        if (isMockMode) {
          // Mode mock : simuler la vérification
          logger.log("[MOCK] Email vérifié avec le token:", token);
          setStatus("success");
          setMessage("Email vérifié avec succès !");
          setTimeout(() => {
            router.push("/login?verified=true");
          }, 2000);
          return;
        }

        await apiPost(`/auth/verify-email/${token}`, {});

        setStatus("success");
        setMessage("Email vérifié avec succès !");
        setTimeout(() => {
          router.push("/login?verified=true");
        }, 2000);
      } catch (err: any) {
        setStatus("error");
        setMessage(err.message || "Erreur lors de la vérification de l'email");
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="w-full max-w-md rounded-2xl border border-[#374151] bg-[#111827] p-8 shadow-sm">
        <div className="text-center">
          {status === "loading" && (
            <>
              <div className="mx-auto w-16 h-16 bg-[#F97316]/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <svg
                  className="w-8 h-8 text-[#F97316] animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-white mb-2">
                Vérification en cours...
              </h1>
              <p className="text-sm text-gray-300">
                Veuillez patienter pendant que nous vérifions votre email.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
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
                Email vérifié !
              </h1>
              <p className="text-sm text-gray-300 mb-4">{message}</p>
              <p className="text-xs text-gray-300">
                Redirection vers la page de connexion...
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-semibold text-white mb-2">
                Erreur de vérification
              </h1>
              <p className="text-sm text-red-400 mb-4">{message}</p>
              <div className="space-y-2">
                <Link
                  href="/login"
                  className="block w-full rounded-xl bg-[#F97316] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 transition-all focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2 text-center"
                >
                  Aller à la connexion
                </Link>
                <Link
                  href="/verify-email"
                  className="block text-sm text-[#F97316] hover:underline text-center"
                >
                  Demander un nouveau lien
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

