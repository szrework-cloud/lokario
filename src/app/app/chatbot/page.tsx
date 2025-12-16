"use client";

import { PageTitle } from "@/components/layout/PageTitle";
import { ChatWindow } from "@/components/chatbot/ChatWindow";

export default function ChatbotPage() {
  return (
    <>
      <PageTitle title="Chatbot" />
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A]">Chatbot</h1>
          <p className="text-slate-600 mt-2">
            Posez vos questions sur vos clients, factures, tâches, projets et plus encore.
          </p>
        </div>

        <ChatWindow />
      </div>
    </>
  );
}

