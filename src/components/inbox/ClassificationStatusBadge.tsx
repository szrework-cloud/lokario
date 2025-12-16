"use client";

import { InboxItem } from "./types";

interface ClassificationStatusBadgeProps {
  item: InboxItem;
}

export function ClassificationStatusBadge({ item }: ClassificationStatusBadgeProps) {
  const badges = [];

  if (item.autoReplyMode === "auto" && item.autoReplySent) {
    badges.push({ text: "📧 Réponse auto envoyée", color: "bg-green-100 text-green-800" });
  }

  if (item.autoReplyMode === "approval" && item.autoReplyPending) {
    badges.push({ text: "⏳ Réponse en attente", color: "bg-yellow-100 text-yellow-800" });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex gap-1 flex-wrap">
      {badges.map((badge, index) => (
        <span
          key={index}
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}
        >
          {badge.text}
        </span>
      ))}
    </div>
  );
}

