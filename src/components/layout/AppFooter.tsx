"use client";

export function AppFooter() {
  return (
    <footer className="border-t border-[#E5E7EB] bg-white px-8 py-4">
      <div className="flex items-center justify-between text-sm text-[#64748B]">
        <div className="flex items-center gap-4">
          <span>© 2025 Local Assistant</span>
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

