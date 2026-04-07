import { itemScanHistoryActions } from "../actions/item-scan-history.actions";
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
    </div>
  );
}
