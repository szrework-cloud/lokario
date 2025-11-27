import { Tag } from "@/components/ui/Tag";
import { FollowUpItem } from "./types";
import Link from "next/link";

interface FollowUpRowProps {
  item: FollowUpItem;
  onMarkAsDone: (id: number) => void;
  onGenerateMessage: (item: FollowUpItem) => void;
  onViewDetails?: (item: FollowUpItem) => void;
}

// Fonction pour calculer le badge de statut basé sur la date
function getDateBadge(dueDate: string, actualDate?: string): { label: string; variant: "error" | "warning" | "default" } | null {
  if (!actualDate) {
    // Si pas de date réelle, on essaie de parser dueDate
    if (dueDate === "Aujourd'hui") {
      return { label: "À faire aujourd'hui", variant: "warning" };
    }
    if (dueDate.includes("En retard")) {
      return { label: "En retard", variant: "error" };
    }
    if (dueDate === "Demain") {
      return { label: "À venir", variant: "default" };
    }
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(actualDate);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: "En retard", variant: "error" };
  } else if (diffDays === 0) {
    return { label: "À faire aujourd'hui", variant: "warning" };
  } else {
    return { label: "À venir", variant: "default" };
  }
}

export function FollowUpRow({
  item,
  onMarkAsDone,
  onGenerateMessage,
  onViewDetails,
}: FollowUpRowProps) {
  const statusVariant = {
    "À faire": "error" as const,
    "Fait": "success" as const,
    "En attente": "warning" as const,
  };

  const dateBadge = getDateBadge(item.dueDate, item.actualDate);

  return (
    <tr
      className="hover:bg-slate-50 cursor-pointer"
      onClick={() => onViewDetails?.(item)}
    >
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
        {item.type}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
        <Link
          href={`/app/clients?client=${encodeURIComponent(item.client)}`}
          className="hover:text-slate-600"
        >
          {item.client}
        </Link>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
        {item.source.includes("#") ? (
          <Link
            href={`/app/billing?invoice=${item.source.match(/#(\d+)/)?.[1] || ""}`}
            className="hover:text-slate-600"
          >
            {item.source}
          </Link>
        ) : (
          item.source
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
        <div className="flex items-center gap-2">
          <span>{item.dueDate}</span>
          {dateBadge && (
            <Tag variant={dateBadge.variant}>{dateBadge.label}</Tag>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <Tag variant={statusVariant[item.status]}>{item.status}</Tag>
      </td>
    </tr>
  );
}

