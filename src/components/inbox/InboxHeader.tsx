"use client";

interface InboxHeaderProps {
  stats: {
    pending: number;
    urgent: number;
    waiting: number;
    total: number;
  };
  onNewMessage: () => void;
}

export function InboxHeader({ stats, onNewMessage }: InboxHeaderProps) {
  return (
    <div className="bg-white border-b border-[#E5E7EB] p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">Boîte de réception</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-[#64748B]">
            <span>
              <span className="font-semibold text-[#0F172A]">{stats.pending}</span> en attente
            </span>
            {stats.urgent > 0 && (
              <span className="text-red-600">
                <span className="font-semibold">{stats.urgent}</span> urgent{stats.urgent > 1 ? "s" : ""}
              </span>
            )}
            <span>
              <span className="font-semibold text-[#0F172A]">{stats.waiting}</span> client{stats.waiting > 1 ? "s" : ""} en attente
            </span>
            <span className="text-[#64748B]">
              {stats.total} message{stats.total > 1 ? "s" : ""} au total
            </span>
          </div>
        </div>
        <button
          onClick={onNewMessage}
          className="rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
        >
          + Nouveau message
        </button>
      </div>
    </div>
  );
}

