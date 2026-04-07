import { loadItemScanHistoryController } from "../controllers/item-scan-history.controller";
import { useItemScanHistoryStore } from "../stores/item-scan-history.store";

export const itemScanHistoryActions = {
  async loadHistory(): Promise<void> {
    const query = useItemScanHistoryStore.getState().query;
    await loadItemScanHistoryController(query);
  },
  setQuery(query: string): void {
    useItemScanHistoryStore.getState().setQuery(query);
  },
  toggleExpandedItem(itemId: string): void {
    useItemScanHistoryStore.getState().toggleExpandedItem(itemId);
  },
  async retryLoad(): Promise<void> {
    await itemScanHistoryActions.loadHistory();
  },
  reset(): void {
    useItemScanHistoryStore.getState().reset();
  },
};
