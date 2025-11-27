"use client";

import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-[#E5E7EB] bg-white">
      <div className="container mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-semibold text-[#0F172A] mb-4">
              Local Assistant
            </h3>
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
                <Link href="#" className="hover:text-[#0F172A] transition-colors">
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
                <Link href="#" className="hover:text-[#0F172A] transition-colors">
                  CGU
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-[#0F172A] transition-colors">
                  Confidentialité
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-[#0F172A] transition-colors">
                  Cookies
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-[#E5E7EB] flex flex-col md:flex-row items-center justify-between text-sm text-[#64748B]">
          <p>© 2025 Local Assistant. Tous droits réservés.</p>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <a
              href="#"
              className="hover:text-[#0F172A] transition-colors"
              aria-label="Twitter"
            >
              Twitter
            </a>
            <a
              href="#"
              className="hover:text-[#0F172A] transition-colors"
              aria-label="LinkedIn"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

