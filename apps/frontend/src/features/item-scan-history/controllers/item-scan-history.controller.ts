import { getItemScanHistoryApi } from "../api/get-item-scan-history.api";
import { normalizeItemScanHistoryPayload } from "../domain/item-scan-history.domain";
import { useItemScanHistoryStore } from "../stores/item-scan-history.store";

let requestSequence = 0;

export async function loadItemScanHistoryController(
  query: string,
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
    });

    if (useItemScanHistoryStore.getState().activeRequestId !== requestId) {
      return;
    }

    const normalizedPayload = normalizeItemScanHistoryPayload(response.history);

    useItemScanHistoryStore.getState().hydrate(normalizedPayload);
  } catch {
    if (useItemScanHistoryStore.getState().activeRequestId !== requestId) {
      return;
    }

    useItemScanHistoryStore
      .getState()
      .setErrorMessage("Unable to load item scan history.");
  } finally {
    if (useItemScanHistoryStore.getState().activeRequestId === requestId) {
      const currentStore = useItemScanHistoryStore.getState();
      currentStore.setLoading(false);
      currentStore.setHasLoaded(true);
    }
  }
}
