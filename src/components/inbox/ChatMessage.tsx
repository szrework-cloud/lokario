"use client";

import { Message, MessageSource } from "./types";

interface ChatMessageProps {
  message: Message;
  showDateSeparator?: boolean;
  dateLabel?: string;
}

export function ChatMessage({ message, showDateSeparator, dateLabel }: ChatMessageProps) {
  const sourceIcons: Record<MessageSource, string> = {
    email: "✉️",
    whatsapp: "📱",
    messenger: "💬",
    formulaire: "📝",
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <>
      {showDateSeparator && dateLabel && (
        <div className="flex items-center justify-center my-4">
          <div className="bg-[#F9FAFB] px-3 py-1 rounded-full text-xs text-[#64748B] font-medium">
            {dateLabel}
          </div>
        </div>
      )}
      <div
        className={`flex gap-3 mb-4 ${
          message.isFromClient ? "justify-start" : "justify-end"
        }`}
      >
        {message.isFromClient && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#F97316] to-[#EA580C] flex items-center justify-center text-white text-xs font-semibold">
            {getInitials(message.from)}
          </div>
        )}
        <div
          className={`max-w-[70%] ${
            message.isFromClient ? "order-2" : "order-1"
          }`}
        >
          <div
            className={`rounded-2xl px-4 py-2 ${
              message.isFromClient
                ? "bg-white border border-[#E5E7EB] rounded-tl-none"
                : "bg-[#F97316] text-white rounded-tr-none"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`text-xs font-medium ${
                  message.isFromClient ? "text-[#0F172A]" : "text-white/90"
                }`}
              >
                {message.from}
              </span>
              <span className="text-xs opacity-70">
                {sourceIcons[message.source]}
              </span>
            </div>
            <p
              className={`text-sm whitespace-pre-wrap ${
                message.isFromClient ? "text-[#0F172A]" : "text-white"
              }`}
            >
              {message.content}
            </p>
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2 p-2 bg-black/10 rounded-lg"
                  >
                    <span className="text-lg">
                      {attachment.type === "image" && "🖼️"}
                      {attachment.type === "pdf" && "📄"}
                      {attachment.type === "document" && "📎"}
                      {attachment.type === "other" && "📎"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{attachment.name}</p>
                      <p className="text-xs opacity-70">
                        {(attachment.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline"
                    >
                      Voir
                    </a>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-end mt-1">
              <span
                className={`text-xs ${
                  message.isFromClient ? "text-[#64748B]" : "text-white/70"
                }`}
              >
                {formatTime(message.date)}
              </span>
            </div>
          </div>
        </div>
        {!message.isFromClient && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#F97316] to-[#EA580C] flex items-center justify-center text-white text-xs font-semibold order-2">
            Vous
          </div>
        )}
      </div>
    </>
  );
}

