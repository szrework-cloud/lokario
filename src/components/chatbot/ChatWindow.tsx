"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { sendMessage, getConversation, ChatbotMessage } from "@/services/chatbotService";

interface Message {
  id: number;
  text: string;
  isBot: boolean;
}

interface ChatWindowProps {
  conversationId?: number;
  initialMessages?: Message[];
}

export function ChatWindow({ conversationId, initialMessages = [] }: ChatWindowProps) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>(
    initialMessages.length > 0
      ? initialMessages
      : [
          {
            id: 1,
            text: "Bonjour, je suis votre assistant intelligent. Je peux vous aider avec vos clients, factures, tâches, projets et bien plus encore. Comment puis-je vous aider ?",
            isBot: true,
          },
        ]
  );
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<number | undefined>(conversationId);

  // Charger les messages existants si conversationId est fourni
  useEffect(() => {
    if (conversationId && token) {
      loadConversation(conversationId);
    }
  }, [conversationId, token]);

  const loadConversation = async (convId: number) => {
    try {
      const conversation = await getConversation(convId, token);
      if (conversation.messages && conversation.messages.length > 0) {
        const loadedMessages: Message[] = conversation.messages.map((msg) => ({
          id: msg.id,
          text: msg.content,
          isBot: msg.role === "assistant",
        }));
        setMessages(loadedMessages);
      }
      setCurrentConversationId(convId);
    } catch (error) {
      console.error("Erreur lors du chargement de la conversation:", error);
    }
  };

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
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-col h-[500px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isBot ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.isBot
                      ? "bg-slate-900 text-slate-100"
                      : "bg-[#FDBA74]/30 text-[#0F172A]"
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{message.text}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 p-4 space-y-2">
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
                className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Envoi..." : "Envoyer"}
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

