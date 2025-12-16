import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { 
  LayoutDashboard, 
  CheckSquare, 
  Inbox, 
  Bell, 
  Users, 
  FolderKanban, 
  FileText, 
  Calendar, 
  MessageSquare, 
  Settings,
  Zap,
  TrendingUp,
  Clock,
  Shield,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Import screenshots
import dashboardTimeImg from "@/assets/screenshots/dashboard-time.png";
import tachesImg from "@/assets/screenshots/taches.png";
import clientsImg from "@/assets/screenshots/clients.png";
import rendezVousImg from "@/assets/screenshots/rendez-vous.png";
import devisFacturesImg from "@/assets/screenshots/devis-factures.png";
import projetsImg from "@/assets/screenshots/projets.png";
import inboxImg from "@/assets/screenshots/inbox.png";
import relancesImg from "@/assets/screenshots/relances.png";

const modules = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    subtitle: "Vue d'ensemble intelligente",
    description: "Visualisez vos performances en temps réel avec des KPIs clairs : devis, CA, factures, relances. Graphiques de suivi et planning du jour intégrés.",
    features: ["KPIs temps réel", "Graphiques de performance", "Planning quotidien", "Actions rapides"],
    gradient: "from-primary/20 to-primary/5",
    screenshot: dashboardTimeImg
  },
  {
    icon: CheckSquare,
    title: "Tâches",
    subtitle: "Organisation optimale",
    description: "Créez, assignez et suivez vos tâches avec priorités, checklists et notifications. Vue calendrier ou liste selon vos préférences.",
    features: ["Priorités & statuts", "Checklists intégrées", "Assignation équipe", "Notifications auto"],
    gradient: "from-emerald-500/20 to-emerald-500/5",
    screenshot: tachesImg
  },
  {
    icon: Inbox,
    title: "Inbox",
    subtitle: "Communications centralisées",
    description: "Tous vos emails et SMS au même endroit. L'IA classe automatiquement, identifie les expéditeurs et suggère des réponses pertinentes.",
    features: ["Classification IA", "Réponses suggérées", "Dossiers personnalisés", "Réponses automatiques"],
    gradient: "from-blue-500/20 to-blue-500/5",
    screenshot: inboxImg
  },
  {
    icon: Bell,
    title: "Relances",
    subtitle: "Suivi automatisé",
    description: "Relances automatiques de devis, factures et informations. L'IA génère des messages personnalisés envoyés au bon moment.",
    features: ["Relances auto", "Messages IA", "Email & SMS", "Statistiques"],
    gradient: "from-amber-500/20 to-amber-500/5",
    screenshot: relancesImg
  },
  {
    icon: Users,
    title: "Clients",
    subtitle: "CRM simplifié",
    description: "Gérez votre base clients avec toutes les informations essentielles, l'historique des interactions et les documents associés.",
    features: ["Fiches complètes", "Historique interactions", "Documents associés", "Stats par client"],
    gradient: "from-violet-500/20 to-violet-500/5",
    screenshot: clientsImg
  },
  {
    icon: FolderKanban,
    title: "Projets",
    subtitle: "Suivi de A à Z",
    description: "Timeline des événements, gestion documentaire et suivi budgétaire. Gardez une vue claire sur l'avancement de chaque projet.",
    features: ["Timeline projet", "Gestion documents", "Suivi budget", "Statuts personnalisés"],
    gradient: "from-rose-500/20 to-rose-500/5",
    screenshot: projetsImg
  },
  {
    icon: FileText,
    title: "Devis & Factures",
    subtitle: "Facturation professionnelle",
    description: "Créez des devis signables en ligne, convertissez-les en factures automatiquement. Conformité réglementaire garantie.",
    features: ["Signature électronique", "Conversion auto", "Suivi paiements", "PDF conformes"],
    gradient: "from-cyan-500/20 to-cyan-500/5",
    screenshot: devisFacturesImg
  },
  {
    icon: Calendar,
    title: "Rendez-vous",
    subtitle: "Agenda intelligent",
    description: "Vue calendrier ou liste, types de RDV personnalisables, disponibilités et rappels automatiques pour ne jamais rater un meeting.",
    features: ["Vue agenda", "Types personnalisés", "Disponibilités", "Rappels auto"],
    gradient: "from-indigo-500/20 to-indigo-500/5",
    screenshot: rendezVousImg
  }
];

const highlights = [
  {
    icon: Zap,
    title: "Automatisation IA",
    description: "L'intelligence artificielle travaille pour vous en arrière-plan"
  },
  {
    icon: TrendingUp,
    title: "Gain de temps",
    description: "Réduisez de 70% le temps passé sur les tâches administratives"
  },
  {
    icon: Clock,
    title: "Temps réel",
    description: "Toutes vos données synchronisées instantanément"
  },
  {
    icon: Shield,
    title: "Sécurité",
    description: "Vos données protégées selon les standards les plus stricts"
  }
];

