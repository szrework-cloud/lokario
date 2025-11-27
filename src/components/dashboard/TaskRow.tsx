import { Tag } from "@/components/ui/Tag";

interface TaskRowProps {
  task: string;
  type: "Interne" | "Client" | "Fournisseur";
  time: string;
}

const typeVariantMap = {
  Interne: "info" as const,
  Client: "success" as const,
  Fournisseur: "warning" as const,
};

export function TaskRow({ task, type, time }: TaskRowProps) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-b-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-[#0F172A]">{task}</p>
        <div className="mt-1 flex items-center gap-2">
          <Tag variant={typeVariantMap[type]}>{type}</Tag>
          <span className="text-xs text-[#64748B]">{time}</span>
        </div>
      </div>
    </div>
  );
}

