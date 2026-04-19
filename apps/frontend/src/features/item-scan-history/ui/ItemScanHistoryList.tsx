import { itemScanHistoryActions } from "../actions/item-scan-history.actions";
import {
  selectItemScanHistoryHasMore,
  selectItemScanHistoryIsLoadingMore,
  useItemScanHistoryStore,
} from "../stores/item-scan-history.store";
import type { ItemScanHistoryItem } from "../types/item-scan-history.types";
import { ItemScanHistoryCard } from "./ItemScanHistoryCard";

interface ItemScanHistoryListProps {
  items: ItemScanHistoryItem[];
  expandedItemIds: string[];
}

export function ItemScanHistoryList({
  items,
  expandedItemIds,
}: ItemScanHistoryListProps) {
  const hasMore = useItemScanHistoryStore(selectItemScanHistoryHasMore);
  const isLoadingMore = useItemScanHistoryStore(
    selectItemScanHistoryIsLoadingMore,
  );

  return (
    <div className="flex flex-col gap-4">
      {items.map((item) => (
        <ItemScanHistoryCard
          key={item.id}
          item={item}
          isExpanded={expandedItemIds.includes(item.id)}
          onToggle={() => itemScanHistoryActions.toggleExpandedItem(item.id)}
        />
      ))}

      {hasMore && (
        <div className="flex justify-center pt-2 pb-2">
          <button
            type="button"
            onClick={() => void itemScanHistoryActions.loadMoreHistory()}
            disabled={isLoadingMore}
            className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm active:bg-slate-50 disabled:opacity-50"
          >
            {isLoadingMore ? "Loading…" : "Show more"}
          </button>
        </div>
      )}
    </div>
  );
}
