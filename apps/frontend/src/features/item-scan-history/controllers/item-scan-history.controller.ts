import { getItemScanHistoryApi } from "../api/get-item-scan-history.api";
import { normalizeItemScanHistoryPayload } from "../domain/item-scan-history.domain";
import { useItemScanHistoryStore } from "../stores/item-scan-history.store";
import type { ItemScanHistoryFilters } from "../types/item-scan-history-filters.types";

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
