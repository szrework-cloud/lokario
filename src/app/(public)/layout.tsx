"use client";

import { CookieBanner } from "@/components/legal/CookieBanner";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">{children}</main>
      <CookieBanner />
    </div>
  );
}

