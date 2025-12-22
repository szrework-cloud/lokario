import { InboxConversation } from "./InboxConversation";
import { InboxItem } from "./types";
import { ClassificationStatusBadge } from "./ClassificationStatusBadge";

interface InboxListProps {
  conversations: InboxItem[];
  selectedId?: number;
  onSelect: (id: number) => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  isSelectionMode?: boolean;
  selectedIds?: Set<number>;
  onToggleSelection?: (id: number) => void;
}

export function InboxList({
  conversations,
  selectedId,
  onSelect,
  hasMore,
  onLoadMore,
  isSelectionMode = false,
  selectedIds = new Set(),
  onToggleSelection,
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
            <div key={conversation.id}>
              <InboxConversation
                conversation={conversation}
                isSelected={selectedId === conversation.id}
                onClick={() => {
                  if (isSelectionMode && onToggleSelection) {
                    onToggleSelection(conversation.id);
                  } else {
                    onSelect(conversation.id);
                  }
                }}
                isSelectionMode={isSelectionMode}
                isChecked={selectedIds.has(conversation.id)}
                onToggleCheck={() => onToggleSelection?.(conversation.id)}
              />
              <div className="px-2 pb-1">
                <ClassificationStatusBadge item={conversation} />
              </div>
            </div>
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

