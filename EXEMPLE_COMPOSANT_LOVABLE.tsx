// EXEMPLE : Header.tsx adapté pour Lovable (Vite + React)
// Ce fichier montre comment adapter un composant Next.js pour Lovable

// ❌ SUPPRIMER : "use client" (pas nécessaire dans Vite)
// ✅ GARDER : Les imports React et les composants UI

import { Button } from "@/components/ui/Button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
// ❌ REMPLACER : import Link from "next/link";
// ✅ PAR : import { Link } from "react-router-dom"; (si vous utilisez React Router)
// OU simplement utiliser <a> pour les liens
import logoImage from "@/assets/lokario-logo.png"; // Import de l'image

export const LandingHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          {/* ❌ REMPLACER : <Link href="/"> avec Next.js Image */}
          {/* ✅ PAR : */}
          <a href="/" className="flex items-center gap-2">
            <img 
              src={logoImage} 
              alt="Lokario" 
              className="h-10 w-auto" 
            />
            <span className="font-display font-bold text-xl text-white">Lokario</span>
          </a>
          {/* OU avec React Router : */}
          {/* <Link to="/" className="flex items-center gap-2">
            <img src={logoImage} alt="Lokario" className="h-10 w-auto" />
            <span className="font-display font-bold text-xl text-white">Lokario</span>
          </Link> */}

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-white/70 hover:text-white transition-colors">
              Fonctionnalités
            </a>
            <a href="#how-it-works" className="text-white/70 hover:text-white transition-colors">
              Comment ça marche
            </a>
            {/* ❌ REMPLACER : <Link href="/app/pricing"> */}
            {/* ✅ PAR : */}
            <a href="/app/pricing" className="text-white/70 hover:text-white transition-colors">
              Tarifs
            </a>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            {/* ❌ REMPLACER : <Link href="/login"> */}
            {/* ✅ PAR : */}
            <a href="/login" className="text-white/70 hover:text-white transition-colors">
              Se connecter
            </a>
            <a href="/register">
              <Button variant="ghost" size="sm" className="border border-white/30 rounded-full px-6 text-white hover:bg-white/10">
                Essayer gratuitement
              </Button>
            </a>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-4">
            <a href="#features" className="block text-white/70 hover:text-white">
              Fonctionnalités
            </a>
            <a href="#how-it-works" className="block text-white/70 hover:text-white">
              Comment ça marche
            </a>
            <a href="/app/pricing" className="block text-white/70 hover:text-white">
              Tarifs
            </a>
            <a href="/login" className="block text-white/70 hover:text-white">
              Se connecter
            </a>
            <a href="/register">
              <Button variant="ghost" size="sm" className="w-full border border-white/30 rounded-full text-white hover:bg-white/10">
                Essayer gratuitement
              </Button>
            </a>
          </div>
        )}
      </div>
    </header>
  );
};
