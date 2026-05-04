import { useHomeShellStore } from "../home/stores/home-shell.store";
import { itemScanHistoryActions } from "./actions/item-scan-history.actions";
import {
  selectItemScanHistoryFilters,
  selectItemScanHistoryTotal,
  useItemScanHistoryStore,
} from "./stores/item-scan-history.store";
import { ItemScanHistoryFiltersPanel } from "./ui/ItemScanHistoryFiltersPanel";

interface ItemScanHistoryOverlayHostProps {
  onClose: () => void;
}

export function ItemScanHistoryOverlayHost({
  onClose,
}: ItemScanHistoryOverlayHostProps) {
  const overlayPageId = useHomeShellStore((state) => state.overlayPageId);
  const filters = useItemScanHistoryStore(selectItemScanHistoryFilters);
  const total = useItemScanHistoryStore(selectItemScanHistoryTotal);

  if (overlayPageId !== "item-scan-history-filters") {
    return null;
  }

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
