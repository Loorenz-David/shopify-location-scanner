import {
  markHistoryItemCompletedApi,
  markHistoryItemUncompletedApi,
} from "../api/mark-history-item-completion.api";
import {
  loadItemScanHistoryController,
  loadMoreItemScanHistoryController,
  refreshItemScanHistoryItemController,
} from "../controllers/item-scan-history.controller";
import {
  commitOptimisticLocationUpdateController,
  rollbackOptimisticCompletionUpdateController,
  rollbackOptimisticLocationUpdateController,
  startOptimisticCompletionUpdateController,
  startOptimisticLocationUpdateController,
  type ItemScanHistoryOptimisticUpdateToken,
} from "../controllers/item-scan-history-optimistic.controller";
import { useItemScanHistoryStore } from "../stores/item-scan-history.store";
import type { ItemScanHistoryFilters } from "../types/item-scan-history-filters.types";
import type { ItemScanHistoryItem } from "../types/item-scan-history.types";
import type {
  LinkItemPositionsResponse,
  ScannerItem,
} from "../../unified-scanner/types/unified-scanner.types";
import { resolveLocationScannerMode } from "../../unified-scanner/domain/item-mode.domain";
import { useUnifiedScannerStore } from "../../unified-scanner/stores/unified-scanner.store";
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
  openItemOptions(itemId: string): void {
    homeShellActions.openOverlayPage(
      `item-scan-history-options:${itemId}`,
      "Item Options",
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
  openPlacementScanner(item: ItemScanHistoryItem): void {
    const itemId =
      item.itemType === "sku"
        ? item.skuLabel
        : item.itemType === "barcode"
          ? (item.barcodeLabel ?? item.productId)
          : item.productId;
    const prefilledItem = {
      id: item.id,
      idType: item.itemType,
      itemId,
      sku: item.skuLabel,
      imageUrl: item.imageUrl ?? undefined,
      imageUrls: item.imageUrls ?? item.imageUrl ?? undefined,
      title: item.title,
      quantity: item.quantity,
      isSold: item.isSold,
      intention: null,
      fixItem: false,
      isItemFixed: false,
    };
    const store = useUnifiedScannerStore.getState();
    store.setPrefilledItem(prefilledItem);
    store.setSelectedItem(prefilledItem);
    store.setLocationMode(resolveLocationScannerMode(prefilledItem));
    store.setPhase("scanning-location");
    homeShellActions.openFullFeaturePage("unified-scanner");
  },
  async markCompletion(item: ItemScanHistoryItem, completed: boolean): Promise<void> {
    const token = startOptimisticCompletionUpdateController(item.id, completed);

    try {
      if (completed) {
        await markHistoryItemCompletedApi({ scanHistoryId: item.id });
      } else {
        await markHistoryItemUncompletedApi({ scanHistoryId: item.id });
      }
    } catch {
      rollbackOptimisticCompletionUpdateController(token);
    }
  },
  reset(): void {
    useItemScanHistoryStore.getState().reset();
  },
};
