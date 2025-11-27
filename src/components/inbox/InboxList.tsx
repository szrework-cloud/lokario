import { InboxConversation } from "./InboxConversation";
import { InboxItem } from "./types";

interface InboxListProps {
  conversations: InboxItem[];
  selectedId?: number;
  onSelect: (id: number) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function InboxList({
  conversations,
  selectedId,
  onSelect,
  hasMore,
  onLoadMore,
}: InboxListProps) {
  return (
    <div className="space-y-2 h-full overflow-y-auto">
      {conversations.length === 0 ? (
        <div className="p-4 text-center text-sm text-[#64748B]">
          Aucune conversation
        </div>
      ) : (
        <>
          {conversations.map((conversation) => (
            <InboxConversation
              key={conversation.id}
              conversation={conversation}
              isSelected={selectedId === conversation.id}
              onClick={() => onSelect(conversation.id)}
            />
          ))}
          {hasMore && onLoadMore && (
            <button
              onClick={onLoadMore}
              className="w-full py-2 text-sm text-[#F97316] hover:text-[#EA580C]"
            >
              Charger plus...
            </button>
          )}
        </>
      )}
    </div>
  );
}

