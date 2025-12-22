import { Card } from "@/components/ui/Card";
import { InboxItem, MessageSource } from "./types";

interface InboxConversationProps {
  conversation: InboxItem;
  isSelected: boolean;
  onClick: () => void;
  isSelectionMode?: boolean;
  isChecked?: boolean;
  onToggleCheck?: () => void;
}

export function InboxConversation({
  conversation,
  isSelected,
  onClick,
  isSelectionMode = false,
  isChecked = false,
  onToggleCheck,
}: InboxConversationProps) {
  const statusVariant: Record<string, "error" | "success" | "warning" | "default"> = {
    "À répondre": "error",
    "En attente": "warning",
    "Répondu": "success",
    "Résolu": "success",
    "Urgent": "error",
    "Archivé": "default",
    "Spam": "default",
  };

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

  const statusColor = {
    "À répondre": "bg-red-100 text-red-800",
    "En attente": "bg-yellow-100 text-yellow-800",
    "Répondu": "bg-green-100 text-green-800",
    "Résolu": "bg-blue-100 text-blue-800",
    "Urgent": "bg-orange-100 text-orange-800",
    "Archivé": "bg-gray-100 text-gray-800",
    "Spam": "bg-gray-100 text-gray-800",
  };

  return (
    <div
      className={`cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-[#F97316] rounded-xl" : ""
      }`}
      onClick={onClick}
    >
      <Card className={isSelected ? "" : "hover:shadow-md"}>
        <div className="p-4">
          <div className="flex items-start gap-3 mb-2">
            {/* Checkbox en mode sélection */}
            {isSelectionMode && (
              <div className="flex-shrink-0 pt-1">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleCheck?.();
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 text-[#F97316] border-gray-300 rounded focus:ring-[#F97316] cursor-pointer"
                />
              </div>
            )}
            {/* Avatar */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#F97316] to-[#EA580C] flex items-center justify-center text-white text-xs font-semibold">
              {getInitials(conversation.client)}
            </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-[#0F172A] truncate">
                        {conversation.client}
                      </h4>
                      {(conversation.clientEmail || conversation.clientPhone) && (
                        <p className="text-xs text-[#64748B] truncate mt-0.5">
                          {conversation.clientEmail || conversation.clientPhone}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs">{sourceIcons[conversation.source]}</span>
                        <p className="text-xs text-[#64748B] truncate">
                          {conversation.subject}
                        </p>
                      </div>
                    </div>
                {/* Point de couleur statut */}
                <div
                  className={`flex-shrink-0 w-2 h-2 rounded-full ${
                    conversation.status === "À répondre" || conversation.status === "Urgent"
                      ? "bg-red-500"
                      : conversation.status === "En attente"
                      ? "bg-yellow-500"
                      : conversation.status === "Répondu" || conversation.status === "Résolu"
                      ? "bg-green-500"
                      : "bg-gray-400"
                  }`}
                />
              </div>
              <p className="text-xs text-[#64748B] line-clamp-2 mt-1">
                {conversation.lastMessage}
              </p>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-[#64748B]">
                  {new Date(conversation.date).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {conversation.unreadCount && conversation.unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F97316] text-white">
                    {conversation.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* Tag statut */}
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                statusColor[conversation.status] || "bg-gray-100 text-gray-800"
              }`}
            >
              {conversation.status}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

