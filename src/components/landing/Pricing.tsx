"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Check, ArrowRight } from "lucide-react";
import Link from "next/link";

const essentialFeatures = [
  "Devis & Factures illimités",
  "Relances automatiques",
  "Gestion des clients",
];

const proFeatures = [
  "Devis & Factures illimités",
  "Relance IA automatique",
  "Import & Export",
  "Gestion des tâches",
  "Boîte de réception centralisée",
  "Calendrier & Rendez-vous",
  "Support prioritaire",
];

export const LandingPricing = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  
  const essentialMonthly = 19.99;
  const essentialAnnual = 15.99; // 20% de réduction
  const proMonthly = 59.99;
  const proAnnual = 47.99; // 20% de réduction
  
  const essentialPrice = isAnnual ? essentialAnnual : essentialMonthly;
  const proPrice = isAnnual ? proAnnual : proMonthly;
  
  return (
    <section className="py-24 lg:py-32 relative bg-black">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[#F97316]/10 blur-[150px] rounded-full" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            Tarifs <span className="text-[#F97316]">simples</span>
          </h2>
          <p className="text-lg text-white/60 max-w-md mx-auto">
            Choisissez le plan adapté à vos besoins
          </p>
          
          {/* Toggle mensuel/annuel */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span className={`text-sm transition-colors ${!isAnnual ? 'text-white' : 'text-white/50'}`}>
              Mensuel
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative w-14 h-7 rounded-full transition-colors ${isAnnual ? 'bg-[#F97316]' : 'bg-white/20'}`}
            >
              <span 
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${isAnnual ? 'left-8' : 'left-1'}`}
              />
            </button>
            <span className={`text-sm transition-colors ${isAnnual ? 'text-white' : 'text-white/50'}`}>
              Annuel
            </span>
            {isAnnual && (
              <span className="bg-[#F97316]/20 text-[#F97316] text-xs font-medium px-2 py-1 rounded-full">
                -20%
              </span>
            )}
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Plan Essentiel */}
          <div className="relative rounded-3xl border border-white/10 bg-[#1E293B]/50 backdrop-blur-sm p-8 lg:p-10">
            {/* Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-white/10 text-white/80 text-sm font-medium px-4 py-1.5 rounded-full">
                14 jours gratuits
              </span>
            </div>
            
            {/* Plan name */}
            <div className="text-center mb-6 pt-4">
              <h3 className="text-xl font-semibold text-white mb-2">Essentiel</h3>
              <p className="text-white/50 text-sm">Devis, factures & relances</p>
            </div>
            
            {/* Price */}
            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl lg:text-6xl font-bold text-white">{essentialPrice.toFixed(2).replace('.', ',')}</span>
                <span className="text-2xl text-white/60">€</span>
              </div>
              <p className="text-white/50 mt-2">par mois</p>
              {isAnnual && (
                <p className="text-[#F97316] text-sm mt-2 font-medium">
                  Économisez 48€ par an
                </p>
              )}
            </div>
            
            {/* Features */}
            <ul className="space-y-4 mb-10">
              {essentialFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white/60" />
                  </div>
                  <span className="text-white/80">{feature}</span>
                </li>
              ))}
            </ul>
            
            {/* CTA */}
            <Link href="/register">
              <Button
                size="lg"
                variant="outline"
                className="w-full border-white/20 text-white hover:bg-white/10 rounded-full"
              >
                Commencer
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            
            <p className="text-center text-white/40 text-sm mt-4">
              Annulation à tout moment
            </p>
            
            {isAnnual && (
              <p className="text-center text-white/60 text-sm mt-2">
                Soit <span className="text-white font-medium">{(essentialAnnual * 12).toFixed(2).replace('.', ',')}€</span> par an
              </p>
            )}
          </div>
          
          {/* Plan Pro */}
          <div className="relative rounded-3xl border border-[#F97316]/30 bg-[#1E293B]/50 backdrop-blur-sm p-8 lg:p-10">
            {/* Popular badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-[#F97316] text-white text-sm font-medium px-4 py-1.5 rounded-full">
                14 jours gratuits
              </span>
            </div>
            
            {/* Plan name */}
            <div className="text-center mb-6 pt-4">
              <h3 className="text-xl font-semibold text-white mb-2">Pro</h3>
              <p className="text-white/50 text-sm">Toutes les fonctionnalités + IA</p>
            </div>
            
            {/* Price */}
            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl lg:text-6xl font-bold text-white">{proPrice.toFixed(2).replace('.', ',')}</span>
                <span className="text-2xl text-white/60">€</span>
              </div>
              <p className="text-white/50 mt-2">par mois</p>
              {isAnnual && (
                <p className="text-[#F97316] text-sm mt-2 font-medium">
                  Économisez 120€ par an
                </p>
              )}
            </div>
            
            {/* Features */}
            <ul className="space-y-4 mb-10">
              {proFeatures.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#F97316]/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-[#F97316]" />
                  </div>
                  <span className="text-white/80">{feature}</span>
                </li>
              ))}
            </ul>
            
            {/* CTA */}
            <Link href="/register">
              <Button
                size="lg"
                className="w-full bg-[#F97316] hover:bg-[#EA580C] text-white rounded-full"
              >
                Commencer maintenant
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            
            <p className="text-center text-white/40 text-sm mt-4">
              Annulation à tout moment
            </p>
            
            {isAnnual && (
              <p className="text-center text-white/60 text-sm mt-2">
                Soit <span className="text-white font-medium">{(proAnnual * 12).toFixed(2).replace('.', ',')}€</span> par an
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
