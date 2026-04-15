import { normalizeLogisticTasksPage } from "../domain/logistic-tasks.domain";
import { getLogisticTasksApi } from "../api/get-logistic-tasks.api";
import { useLogisticTasksStore } from "../stores/logistic-tasks.store";
import type { LogisticTaskFilters } from "../types/logistic-tasks.types";

export async function loadLogisticTasksController(
  filters: LogisticTaskFilters,
): Promise<void> {
  const store = useLogisticTasksStore.getState();
  const requestId = store.incrementRequestId();

  store.setFilters({});
  useLogisticTasksStore.setState({
    isLoading: true,
    errorMessage: null,
    filters,
  });

  try {
    const response = await getLogisticTasksApi(filters);
    const currentRequestId = useLogisticTasksStore.getState().activeRequestId;

    if (requestId !== currentRequestId) {
      return;
    }

    const { items } = normalizeLogisticTasksPage(response);
    useLogisticTasksStore.getState().hydrateAndFinish(items);
  } catch {
    const currentRequestId = useLogisticTasksStore.getState().activeRequestId;
    if (requestId !== currentRequestId) return;
    useLogisticTasksStore
      .getState()
      .finishWithError("Unable to load logistic tasks.");
  }
}

export async function refreshLogisticTasksByIdsController(
  ids: string[],
  currentFilters: LogisticTaskFilters,
): Promise<void> {
  try {
    const response = await getLogisticTasksApi(currentFilters, ids);
    const { items: returnedItems } = normalizeLogisticTasksPage(response);

    const returnedIds = new Set(returnedItems.map((i) => i.id));
    const store = useLogisticTasksStore.getState();

    for (const item of returnedItems) {
      store.upsertItem(item);
    }

    for (const id of ids) {
      if (!returnedIds.has(id)) {
        store.removeItem(id);
      }
    }
  } catch {
    // Realtime refresh failures are silent — the next WS event will retry
  }
}
