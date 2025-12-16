"use client";

import { Card, CardContent } from "@/components/ui/Card";
import { Tag } from "@/components/ui/Tag";
import { AnimatedCard } from "@/components/ui/AnimatedCard";
import { AnimatedBadge } from "@/components/ui/AnimatedBadge";
import { Client } from "./ClientList";

interface ClientCardProps {
  client: Client;
  onClick?: () => void;
  delay?: number;
}

export function ClientCard({ client, onClick, delay = 0 }: ClientCardProps) {
  const tagColors: Record<string, "success" | "warning" | "error" | "info" | "default"> = {
    VIP: "error",
    régulier: "success",
    nouveau: "info",
  };

  // Calculer les 3 stats principales (max 3)
  const stats = [
    client.totalInvoiced !== undefined && { label: "Facturé", value: `${client.totalInvoiced.toLocaleString("fr-FR")} €` },
    client.tasksCount !== undefined && client.tasksCount > 0 && { label: "Tâches", value: client.tasksCount },
    client.remindersCount !== undefined && client.remindersCount > 0 && { label: "Relances", value: client.remindersCount },
    client.invoicesCount !== undefined && client.invoicesCount > 0 && { label: "Factures", value: client.invoicesCount },
  ].filter(Boolean).slice(0, 3) as Array<{ label: string; value: string | number }>;

  return (
    <AnimatedCard delay={delay} hover={true} onClick={onClick} className="cursor-pointer">
      <Card className="h-full">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-[#0F172A]">
                {client.name}
              </h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {client.sector && (
                  <span className="text-sm text-[#64748B]">{client.sector}</span>
                )}
                {client.tags && client.tags.length > 0 && (
                  <>
                    {client.tags.map((tag) => (
                      <AnimatedBadge 
                        key={tag} 
                        variant={tagColors[tag] === "error" ? "danger" : tagColors[tag] === "success" ? "success" : tagColors[tag] === "info" ? "info" : "default"}
                        pulse={tag === "nouveau"}
                      >
                        {tag}
                      </AnimatedBadge>
                    ))}
                  </>
                )}
              </div>
            </div>
            <Tag variant={client.type === "Client" ? "success" : "info"}>
              {client.type}
            </Tag>
          </div>

          <div className="space-y-2 text-sm text-[#64748B] mb-4">
            {client.contactEmail && (
              <p className="truncate">
                <span className="font-medium text-[#0F172A]">Email:</span> {client.contactEmail}
              </p>
            )}
            {client.contactPhone && (
              <p>
                <span className="font-medium text-[#0F172A]">Tél:</span> {client.contactPhone}
              </p>
            )}
          </div>

          {/* Stats rapides (3 max) */}
          {stats.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#E5E7EB] grid grid-cols-3 gap-2">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-sm font-semibold text-[#0F172A]">{stat.value}</div>
                  <div className="text-xs text-[#64748B]">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AnimatedCard>
  );
}

