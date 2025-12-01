"use client";

import { PageTitle } from "@/components/layout/PageTitle";
import { FloatingChatWidget } from "@/components/chatbot/FloatingChatWidget";
import { Card, CardContent } from "@/components/ui/Card";

export default function ChatbotPage() {
  return (
    <>
      <PageTitle title="Chatbot" />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Chatbot</h1>
        </div>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-slate-600 mb-4">
              Le widget de chat est disponible en bas à droite de votre écran. Cliquez sur le bouton pour commencer une conversation avec l'assistant.
            </p>
            <p className="text-xs text-slate-500">
              Le chatbot vous aide à utiliser le logiciel, à retrouver des fonctions et à répondre à vos questions fréquentes.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

