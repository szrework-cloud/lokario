"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { sendMessage } from "@/services/chatbotService";

interface Message {
  id: number;
  text: string;
  isBot: boolean;
}

export function FloatingChatWidget() {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Bonjour, je suis votre assistant intelligent. Comment puis-je vous aider ?",
      isBot: true,
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<number | undefined>();

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessageText = inputText.trim();
    setInputText("");
    setIsLoading(true);

    // Ajouter le message de l'utilisateur immédiatement
    const userMessage: Message = {
      id: Date.now(),
      text: userMessageText,
      isBot: false,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Ajouter un message de chargement
    const loadingMessage: Message = {
      id: Date.now() + 1,
      text: "Je réfléchis...",
      isBot: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      // Envoyer le message au backend
      const response = await sendMessage(
        {
          message: userMessageText,
          conversation_id: currentConversationId,
        },
        token
      );

      // Mettre à jour l'ID de conversation si c'était une nouvelle conversation
      if (!currentConversationId && response.conversation_id) {
        setCurrentConversationId(response.conversation_id);
      }

      // Remplacer le message de chargement par la vraie réponse
      setMessages((prev) => {
        const newMessages = [...prev];
        const loadingIndex = newMessages.findIndex((m) => m.id === loadingMessage.id);
        if (loadingIndex !== -1) {
          newMessages[loadingIndex] = {
            id: response.response.id,
            text: response.response.content,
            isBot: true,
          };
        }
        return newMessages;
      });
    } catch (error: any) {
      console.error("Erreur lors de l'envoi du message:", error);
      
      // Remplacer le message de chargement par un message d'erreur
      setMessages((prev) => {
        const newMessages = [...prev];
        const loadingIndex = newMessages.findIndex((m) => m.id === loadingMessage.id);
        if (loadingIndex !== -1) {
          newMessages[loadingIndex] = {
            id: loadingMessage.id,
            text: error.message || "Une erreur est survenue. Veuillez réessayer.",
            isBot: true,
          };
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Bouton flottant */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-gradient-to-r from-[#F97316] to-[#EA580C] shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center group"
          aria-label="Ouvrir le chat"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          {/* Badge de notification (optionnel) */}
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 border-2 border-white flex items-center justify-center">
            <span className="text-xs text-white font-bold">1</span>
          </span>
        </button>
      )}

      {/* Fenêtre de chat */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-[#E5E7EB] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400"></div>
              <h3 className="text-white font-semibold text-sm">Assistant</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-slate-200 transition-colors"
              aria-label="Fermer le chat"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F9FAFB]">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isBot ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.isBot
                      ? "bg-white border border-[#E5E7EB] text-[#0F172A]"
                      : "bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{message.text}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-[#E5E7EB] p-4 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                className="flex-1 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-1"
                placeholder="Tapez votre message..."
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="rounded-lg bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

