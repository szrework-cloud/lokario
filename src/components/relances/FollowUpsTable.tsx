import { FollowUpRow } from "./FollowUpRow";
import { FollowUpItem } from "./types";

interface FollowUpsTableProps {
  items: FollowUpItem[];
  onMarkAsDone: (id: number) => void;
  onGenerateMessage: (item: FollowUpItem) => void;
  onViewDetails?: (item: FollowUpItem) => void;
}

export function FollowUpsTable({
  items,
  onMarkAsDone,
  onGenerateMessage,
  onViewDetails,
}: FollowUpsTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px]">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Type de relance
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Client
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Source
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Date limite
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Type
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {items.map((item) => (
            <FollowUpRow
              key={item.id}
              item={item}
              onMarkAsDone={onMarkAsDone}
              onGenerateMessage={onGenerateMessage}
              onViewDetails={onViewDetails}
            />
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

