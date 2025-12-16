"use client";

import { useState } from "react";
import { Message, MessageSource, Attachment } from "./types";
import { useAuth } from "@/hooks/useAuth";

interface ChatMessageProps {
  message: Message;
  showDateSeparator?: boolean;
  dateLabel?: string;
}

export function ChatMessage({ message, showDateSeparator, dateLabel }: ChatMessageProps) {
  const { token } = useAuth();
  const [imagePreview, setImagePreview] = useState<{ url: string; name: string; blob?: Blob } | null>(null);
  
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

  const handleDownloadAttachment = async (attachment: Attachment, blob?: Blob) => {
    if (!token && !blob) {
      console.error("Token d'authentification manquant");
      return;
    }

    try {
      let fileBlob = blob;
      
      // Si pas de blob fourni, télécharger le fichier
      if (!fileBlob) {
        const fileUrl = attachment.url;
        const response = await fetch(fileUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          console.error("Erreur lors du téléchargement du fichier");
          return;
        }
        
        fileBlob = await response.blob();
      }
      
      // Télécharger le fichier
      const url = URL.createObjectURL(fileBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.name;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erreur lors du téléchargement de la pièce jointe:", error);
    }
  };

  const handleOpenAttachment = async (attachment: Attachment, event?: React.MouseEvent) => {
    if (!token) {
      console.error("Token d'authentification manquant");
      return;
    }

    // Si Ctrl+Click ou Cmd+Click, télécharger directement
    if (event && (event.ctrlKey || event.metaKey)) {
      handleDownloadAttachment(attachment);
      return;
    }

    try {
      // L'URL est déjà complète dans attachment.url
      const fileUrl = attachment.url;
      
      // Si c'est une image, ouvrir la prévisualisation
      if (attachment.type === "image") {
        const response = await fetch(fileUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const imageUrl = URL.createObjectURL(blob);
          setImagePreview({ url: imageUrl, name: attachment.name, blob });
          return;
        }
      }
      
      // Pour les autres types de fichiers, télécharger
      handleDownloadAttachment(attachment);
    } catch (error) {
      console.error("Erreur lors de l'ouverture de la pièce jointe:", error);
    }
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
                    className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all hover:shadow-md ${
                      message.isFromClient
                        ? "bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB]"
                        : "bg-white/20 hover:bg-white/30 border border-white/30"
                    }`}
                  >
                    <button
                      onClick={(e) => handleOpenAttachment(attachment, e)}
                      className="flex-1 flex items-center gap-2 min-w-0"
                    >
                      <span className="text-lg flex-shrink-0">
                        {attachment.type === "image" && "🖼️"}
                        {attachment.type === "pdf" && "📄"}
                        {attachment.type === "document" && "📎"}
                        {attachment.type === "other" && "📎"}
                      </span>
                      <div className="flex-1 min-w-0 text-left">
                        <p className={`text-xs font-medium truncate ${
                          message.isFromClient ? "text-[#0F172A]" : "text-white"
                        }`}>
                          {attachment.name}
                        </p>
                        <p className={`text-xs ${
                          message.isFromClient ? "text-[#64748B]" : "text-white/70"
                        }`}>
                          {(attachment.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadAttachment(attachment);
                      }}
                      className={`text-xs flex-shrink-0 px-2 py-1 rounded hover:bg-black/10 ${
                        message.isFromClient ? "text-[#F97316]" : "text-white/90"
                      }`}
                      title="Télécharger (Ctrl+Click ou Cmd+Click pour télécharger directement)"
                    >
                      Télécharger
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Modal de prévisualisation d'image */}
            {imagePreview && (
              <div
                className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
                onClick={() => setImagePreview(null)}
              >
                <div className="max-w-4xl max-h-[90vh] p-4">
                  <div className="relative">
                    <div className="absolute -top-10 right-0 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (imagePreview.blob) {
                            handleDownloadAttachment(
                              { name: imagePreview.name } as Attachment,
                              imagePreview.blob
                            );
                          }
                        }}
                        className="text-white hover:text-gray-300 px-3 py-1 rounded bg-black/50 hover:bg-black/70 text-sm"
                        title="Télécharger l'image"
                      >
                        Télécharger
                      </button>
                      <button
                        onClick={() => setImagePreview(null)}
                        className="text-white hover:text-gray-300 text-2xl font-bold"
                      >
                        ✕
                      </button>
                    </div>
                    <img
                      src={imagePreview.url}
                      alt={imagePreview.name}
                      className="max-w-full max-h-[90vh] object-contain rounded-lg"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <p className="text-white text-center mt-2">{imagePreview.name}</p>
                  </div>
                </div>
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

