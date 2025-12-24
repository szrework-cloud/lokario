"use client";

import { Button } from "@/components/ui/Button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export const LandingHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-white/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="absolute left-4 sm:left-6 lg:left-8 flex items-center gap-2">
            <Image 
              src="/assets/lokario-logo.png" 
              alt="Lokario" 
              width={40} 
              height={40}
              className="h-11 w-auto" 
            />
            <span className="font-display font-bold text-xl text-white">Lokario</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/fonctionnalites" className="text-white/70 hover:text-white transition-colors">
              Fonctionnalités
            </Link>
            <Link href="/comment-ca-marche" className="text-white/70 hover:text-white transition-colors">
              Comment ça marche
            </Link>
            <Link href="/tarif" className="text-white/70 hover:text-white transition-colors">
              Tarifs
            </Link>
            <Link href="/faq" className="text-white/70 hover:text-white transition-colors">
              FAQ
            </Link>
          </nav>

          {/* Desktop CTA */}
          <div className="absolute right-4 sm:right-6 lg:right-8 hidden md:flex items-center gap-4">
            <Link href="/login" className="text-white/70 hover:text-white transition-colors">
              Se connecter
            </Link>
            <Link href="/register">
              <Button variant="ghost" size="sm" className="border border-white/30 rounded-full px-6 text-white hover:bg-white/10">
                Essayer gratuitement
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="absolute right-4 sm:right-6 md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/20 animate-fade-up">
            <nav className="flex flex-col gap-4">
              <Link
                href="/fonctionnalites"
                className="text-white/70 hover:text-white transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Fonctionnalités
              </Link>
              <Link
                href="/comment-ca-marche"
                className="text-white/70 hover:text-white transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Comment ça marche
              </Link>
              <Link
                href="/tarif"
                className="text-white/70 hover:text-white transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Tarifs
              </Link>
              <Link
                href="/faq"
                className="text-white/70 hover:text-white transition-colors py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                FAQ
              </Link>
              <div className="flex flex-col gap-3 pt-4 border-t border-white/20">
                <Link href="/login" className="text-white/70 hover:text-white transition-colors text-center py-2">
                  Se connecter
                </Link>
                <Link href="/register">
                  <Button variant="ghost" className="w-full border border-white/30 rounded-full text-white hover:bg-white/10">
                    Essayer gratuitement
                  </Button>
                </Link>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
