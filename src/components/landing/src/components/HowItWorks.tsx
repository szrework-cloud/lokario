import { ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Créez votre compte",
    description: "Inscription en 30 secondes, sans carte bancaire. Commencez immédiatement à organiser votre activité.",
  },
  {
    number: "02",
    title: "Connectez vos outils",
    description: "Synchronisez vos emails, calendriers et contacts en quelques clics. Lokario s'adapte à votre workflow.",
  },
  {
    number: "03",
    title: "Laissez l'IA travailler",
    description: "L'assistant analyse vos données et automatise les relances, rappels et suivis. Vous gardez le contrôle.",
  },
];

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-20 lg:py-32 relative bg-secondary/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Comment ça marche
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Simple comme{" "}
            <span className="text-gradient">1, 2, 3</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Pas de configuration complexe. Lokario est prêt en quelques minutes.
          </p>
        </div>

        {/* Steps */}
        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Connection line */}
            <div className="hidden lg:block absolute left-[60px] top-12 bottom-12 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-accent" />
            
            <div className="space-y-8 lg:space-y-12">
              {steps.map((step, index) => (
                <div
                  key={step.number}
                  className="relative flex flex-col lg:flex-row gap-6 lg:gap-10 animate-fade-up"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  {/* Number */}
                  <div className="flex-shrink-0">
                    <div className="w-[120px] h-[120px] rounded-2xl gradient-hero flex items-center justify-center shadow-glow">
                      <span className="font-display text-4xl font-bold text-primary-foreground">
                        {step.number}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 lg:pt-6">
                    <h3 className="font-display text-2xl font-semibold mb-3 text-foreground">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground text-lg leading-relaxed max-w-xl">
                      {step.description}
                    </p>
                    
                    {index < steps.length - 1 && (
                      <div className="lg:hidden flex items-center gap-2 mt-4 text-primary">
                        <ArrowRight className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
