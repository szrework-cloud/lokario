"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";

interface EmbedCodeBlockProps {
  code: string;
  companyId?: string;
  onCopy?: () => void;
}

export function EmbedCodeBlock({ code, companyId, onCopy }: EmbedCodeBlockProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    onCopy?.();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#0F172A]">
            Code d'intégration
          </h3>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative rounded-lg bg-slate-900 p-4 font-mono text-sm text-slate-100">
          <pre className="overflow-x-auto">
            <code className="text-slate-100">{code}</code>
          </pre>
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 rounded bg-[#F97316] px-2 py-1 text-xs text-white hover:bg-[#EA580C] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
          >
            Copier le code
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          TODO: Générer un vrai script depuis le backend avec companyId
        </p>
      </CardContent>
    </Card>
  );
}

