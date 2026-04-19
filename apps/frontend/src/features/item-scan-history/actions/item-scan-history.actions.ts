import {
  loadItemScanHistoryController,
  loadMoreItemScanHistoryController,
  refreshItemScanHistoryItemController,
} from "../controllers/item-scan-history.controller";
import {
  commitOptimisticLocationUpdateController,
  rollbackOptimisticLocationUpdateController,
  startOptimisticLocationUpdateController,
  type ItemScanHistoryOptimisticUpdateToken,
} from "../controllers/item-scan-history-optimistic.controller";
import { useItemScanHistoryStore } from "../stores/item-scan-history.store";
import type { ItemScanHistoryFilters } from "../types/item-scan-history-filters.types";
import type {
  LinkItemPositionsResponse,
  ScannerItem,
} from "../../scanner/types/scanner.types";
import { homeShellActions } from "../../home/actions/home-shell.actions";

export const itemScanHistoryActions = {
  async loadHistory(): Promise<void> {
    const state = useItemScanHistoryStore.getState();
    await loadItemScanHistoryController(state.query, state.filters);
  },
  async loadMoreHistory(): Promise<void> {
    await loadMoreItemScanHistoryController();
  },
  async refreshHistoryItem(productId: string): Promise<void> {
    await refreshItemScanHistoryItemController(productId);
  },
  setQuery(query: string): void {
    useItemScanHistoryStore.getState().setQuery(query);
  },
  setFilters(filters: Partial<ItemScanHistoryFilters>): void {
    useItemScanHistoryStore.getState().setFilters(filters);
  },
  resetFilters(): void {
    useItemScanHistoryStore.getState().resetFilters();
  },
  openFilters(): void {
    homeShellActions.openOverlayPage(
      "item-scan-history-filters",
      "History Filters",
    );
  },
  closeFilters(): void {
    homeShellActions.closeOverlayPage();
  },
  toggleExpandedItem(itemId: string): void {
    useItemScanHistoryStore.getState().toggleExpandedItem(itemId);
  },
  async retryLoad(): Promise<void> {
    await itemScanHistoryActions.loadHistory();
  },
  beginOptimisticLocationUpdate(
    item: ScannerItem,
    locationCode: string,
  ): ItemScanHistoryOptimisticUpdateToken {
    return startOptimisticLocationUpdateController({
      item,
      locationCode,
    });
  },
  commitOptimisticLocationUpdate(
    token: ItemScanHistoryOptimisticUpdateToken,
    response: LinkItemPositionsResponse,
  ): void {
    commitOptimisticLocationUpdateController(token, response);
  },
  rollbackOptimisticLocationUpdate(
    token: ItemScanHistoryOptimisticUpdateToken,
  ): void {
    rollbackOptimisticLocationUpdateController(token);
  },
  reset(): void {
    useItemScanHistoryStore.getState().reset();
  },
};
