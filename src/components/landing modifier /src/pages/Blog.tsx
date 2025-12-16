import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Calendar, ArrowRight } from "lucide-react";

const articles = [
  {
    title: "Comment automatiser vos relances clients avec l'IA",
    excerpt: "Découvrez comment Lokario utilise l'intelligence artificielle pour générer des relances personnalisées et au bon moment.",
    date: "15 Décembre 2025",
    category: "Fonctionnalités",
    readTime: "5 min"
  },
  {
    title: "5 astuces pour une gestion de projet efficace",
    excerpt: "Optimisez votre productivité avec ces conseils pratiques pour mieux gérer vos projets et vos tâches quotidiennes.",
    date: "10 Décembre 2025",
    category: "Conseils",
    readTime: "4 min"
  },
  {
    title: "La facturation simplifiée pour les indépendants",
    excerpt: "Guide complet pour créer des devis et factures professionnels en quelques clics avec Lokario.",
    date: "5 Décembre 2025",
    category: "Tutoriel",
    readTime: "6 min"
  }
];

const Blog = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-20">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Blog
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Conseils, actualités et tutoriels pour optimiser la gestion de votre entreprise.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid gap-8">
              {articles.map((article, index) => (
                <article 
                  key={index}
                  className="group p-8 rounded-2xl bg-card/30 border border-border/30 backdrop-blur-sm hover:border-primary/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-xs px-3 py-1 rounded-full bg-primary/20 text-primary">
                      {article.category}
                    </span>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      {article.date}
                    </div>
                    <span className="text-sm text-muted-foreground">• {article.readTime}</span>
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
                    {article.title}
                  </h2>
                  <p className="text-muted-foreground mb-4">{article.excerpt}</p>
                  <div className="flex items-center gap-2 text-primary font-medium">
                    Lire l'article
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </article>
              ))}
            </div>

            <div className="text-center mt-12">
              <p className="text-muted-foreground">
                Plus d'articles arrivent bientôt...
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;