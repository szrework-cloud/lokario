import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";

const features = [
  "Devis & Factures illimités",
  "Relance IA automatique",
  "Gestion des tâches",
  "Boîte de réception centralisée",
  "Calendrier & Rendez-vous",
  "Support prioritaire",
];

export const Pricing = () => {
  return (
    <section className="py-24 lg:py-32 relative">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 blur-[150px] rounded-full" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
            Tarif <span className="text-primary">simple</span>
          </h2>
          <p className="text-lg text-white/60 max-w-md mx-auto">
            Un seul prix, toutes les fonctionnalités
          </p>
        </div>
        
        <div className="max-w-md mx-auto">
          <div className="relative rounded-3xl border border-primary/30 bg-background/50 backdrop-blur-sm p-8 lg:p-10">
            {/* Popular badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="bg-primary text-primary-foreground text-sm font-medium px-4 py-1.5 rounded-full">
                Accès complet
              </span>
            </div>
            
            {/* Price */}
            <div className="text-center mb-8 pt-4">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl lg:text-6xl font-bold text-white">59,99</span>
                <span className="text-2xl text-white/60">€</span>
              </div>
              <p className="text-white/50 mt-2">par mois</p>
            </div>
            
            {/* Features */}
            <ul className="space-y-4 mb-10">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-white/80">{feature}</span>
                </li>
              ))}
            </ul>
            
            {/* CTA */}
            <Button
              size="lg"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
            >
              Commencer maintenant
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            <p className="text-center text-white/40 text-sm mt-4">
              Annulation à tout moment
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
