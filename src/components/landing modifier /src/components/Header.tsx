import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import lokarioLogo from "@/assets/lokario-logo.png";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <img src={lokarioLogo} alt="Lokario" className="h-10 w-auto" />
            <span className="font-display font-bold text-xl text-foreground">Lokario</span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="/fonctionnalites" className="text-muted-foreground hover:text-foreground transition-colors">
              Fonctionnalités
            </a>
            <a href="/comment-ca-marche" className="text-muted-foreground hover:text-foreground transition-colors">
              Comment ça marche
            </a>
            <a href="/tarif" className="text-muted-foreground hover:text-foreground transition-colors">
              Tarifs
            </a>
            <a href="/faq" className="text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </a>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
              Se connecter
            </a>
            <Button variant="ghost" size="sm" className="border border-white/30 rounded-full px-6 text-white hover:bg-white/10">
              Essayer gratuitement
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-foreground" />
            ) : (
              <Menu className="w-6 h-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50 animate-fade-up">
            <nav className="flex flex-col gap-4">
              <a
                href="/fonctionnalites"
                className="text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Fonctionnalités
              </a>
              <a
                href="/comment-ca-marche"
                className="text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Comment ça marche
              </a>
              <a
                href="/tarif"
                className="text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Tarifs
              </a>
              <a
                href="/faq"
                className="text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                FAQ
              </a>
              <div className="flex flex-col gap-3 pt-4 border-t border-border/50">
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-center py-2">
                  Se connecter
                </a>
                <Button variant="ghost" className="w-full border border-white/30 rounded-full text-white hover:bg-white/10">
                  Essayer gratuitement
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
