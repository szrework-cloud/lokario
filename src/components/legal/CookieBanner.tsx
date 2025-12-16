"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Vérifier si l'utilisateur a déjà donné son consentement
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem("cookieConsent", JSON.stringify({
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString()
    }));
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    localStorage.setItem("cookieConsent", JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    }));
    setIsVisible(false);
  };

  const handleCustomize = () => {
    setShowDetails(!showDetails);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-[#1E293B] shadow-lg p-4 md:p-6">
      <div className="container mx-auto max-w-4xl">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white mb-2">
              🍪 Gestion des cookies
            </h3>
            <p className="text-sm text-[#94A3B8] leading-relaxed">
              Nous utilisons des cookies pour améliorer votre expérience, analyser le trafic et personnaliser le contenu. 
              En continuant, vous acceptez notre utilisation des cookies.{" "}
              <Link href="/legal/privacy#cookies" className="text-[#F97316] hover:text-[#EA580C] hover:underline transition-colors">
                En savoir plus
              </Link>
            </p>
            
            {showDetails && (
              <div className="mt-4 space-y-3 p-4 bg-[#111827] rounded-lg border border-[#1E293B]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Cookies strictement nécessaires</p>
                    <p className="text-xs text-[#94A3B8]">Ces cookies sont essentiels au fonctionnement du site</p>
                  </div>
                  <span className="text-xs text-[#94A3B8] bg-[#1E293B] border border-[#334155] px-2 py-1 rounded">Toujours actif</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Cookies d'analyse</p>
                    <p className="text-xs text-[#94A3B8]">Nous aident à comprendre comment vous utilisez le site</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-[#1E293B] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#F97316] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#334155] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F97316]"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Cookies marketing</p>
                    <p className="text-xs text-[#94A3B8]">Utilisés pour vous proposer des publicités personnalisées</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-[#1E293B] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#F97316] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#334155] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#F97316]"></div>
                  </label>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            {showDetails ? (
              <>
                <button
                  onClick={handleRejectAll}
                  className="px-4 py-2 text-sm font-medium text-[#94A3B8] bg-transparent border border-[#1E293B] rounded-lg hover:bg-[#111827] hover:border-[#334155] hover:text-white transition-colors"
                >
                  Tout refuser
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#F97316] to-[#EA580C] rounded-lg hover:brightness-110 transition-all"
                >
                  Tout accepter
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCustomize}
                  className="px-4 py-2 text-sm font-medium text-[#94A3B8] bg-transparent border border-[#1E293B] rounded-lg hover:bg-[#111827] hover:border-[#334155] hover:text-white transition-colors"
                >
                  Personnaliser
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#F97316] to-[#EA580C] rounded-lg hover:brightness-110 transition-all"
                >
                  Tout accepter
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

