"use client";

import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="border-b border-[#E5E7EB] bg-white sticky top-0 z-50">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-[#0F172A]">
            Local Assistant
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm font-medium text-[#64748B] hover:text-[#0F172A] transition-colors"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 transition-all"
            >
              Créer un compte
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

