import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";

const benefits = [
  "Essai gratuit de 14 jours",
  "Aucune carte bancaire requise",
  "Support inclus",
];

export const CTA = () => {
  return (
    <section id="pricing" className="py-20 lg:py-32 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative max-w-4xl mx-auto">
          {/* Background card */}
          <div className="absolute inset-0 gradient-hero rounded-3xl opacity-95" />
          <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
          
          <div className="relative px-6 py-12 sm:px-12 sm:py-16 lg:px-16 lg:py-20 text-center">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6">
              Prêt à simplifier votre quotidien ?
            </h2>
            <p className="text-lg sm:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-8">
              Rejoignez les centaines d'entrepreneurs qui ont choisi Lokario pour reprendre le contrôle de leur activité.
            </p>

            {/* Benefits */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-10">
              {benefits.map((benefit) => (
                <div key={benefit} className="flex items-center gap-2 text-primary-foreground/90">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm sm:text-base">{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <Button
              variant="accent"
              size="xl"
              className="text-lg"
            >
              Démarrer mon essai gratuit
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
