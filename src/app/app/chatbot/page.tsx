"use client";

import { useState } from "react";
import { PageTitle } from "@/components/layout/PageTitle";
import { ChatWindow } from "@/components/chatbot/ChatWindow";
import { Card, CardContent } from "@/components/ui/Card";
import { Toast } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";

export default function ChatbotPage() {
  const [activeTab, setActiveTab] = useState<"internal" | "external">(
    "internal"
  );
  const { toast, hideToast } = useToast();

  return (
    <>
      <PageTitle title="Chatbot" />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Chatbot</h1>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("internal")}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === "internal"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              Chatbot interne
            </button>
            <button
              onClick={() => setActiveTab("external")}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === "external"
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              Chatbot site web
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "internal" && (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-slate-600">
                  Ce chatbot vous aide à utiliser le logiciel, à retrouver des
                  fonctions et à répondre à vos questions fréquentes.
                </p>
              </CardContent>
            </Card>

            <ChatWindow
              initialMessages={[
                {
                  id: 1,
                  text: "Bonjour, je suis votre assistant. Comment puis-je vous aider ?",
                  isBot: true,
                },
                {
                  id: 2,
                  text: "Comment créer un devis ?",
                  isBot: false,
                },
                {
                  id: 3,
                  text: "Allez dans 'Devis & Factures' puis cliquez sur 'Créer un devis'.",
                  isBot: true,
                },
              ]}
            />

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-600">
                TODO: Futur appel IA avec contexte "documentation produit /
                FAQ"
              </p>
            </div>
          </div>
        )}

        {activeTab === "external" && (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-lg font-medium text-slate-900 text-center">
                  Contacter l'administrateur
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Toast
          message={toast.message}
          isVisible={toast.isVisible}
          onClose={hideToast}
          type={toast.type}
        />
      </div>
    </>
  );
}

