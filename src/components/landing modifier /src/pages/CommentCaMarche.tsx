import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Users, Calendar, Mail, CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const steps = [
  {
    number: "01",
    title: "Configurez votre espace",
    description: "Créez votre compte en 30 secondes. Ajoutez les informations de votre entreprise et invitez votre équipe.",
    icon: Users,
    features: ["Inscription gratuite", "Configuration rapide", "Multi-utilisateurs"],
  },
  {
    number: "02",
    title: "Centralisez votre activité",
    description: "Gérez vos clients, projets, devis et factures depuis une seule interface. Planifiez vos rendez-vous et tâches.",
    icon: Calendar,
    features: ["Clients & projets", "Devis & factures", "Tâches & rendez-vous"],
  },
  {
    number: "03",
    title: "Automatisez vos relances",
    description: "L'IA génère et envoie vos relances automatiquement. Plus rien ne passe entre les mailles du filet.",
    icon: Zap,
    features: ["Relances intelligentes", "Emails & SMS auto", "Suivi en temps réel"],
  },
];

const benefits = [
  { title: "Gain de temps", value: "10h", suffix: "/semaine", description: "économisées en moyenne" },
  { title: "Taux de réponse", value: "+45", suffix: "%", description: "sur vos relances" },
  { title: "Satisfaction", value: "98", suffix: "%", description: "de clients satisfaits" },
];

const CommentCaMarche = () => {
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [visibleBenefits, setVisibleBenefits] = useState(false);
  const stepsRef = useRef<(HTMLDivElement | null)[]>([]);
  const benefitsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    stepsRef.current.forEach((ref, index) => {
      if (ref) {
        const observer = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              setVisibleSteps((prev) => [...new Set([...prev, index])]);
            }
          },
          { threshold: 0.3 }
        );
        observer.observe(ref);
        observers.push(observer);
      }
    });

    if (benefitsRef.current) {
      const benefitsObserver = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisibleBenefits(true);
          }
        },
        { threshold: 0.3 }
      );
      benefitsObserver.observe(benefitsRef.current);
      observers.push(benefitsObserver);
    }

    return () => observers.forEach((obs) => obs.disconnect());
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 lg:py-32 relative overflow-hidden">
          {/* Top gradient fade */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background via-background/50 to-transparent z-10" />
          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
          
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-primary/3 to-transparent" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
            <div className="max-w-4xl mx-auto text-center">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-up">
                Comment ça marche
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
                Simplifiez votre quotidien en{" "}
                <span className="text-gradient">3 étapes</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "0.2s" }}>
                Pas de configuration complexe, pas de courbe d'apprentissage. 
                Lokario est conçu pour être opérationnel en quelques minutes.
              </p>
            </div>
          </div>
        </section>

        {/* Steps Section */}
        <section className="py-20 lg:py-32 relative">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              {/* Vertical line connector */}
              <div className="hidden lg:block absolute left-1/2 top-32 bottom-32 w-px bg-gradient-to-b from-primary via-primary/50 to-accent" />
              
              <div className="space-y-24 lg:space-y-32">
                {steps.map((step, index) => {
                  const isVisible = visibleSteps.includes(index);
                  const isEven = index % 2 === 0;
                  const Icon = step.icon;
                  
                  return (
                    <div
                      key={step.number}
                      ref={(el) => { stepsRef.current[index] = el; }}
                      className={`relative flex flex-col lg:flex-row items-center gap-8 lg:gap-16 transition-all duration-1000 ease-out ${
                        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"
                      } ${isEven ? "" : "lg:flex-row-reverse"}`}
                    >
                      {/* Number Badge - Center on desktop */}
                      <div className="lg:absolute lg:left-1/2 lg:-translate-x-1/2 z-20">
                        <div 
                          className={`w-20 h-20 rounded-2xl gradient-hero flex items-center justify-center shadow-glow transition-all duration-700 ${
                            isVisible ? "scale-100 rotate-0" : "scale-50 rotate-12"
                          }`}
                          style={{ transitionDelay: "0.2s" }}
                        >
                          <span className="font-display text-2xl font-bold text-primary-foreground">
                            {step.number}
                          </span>
                        </div>
                      </div>

                      {/* Content Card */}
                      <div 
                        className={`flex-1 lg:w-5/12 ${isEven ? "lg:pr-24" : "lg:pl-24"}`}
                        style={{ transitionDelay: "0.3s" }}
                      >
                        <div 
                          className={`p-8 rounded-3xl bg-card/50 border border-border/50 backdrop-blur-sm transition-all duration-700 hover:border-primary/30 hover:shadow-glow ${
                            isVisible ? "opacity-100 translate-x-0" : `opacity-0 ${isEven ? "-translate-x-8" : "translate-x-8"}`
                          }`}
                        >
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                              <Icon className="w-6 h-6 text-primary" />
                            </div>
                            <h3 className="font-display text-2xl font-semibold text-foreground">
                              {step.title}
                            </h3>
                          </div>
                          <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                            {step.description}
                          </p>
                          <ul className="space-y-3">
                            {step.features.map((feature, i) => (
                              <li 
                                key={feature} 
                                className={`flex items-center gap-3 text-muted-foreground transition-all duration-500 ${
                                  isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                                }`}
                                style={{ transitionDelay: `${0.5 + i * 0.1}s` }}
                              >
                                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Visual/Icon Side */}
                      <div className={`flex-1 lg:w-5/12 hidden lg:flex ${isEven ? "lg:pl-24 justify-start" : "lg:pr-24 justify-end"}`}>
                        <div 
                          className={`w-48 h-48 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center transition-all duration-1000 ${
                            isVisible ? "opacity-100 scale-100" : "opacity-0 scale-75"
                          }`}
                          style={{ transitionDelay: "0.4s" }}
                        >
                          <Icon className="w-20 h-20 text-primary/60" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section ref={benefitsRef} className="py-20 lg:py-32 relative bg-secondary/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center mb-16">
              <h2 
                className={`font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 transition-all duration-700 ${
                  visibleBenefits ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
              >
                Des résultats <span className="text-gradient">mesurables</span>
              </h2>
              <p 
                className={`text-lg text-muted-foreground transition-all duration-700 ${
                  visibleBenefits ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: "0.1s" }}
              >
                Nos utilisateurs constatent des améliorations significatives dès les premières semaines.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {benefits.map((benefit, index) => (
                <div 
                  key={benefit.title}
                  className={`text-center p-8 rounded-3xl bg-card/50 border border-border/50 backdrop-blur-sm transition-all duration-700 hover:border-primary/30 hover:shadow-glow ${
                    visibleBenefits ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: `${0.2 + index * 0.1}s` }}
                >
                  <div className="font-display text-5xl font-bold text-gradient mb-2">
                    {benefit.value}<span className="text-3xl">{benefit.suffix}</span>
                  </div>
                  <div className="text-foreground font-medium mb-1">{benefit.title}</div>
                  <div className="text-muted-foreground text-sm">{benefit.description}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Prêt à <span className="text-gradient">commencer</span> ?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Rejoignez des centaines d'entrepreneurs qui ont simplifié leur quotidien avec Lokario.
              </p>
              <Button variant="hero" size="lg" className="group">
                Essayer gratuitement
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CommentCaMarche;
