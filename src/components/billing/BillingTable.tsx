import { Tag } from "@/components/ui/Tag";
import Link from "next/link";

export interface BillingItem {
  id: number;
  number: string;
  client: string;
  amount: number;
  status: "envoyé" | "vu" | "accepté" | "refusé" | "envoyée" | "payée" | "impayée" | "en retard";
  date?: string;
  dueDate?: string;
  viewedAt?: string;
  acceptedAt?: string;
  refusedAt?: string;
  paidAt?: string;
}

interface BillingTableProps {
  items: BillingItem[];
  type: "quotes" | "invoices";
  onMarkAsPaid?: (item: BillingItem) => void;
  onGenerateAiMessage?: (item: BillingItem) => void;
}

export function BillingTable({
  items,
  type,
  onMarkAsPaid,
  onGenerateAiMessage,
}: BillingTableProps) {
  const statusVariant = {
    envoyé: "default" as const,
    vu: "info" as const,
    accepté: "success" as const,
    refusé: "error" as const,
    envoyée: "default" as const,
    payée: "success" as const,
    impayée: "warning" as const,
    "en retard": "error" as const,
  };

  const getStatusLabel = (status: BillingItem["status"]) => {
    const labels: Record<string, string> = {
      envoyé: "Envoyé",
      vu: "Vu",
      accepté: "Accepté",
      refusé: "Refusé",
      envoyée: "Envoyée",
      payée: "Payée",
      impayée: "Impayée",
      "en retard": "En retard",
    };
    return labels[status] || status;
  };

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Numéro
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Client
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Montant
            </th>
            {type === "invoices" && (
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Date d'échéance
              </th>
            )}
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Statut
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                {item.number}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                <Link
                  href={`/app/clients?client=${encodeURIComponent(item.client)}`}
                  className="hover:text-slate-600"
                >
                  {item.client}
                </Link>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                {item.amount.toLocaleString("fr-FR")} €
              </td>
              {type === "invoices" && (
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                  {item.dueDate
                    ? new Date(item.dueDate).toLocaleDateString("fr-FR")
                    : "-"}
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-col gap-1">
                  <Tag variant={statusVariant[item.status]}>
                    {getStatusLabel(item.status)}
                  </Tag>
                  {item.viewedAt && (
                    <span className="text-xs text-slate-500">
                      Vu le {new Date(item.viewedAt).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                  {item.acceptedAt && (
                    <span className="text-xs text-green-600">
                      Accepté le {new Date(item.acceptedAt).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                  {item.refusedAt && (
                    <span className="text-xs text-red-600">
                      Refusé le {new Date(item.refusedAt).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                  {item.paidAt && (
                    <span className="text-xs text-green-600">
                      Payé le {new Date(item.paidAt).toLocaleDateString("fr-FR")}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  {type === "invoices" && (
                    <>
                      <button className="text-sm font-medium text-slate-600 hover:text-slate-900">
                        Voir
                      </button>
                      <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
                        PDF
                      </button>
                      {(item.status === "payée" || item.status === "impayée" || item.status === "en retard") && (
                        <Link
                          href={`/app/payments?invoice=${item.number}`}
                          className="text-sm font-medium text-slate-600 hover:text-slate-900"
                        >
                          Paiement
                        </Link>
                      )}
                      {item.status !== "payée" && (
                        <>
                          <button
                            className="text-sm font-medium text-green-600 hover:text-green-700"
                            onClick={() => onMarkAsPaid?.(item)}
                          >
                            Marquer payé
                          </button>
                          <button
                            className="text-sm font-medium text-purple-600 hover:text-purple-700"
                            onClick={() => onGenerateAiMessage?.(item)}
                          >
                            ✨ Relancer IA
                          </button>
                        </>
                      )}
                    </>
                  )}
                  {type === "quotes" && (
                    <>
                      <button className="text-sm font-medium text-slate-600 hover:text-slate-900">
                        Voir
                      </button>
                      <button className="text-sm font-medium text-blue-600 hover:text-blue-700">
                        PDF
                      </button>
                      {item.status === "envoyé" && (
                        <button
                          className="text-sm font-medium text-purple-600 hover:text-purple-700"
                          onClick={() => onGenerateAiMessage?.(item)}
                        >
                          ✨ Relancer IA
                        </button>
                      )}
                      {item.status === "vu" && (
                        <>
                          <button className="text-sm font-medium text-green-600 hover:text-green-700">
                            Accepter
                          </button>
                          <button className="text-sm font-medium text-red-600 hover:text-red-700">
                            Refuser
                          </button>
                        </>
                      )}
                    </>
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

