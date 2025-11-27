"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { AiActionButton } from "./AiActionButton";

export function AiSummaryCard() {
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    // TODO: Appel backend IA avec les vraies données (tâches, relances, etc.)
    setTimeout(() => {
      setSummary(
        "Aujourd'hui, 3 tâches urgentes : relancer 2 devis non répondu, préparer 1 facture et rappeler 1 client en attente. Priorité : sécuriser les paiements en retard."
      );
      setIsGenerating(false);
    }, 1000);
  };

  return (
    <Card className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-slate-700">
      <CardHeader className="border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <h3 className="text-lg font-semibold text-slate-100">
            Résumé IA de la journée
          </h3>
        </div>
      </CardHeader>
      <CardContent>
        {!summary ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Cliquez sur le bouton ci-dessous pour générer un résumé de vos
              priorités du jour.
            </p>
            <AiActionButton
              onClick={handleGenerate}
              label={isGenerating ? "Génération..." : "Générer le résumé"}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-100 leading-relaxed">{summary}</p>
            <button
              onClick={() => setSummary(null)}
              className="text-sm text-[#FDBA74] hover:text-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] rounded"
            >
              Régénérer
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

