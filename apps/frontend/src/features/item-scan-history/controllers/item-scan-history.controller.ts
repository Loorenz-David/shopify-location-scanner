import { getItemScanHistoryApi } from "../api/get-item-scan-history.api";
import { getItemScanHistoryItemApi } from "../api/get-item-scan-history-item.api";
import {
  normalizeItemScanHistoryItem,
  normalizeItemScanHistoryPayload,
} from "../domain/item-scan-history.domain";
import { applyItemScanHistoryLiveFilters } from "../domain/item-scan-history-filters.domain";
import { useItemScanHistoryStore } from "../stores/item-scan-history.store";
import type { ItemScanHistoryFilters } from "../types/item-scan-history-filters.types";
import type { ItemScanHistoryItem } from "../types/item-scan-history.types";

let requestSequence = 0;

export async function loadItemScanHistoryController(
  query: string,
  filters: ItemScanHistoryFilters,
): Promise<void> {
  const store = useItemScanHistoryStore.getState();
  const requestId = ++requestSequence;

  store.setActiveRequestId(requestId);
  store.setLoading(true);
  store.setErrorMessage(null);

  try {
    const response = await getItemScanHistoryApi({
      page: 1,
      query,
      filters,
    });

    if (useItemScanHistoryStore.getState().activeRequestId !== requestId) {
      return;
    }

    const normalizedPayload = normalizeItemScanHistoryPayload(response.history);
    useItemScanHistoryStore.getState().hydrateAndFinish(normalizedPayload);
  } catch {
    if (useItemScanHistoryStore.getState().activeRequestId !== requestId) {
      return;
    }

    useItemScanHistoryStore
      .getState()
      .finishWithError("Unable to load item scan history.");
  }
}

export async function refreshItemScanHistoryItemController(
  productId: string,
): Promise<void> {
  const normalizedProductId = productId.trim();
  if (!normalizedProductId) {
    return;
  }

  try {
    const responseItem = await getItemScanHistoryItemApi(normalizedProductId);
    const state = useItemScanHistoryStore.getState();

    if (!state.hasLoaded) {
      return;
    }

    const existingIndex = state.items.findIndex(
      (item) => item.productId === normalizedProductId,
    );

    if (!responseItem) {
      if (existingIndex < 0) {
        return;
      }

      const nextItems = state.items.filter(
        (item) => item.productId !== normalizedProductId,
      );

      useItemScanHistoryStore.setState({
        items: nextItems,
        total: Math.max(0, state.total - 1),
        expandedItemIds: state.expandedItemIds.filter(
          (itemId) => itemId !== state.items[existingIndex]?.id,
        ),
      });
      return;
    }

    const normalizedItem = normalizeItemScanHistoryItem(responseItem);
    const matchesCurrentFilters = itemMatchesCurrentHistoryFilters(
      normalizedItem,
      state.query,
      state.filters,
    );

    if (!matchesCurrentFilters) {
      if (existingIndex < 0) {
        return;
      }

      const nextItems = state.items.filter(
        (item) => item.productId !== normalizedProductId,
      );

      useItemScanHistoryStore.setState({
        items: nextItems,
        total: Math.max(0, state.total - 1),
        expandedItemIds: state.expandedItemIds.filter(
          (itemId) => itemId !== state.items[existingIndex]?.id,
        ),
      });
      return;
    }

    const remainingItems = state.items.filter(
      (item) => item.productId !== normalizedProductId,
    );

    useItemScanHistoryStore.setState({
      items: [normalizedItem, ...remainingItems],
      total:
        existingIndex >= 0
          ? state.total
          : Math.max(state.total, remainingItems.length + 1),
      expandedItemIds: state.expandedItemIds.includes(normalizedItem.id)
        ? state.expandedItemIds
        : state.expandedItemIds.filter(
            (itemId) => itemId !== state.items[existingIndex]?.id,
          ),
    });
  } catch {
    // Keep the current list as-is on realtime single-item refresh failures.
  }
}

function itemMatchesCurrentHistoryFilters(
  item: ItemScanHistoryItem,
  query: string,
  filters: ItemScanHistoryFilters,
): boolean {
  return applyItemScanHistoryLiveFilters([item], query, filters).length > 0;
}
