"use client";

import Image from "next/image";

export function AppFooter() {
  return (
    <footer className="border-t border-[#E5E7EB] bg-white px-8 py-4">
      <div className="flex items-center justify-between text-sm text-[#64748B]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Image 
              src="/lokario-logo.png" 
              alt="Lokario" 
              width={20} 
              height={20}
              className="h-5 w-auto" 
            />
            <span>© 2025 LOKARIO</span>
          </div>
          <span className="text-[#E5E7EB]">|</span>
          <a
            href="/app/settings"
            className="hover:text-[#0F172A] transition-colors"
          >
            Support
          </a>
          <span className="text-[#E5E7EB]">|</span>
          <a
            href="#"
            className="hover:text-[#0F172A] transition-colors"
          >
            Documentation
          </a>
        </div>
        <div className="text-xs">
          Version 1.0.0
        </div>
      </div>
    </footer>
  );
}

