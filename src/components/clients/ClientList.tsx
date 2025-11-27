import { Tag } from "@/components/ui/Tag";

export interface Client {
  id: number;
  name: string;
  type: "Client" | "Fournisseur";
  sector?: string;
  contactEmail?: string;
  contactPhone?: string;
  tags?: ("VIP" | "régulier" | "nouveau")[];
  lastContact?: string; // Date ISO
  tasksCount?: number;
  remindersCount?: number;
  invoicesCount?: number;
  // Stats rapides (3 chiffres max)
  totalInvoiced?: number; // Montant total facturé
  totalPaid?: number; // Montant total payé
  openProjects?: number; // Projets ouverts
}

interface ClientListProps {
  clients: Client[];
  onClientClick?: (client: Client) => void;
}

export function ClientList({ clients, onClientClick }: ClientListProps) {
  const tagColors: Record<string, "success" | "warning" | "error" | "info" | "default"> = {
    VIP: "error",
    régulier: "success",
    nouveau: "info",
  };

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                Nom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                Tags
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {clients.map((client) => (
              <tr
                key={client.id}
                onClick={() => onClientClick?.(client)}
                className="hover:bg-[#F9FAFB] cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-[#0F172A]">
                    {client.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Tag variant={client.type === "Client" ? "success" : "info"}>
                    {client.type}
                  </Tag>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {client.tags && client.tags.length > 0 ? (
                      client.tags.map((tag) => (
                        <Tag key={tag} variant={tagColors[tag] || "default"}>
                          {tag}
                        </Tag>
                      ))
                    ) : (
                      <span className="text-xs text-[#64748B]">—</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

