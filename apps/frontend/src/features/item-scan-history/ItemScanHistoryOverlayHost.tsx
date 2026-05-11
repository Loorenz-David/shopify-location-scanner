import { useHomeShellStore } from "../home/stores/home-shell.store";
import { itemScanHistoryActions } from "./actions/item-scan-history.actions";
import {
  selectItemScanHistoryFilters,
  selectItemScanHistoryItems,
  selectItemScanHistoryTotal,
  useItemScanHistoryStore,
} from "./stores/item-scan-history.store";
import { ItemScanHistoryFiltersPanel } from "./ui/ItemScanHistoryFiltersPanel";
import { ItemScanHistoryOptionsPage } from "./ui/ItemScanHistoryOptionsPage";

interface ItemScanHistoryOverlayHostProps {
  onClose: () => void;
}

export function ItemScanHistoryOverlayHost({
  onClose,
}: ItemScanHistoryOverlayHostProps) {
  const overlayPageId = useHomeShellStore((state) => state.overlayPageId);
  const filters = useItemScanHistoryStore(selectItemScanHistoryFilters);
  const items = useItemScanHistoryStore(selectItemScanHistoryItems);
  const total = useItemScanHistoryStore(selectItemScanHistoryTotal);

  if (overlayPageId === "item-scan-history-filters") {
    return (
      <ItemScanHistoryFiltersPanel
        filters={filters}
        total={total}
        onChangeFilters={itemScanHistoryActions.setFilters}
        onResetFilters={itemScanHistoryActions.resetFilters}
        onClose={onClose}
      />
    );
  }

  if (overlayPageId?.startsWith("item-scan-history-options:")) {
    const itemId = overlayPageId.slice("item-scan-history-options:".length);
    const item = items.find((candidate) => candidate.id === itemId) ?? null;

    return <ItemScanHistoryOptionsPage item={item} onClose={onClose} />;
  }

  return null;
}
