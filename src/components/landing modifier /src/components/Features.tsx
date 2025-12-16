import { MessageSquare, CheckSquare, Bell, Calendar, Sparkles, LayoutDashboard } from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "Messages centralisés",
    description: "Tous vos échanges clients au même endroit. Fini les emails perdus et les messages oubliés.",
  },
  {
    icon: CheckSquare,
    title: "Gestion des tâches",
    description: "Suivez vos tâches et celles de votre équipe avec une interface simple et intuitive.",
  },
  {
    icon: Bell,
    title: "Relances automatiques",
    description: "L'IA détecte les suivis nécessaires et envoie des rappels au bon moment.",
  },
  {
    icon: Calendar,
    title: "Rendez-vous synchronisés",
    description: "Gérez votre agenda et celui de vos collaborateurs sans conflit ni double réservation.",
  },
  {
    icon: Sparkles,
    title: "Automatisation IA",
    description: "Déléguez les tâches répétitives à l'IA pour vous concentrer sur votre cœur de métier.",
  },
  {
    icon: LayoutDashboard,
    title: "Vision globale",
    description: "Un tableau de bord unique pour avoir une vue d'ensemble claire de votre activité.",
  },
];

export const Features = () => {
  return (
    <section id="features" className="py-20 lg:py-32 relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
            Fonctionnalités
          </span>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Tout ce dont vous avez besoin,{" "}
            <span className="text-gradient">rien de plus</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Des outils simples et efficaces pour gérer votre quotidien d'entrepreneur sans complexité inutile.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative bg-card rounded-2xl p-6 lg:p-8 border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-medium animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl gradient-hero flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              
              {/* Content */}
              <h3 className="font-display text-xl font-semibold mb-3 text-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Hover decoration */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
