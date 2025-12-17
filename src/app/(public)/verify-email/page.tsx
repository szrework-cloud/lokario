"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiPost } from "@/lib/api";
import { logger } from "@/lib/logger";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0); // Timer en secondes

  // Timer de cooldown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => {
        setCooldown(cooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (!email) {
      setError("Email manquant");
      return;
    }

    if (cooldown > 0) {
      return; // Ne rien faire si le timer est actif
    }

    setResending(true);
    setError(null);
    setResendSuccess(false);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const isMockMode = !apiUrl || apiUrl.trim() === "";

      if (isMockMode) {
        // Mode mock : simuler l'envoi
        logger.log("[MOCK] Email de vérification renvoyé à", email);
        setResendSuccess(true);
        setResending(false);
        setCooldown(60); // Démarrer le timer de 60 secondes
        return;
      }

      // Utiliser l'endpoint sans mot de passe (plus simple et pratique)
      await apiPost("/auth/resend-verification-no-password", {
        email: email.toLowerCase(),
      });

      setResendSuccess(true);
      setCooldown(60); // Démarrer le timer de 60 secondes après succès
    } catch (err: any) {
      setError(err.message || "Erreur lors du renvoi de l'email");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB]">
      <div className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="mx-auto w-16 h-16 bg-[#F97316]/10 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-[#F97316]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-[#0F172A] mb-2">
            Vérifiez votre email
          </h1>
          <p className="text-sm text-[#64748B]">
            {email ? (
              <>
                Nous avons envoyé un lien de vérification à{" "}
                <span className="font-medium text-[#0F172A]">{email}</span>
              </>
            ) : (
              "Un email de vérification vous a été envoyé"
            )}
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <p className="text-sm text-[#64748B] mb-2">
              <strong className="text-[#0F172A]">Instructions :</strong>
            </p>
            <ol className="text-sm text-[#64748B] space-y-1 list-decimal list-inside">
              <li>Ouvrez votre boîte de réception</li>
              <li>Cliquez sur le lien de vérification dans l'email</li>
              <li>Vous serez automatiquement redirigé vers la connexion</li>
            </ol>
          </div>

          {resendSuccess && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
              <p className="text-sm text-green-600">
                Un nouveau lien de vérification a été envoyé !
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="border-t border-[#E5E7EB] pt-4">
            <p className="text-sm text-[#64748B] mb-3">
              Vous n'avez pas reçu l'email ? Renvoyez-le :
            </p>
            <div className="space-y-3">
              <button
                onClick={handleResend}
                disabled={resending || cooldown > 0}
                className="w-full rounded-xl bg-[#F97316] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
              >
                {resending ? (
                  "Envoi en cours..."
                ) : cooldown > 0 ? (
                  `Attendez ${cooldown} seconde${cooldown > 1 ? 's' : ''} avant de renvoyer`
                ) : (
                  "Renvoyer l'email"
                )}
              </button>
              {cooldown > 0 && (
                <div className="text-center pt-2">
                  <div className="inline-flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-sm text-[#64748B]">
                      <div className="w-32 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#F97316] transition-all duration-1000 ease-linear"
                          style={{ width: `${((60 - cooldown) / 60) * 100}%` }}
                        />
                      </div>
                      <span className="font-medium text-[#F97316] min-w-[3rem]">{cooldown}s</span>
                    </div>
                    <p className="text-xs text-[#64748B]">
                      Vous pourrez renvoyer l'email dans {cooldown} seconde{cooldown > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="text-center pt-4">
            <Link
              href="/login"
              className="text-sm text-[#F97316] hover:underline"
            >
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#F9FAFB]"><div className="text-[#64748B]">Chargement...</div></div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
