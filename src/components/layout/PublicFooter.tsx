"use client";

import Link from "next/link";
import Image from "next/image";

export function PublicFooter() {
  return (
    <footer className="border-t border-[#E5E7EB] bg-white">
      <div className="container mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image 
                src="/lokario-logo.png" 
                alt="Lokario" 
                width={32} 
                height={32}
                className="h-8 w-auto" 
              />
              <h3 className="text-lg font-semibold text-[#0F172A]">
                LOKARIO
            </h3>
            </Link>
            <p className="text-sm text-[#64748B]">
              Gestion administrative simplifiée pour petits commerces
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-[#0F172A] mb-4">
              Produit
            </h4>
            <ul className="space-y-2 text-sm text-[#64748B]">
              <li>
                <Link href="#" className="hover:text-[#0F172A] transition-colors">
                  Fonctionnalités
                </Link>
              </li>
              <li>
                <Link href="/app/pricing" className="hover:text-[#0F172A] transition-colors">
                  Tarifs
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-[#0F172A] transition-colors">
                  Documentation
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-[#0F172A] mb-4">
              Entreprise
            </h4>
            <ul className="space-y-2 text-sm text-[#64748B]">
              <li>
                <Link href="#" className="hover:text-[#0F172A] transition-colors">
                  À propos
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-[#0F172A] transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-[#0F172A] transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-[#0F172A] mb-4">
              Légal
            </h4>
            <ul className="space-y-2 text-sm text-[#64748B]">
              <li>
                <Link href="/legal/cgu" className="hover:text-[#0F172A] transition-colors">
                  CGU
                </Link>
              </li>
              <li>
                <Link href="/legal/cgv" className="hover:text-[#0F172A] transition-colors">
                  CGV
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-[#0F172A] transition-colors">
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link href="/legal/mentions-legales" className="hover:text-[#0F172A] transition-colors">
                  Mentions légales
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-[#E5E7EB] flex flex-col md:flex-row items-center justify-between text-sm text-[#64748B]">
          <p>© 2025 LOKARIO. Tous droits réservés.</p>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <a
              href="mailto:lokario.saas@gmail.com"
              className="hover:text-[#0F172A] transition-colors"
              aria-label="Email"
            >
              Email
            </a>
            <a
              href="https://wa.me/33770034283"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#0F172A] transition-colors"
              aria-label="WhatsApp"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

