"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { AiActionButton } from "@/components/ai/AiActionButton";

interface Message {
  id: number;
  text: string;
  isBot: boolean;
}

interface ChatWindowProps {
  initialMessages?: Message[];
}

export function ChatWindow({ initialMessages = [] }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(
    initialMessages.length > 0
      ? initialMessages
      : [
          {
            id: 1,
            text: "Bonjour, je suis votre assistant. Comment puis-je vous aider ?",
            isBot: true,
          },
        ]
  );
  const [inputText, setInputText] = useState("");

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: inputText,
      isBot: false,
    };

    setMessages([...messages, userMessage]);
    setInputText("");

    // TODO: Appel backend IA pour générer une réponse
    setTimeout(() => {
      const botResponse: Message = {
        id: messages.length + 2,
        text: "Je traite votre demande...",
        isBot: true,
      };
      setMessages((prev) => [...prev, botResponse]);
    }, 500);
  };

  const handleAiResponse = () => {
    // TODO: Appel backend IA avec contexte
    const aiResponse: Message = {
      id: messages.length + 1,
      text: "Voici une réponse générée par l'IA basée sur votre question et le contexte de l'application.",
      isBot: true,
    };
    setMessages([...messages, aiResponse]);
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
                  <p className="text-sm">{message.text}</p>
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
                className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
              >
                Envoyer
              </button>
            </div>
            <div className="flex justify-end">
              <AiActionButton
                onClick={handleAiResponse}
                label="Réponse IA"
                size="sm"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

