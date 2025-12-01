"use client";

export default function RLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Layout minimal pour les pages de réservation publiques
  // N'utilise pas le layout public pour éviter le header/footer
  return <div className="min-h-screen">{children}</div>;
}