const Fonctionnalites = () => {
  const [visibleModules, setVisibleModules] = useState<number[]>([]);
  const moduleRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    moduleRefs.current.forEach((ref, index) => {
      if (ref) {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                setVisibleModules((prev) => 
                  prev.includes(index) ? prev : [...prev, index]
                );
              }
            });
          },
          { threshold: 0.2, rootMargin: "0px 0px -50px 0px" }
        );
        observer.observe(ref);
        observers.push(observer);
      }
    });

    return () => observers.forEach((obs) => obs.disconnect());
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 lg:py-32 relative overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
          
          {/* Top gradient fade */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background via-background/50 to-transparent z-10" />
          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
            <div className="max-w-4xl mx-auto text-center">
              <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-up">
                Fonctionnalités
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 animate-fade-up" style={{ animationDelay: "0.1s" }}>
                Tout ce dont vous avez besoin,{" "}
                <span className="text-gradient">au même endroit</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "0.2s" }}>
                8 modules interconnectés, propulsés par l'IA, pour gérer votre entreprise sans complexité. Découvrez chaque fonctionnalité en détail.
              </p>
            </div>
          </div>
        </section>

        {/* Highlights Bar */}
        <section className="py-12 border-y border-border/30 bg-card/30 backdrop-blur-sm relative">
          <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-background to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {highlights.map((highlight, index) => (
                <div 
                  key={highlight.title}
                  className="flex items-center gap-4 animate-fade-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <highlight.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{highlight.title}</h3>
                    <p className="text-sm text-muted-foreground">{highlight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Modules Grid */}
        <section className="py-20 lg:py-32 relative">
          {/* Gradient transitions */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-background to-transparent z-10" />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent z-10" />
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-0">
            <div className="grid gap-16 lg:gap-24">
              {modules.map((module, index) => {
                const isVisible = visibleModules.includes(index);
                const isEven = index % 2 === 0;
                
                return (
                  <div
                    key={module.title}
                    ref={(el) => { moduleRefs.current[index] = el; }}
                    className={`
                      relative transition-all duration-1000 ease-out
                      ${isVisible 
                        ? 'opacity-100 translate-y-0' 
                        : 'opacity-0 translate-y-16'
                      }
                    `}
                    style={{ transitionDelay: `${(index % 3) * 100}ms` }}
                  >
                    <div className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 lg:gap-16 items-center`}>
                      
                      {/* Text Content */}
                      <div className="flex-1 lg:w-1/2">
                        <div className={`
                          flex items-center gap-4 mb-6
                          ${isVisible ? 'animate-fade-up' : 'opacity-0'}
                        `}
                        style={{ animationDelay: '0.1s' }}
                        >
                          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${module.gradient} flex items-center justify-center border border-white/10`}>
                            <module.icon className="w-7 h-7 text-primary" />
                          </div>
                          <div>
                            <h2 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
                              {module.title}
                            </h2>
                            <p className="text-primary font-medium text-sm">{module.subtitle}</p>
                          </div>
                        </div>
                        
                        <p className={`
                          text-muted-foreground leading-relaxed mb-8 text-lg
                          ${isVisible ? 'animate-fade-up' : 'opacity-0'}
                        `}
                        style={{ animationDelay: '0.2s' }}
                        >
                          {module.description}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-3">
                          {module.features.map((feature, featureIndex) => (
                            <div 
                              key={feature}
                              className={`
                                flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/30
                                transition-all duration-500 hover:border-primary/30 hover:bg-card/80
                                ${isVisible ? 'animate-fade-up' : 'opacity-0'}
                              `}
                              style={{ animationDelay: `${0.3 + featureIndex * 0.1}s` }}
                            >
                              <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                              <span className="text-sm text-foreground">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Screenshot Preview */}
                      <div className={`
                        flex-1 lg:w-1/2
                        ${isVisible ? 'animate-fade-up' : 'opacity-0'}
                      `}
                      style={{ animationDelay: '0.3s' }}
                      >
                        <div className="relative group">
                          {/* Glow effect */}
                          <div className={`absolute -inset-4 bg-gradient-to-br ${module.gradient} rounded-3xl opacity-30 blur-2xl group-hover:opacity-50 transition-opacity duration-500`} />
                          
                          {/* Preview Container */}
                          <div className="relative rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/20 group-hover:border-primary/30 transition-colors duration-500">
                            {/* Screenshot */}
                            {module.screenshot ? (
                              <div className="relative overflow-hidden">
                                <img 
                                  src={module.screenshot} 
                                  alt={`Capture d'écran ${module.title}`}
                                  className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-105 brightness-[0.85]"
                                />
                                {/* Overlay gradient for polish */}
                                <div className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-transparent pointer-events-none" />
                              </div>
                            ) : (
                              <div className="aspect-[16/10] bg-gradient-to-br from-muted/20 via-muted/10 to-muted/5 flex items-center justify-center p-8 relative overflow-hidden">
                                {/* Decorative grid */}
                                <div className="absolute inset-0 opacity-[0.03]" style={{
                                  backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
                                  backgroundSize: '40px 40px'
                                }} />
                                
                                {/* Central content */}
                                <div className="relative z-10 text-center">
                                  <div className={`w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br ${module.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500`}>
                                    <module.icon className="w-10 h-10 text-primary" />
                                  </div>
                                  <p className="text-muted-foreground/60 text-sm font-medium">{module.subtitle}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Separator gradient */}
                    {index < modules.length - 1 && (
                      <div className="mt-16 lg:mt-24 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 lg:py-32 relative">
          {/* Gradient transitions */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-background to-transparent z-10" />
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent z-10" />
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-0">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-12">
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                  Questions fréquentes
                </span>
                <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
                  Tout ce que vous devez savoir
                </h2>
                <p className="text-muted-foreground">
                  Les réponses aux questions les plus courantes sur Lokario
                </p>
              </div>
              
              <div className="space-y-4">
                {[
                  {
                    question: "Combien de temps faut-il pour configurer Lokario ?",
                    answer: "Lokario est conçu pour être opérationnel en quelques minutes. Il suffit de créer votre compte, d'entrer les informations de votre entreprise et vous pouvez commencer à utiliser tous les modules immédiatement. Aucune configuration technique complexe n'est requise."
                  },
                  {
                    question: "Puis-je importer mes données existantes ?",
                    answer: "Oui, Lokario permet d'importer facilement vos clients, projets et factures depuis un fichier CSV ou Excel. Notre équipe peut également vous accompagner pour une migration personnalisée depuis votre outil actuel."
                  },
                  {
                    question: "Comment fonctionne l'intelligence artificielle ?",
                    answer: "L'IA de Lokario analyse automatiquement vos emails et messages pour les classifier, identifier les expéditeurs et suggérer des réponses. Elle génère également des relances personnalisées et vous aide à prioriser vos tâches quotidiennes."
                  },
                  {
                    question: "Mes données sont-elles sécurisées ?",
                    answer: "Absolument. Vos données sont chiffrées en transit et au repos. Nous utilisons des serveurs sécurisés en Europe et sommes conformes au RGPD. Vous restez propriétaire de vos données et pouvez les exporter à tout moment."
                  },
                  {
                    question: "Puis-je annuler mon abonnement à tout moment ?",
                    answer: "Oui, Lokario fonctionne sans engagement. Vous pouvez annuler votre abonnement à tout moment depuis les paramètres de votre compte. Vos données restent accessibles pendant 30 jours après l'annulation."
                  },
                  {
                    question: "Y a-t-il une application mobile ?",
                    answer: "Lokario est une application web responsive qui fonctionne parfaitement sur mobile, tablette et ordinateur. Vous pouvez l'ajouter à l'écran d'accueil de votre téléphone pour un accès rapide comme une application native."
                  }
                ].map((faq, index) => (
                  <details
                    key={index}
                    className="group rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-primary/30"
                  >
                    <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                      <span className="font-semibold text-foreground pr-4">{faq.question}</span>
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center transition-transform duration-300 group-open:rotate-45">
                        <span className="text-primary text-xl leading-none">+</span>
                      </span>
                    </summary>
                    <div className="px-6 pb-6 text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 lg:py-32 relative overflow-hidden">
          {/* Top gradient fade for smooth transition */}
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-background via-background/80 to-transparent z-10" />
          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />
          
          <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-primary/5 to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/15 rounded-full blur-3xl opacity-60" />
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-8">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">Prêt à simplifier votre quotidien ?</span>
              </div>
              
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Commencez gratuitement,{" "}
                <span className="text-gradient">sans engagement</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
                Découvrez toutes les fonctionnalités de Lokario avec un essai gratuit. Aucune carte bancaire requise.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="#" 
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/25"
                >
                  Essayer gratuitement
                  <ArrowRight className="w-5 h-5" />
                </a>
                <a 
                  href="/tarif" 
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border border-white/30 text-foreground font-semibold hover:bg-white/5 transition-all duration-300"
                >
                  Voir les tarifs
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Fonctionnalites;
