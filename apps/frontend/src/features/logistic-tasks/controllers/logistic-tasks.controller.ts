import { normalizeLogisticTasksPage } from "../domain/logistic-tasks.domain";
import { getLogisticIntentionCountsApi } from "../api/get-logistic-intention-counts.api";
import { getLogisticTasksApi } from "../api/get-logistic-tasks.api";
import { useLogisticTasksStore } from "../stores/logistic-tasks.store";
import { useTaskCountStore } from "../stores/task-count.store";
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
    hasMore: false,
    nextCursor: null,
    intentionCounts: {},
  });

  const { query } = useLogisticTasksStore.getState();
  void refreshLogisticIntentionCountsController(filters, query);

  try {
    const response = await getLogisticTasksApi(filters, undefined, undefined, query);
    const currentRequestId = useLogisticTasksStore.getState().activeRequestId;

    if (requestId !== currentRequestId) {
      return;
    }

    const { items, hasMore, nextCursor } = normalizeLogisticTasksPage(response);
    useLogisticTasksStore.getState().hydrateAndFinish(items, hasMore, nextCursor);
  } catch {
    const currentRequestId = useLogisticTasksStore.getState().activeRequestId;
    if (requestId !== currentRequestId) return;
    useLogisticTasksStore
      .getState()
      .finishWithError("Unable to load logistic tasks.");
  }
}

export async function refreshLogisticIntentionCountsController(
  filters: LogisticTaskFilters,
  query: string,
): Promise<void> {
  const requestId = useLogisticTasksStore.getState().incrementCountsRequestId();
  try {
    const { counts } = await getLogisticIntentionCountsApi(filters, query);
    if (requestId === useLogisticTasksStore.getState().activeCountsRequestId) {
      useLogisticTasksStore.getState().setIntentionCounts(counts);
    }
  } catch {
    // Leave existing totals in place; the next reload or task event retries.
  }
}

export async function loadMoreLogisticTasksController(): Promise<void> {
  const store = useLogisticTasksStore.getState();
  const { filters, query, nextCursor, isLoadingMore, hasMore } = store;

  if (!hasMore || isLoadingMore || !nextCursor) return;

  useLogisticTasksStore.setState({ isLoadingMore: true });

  try {
    const response = await getLogisticTasksApi(filters, undefined, nextCursor, query);
    const { items, hasMore: nextHasMore, nextCursor: newCursor } =
      normalizeLogisticTasksPage(response);
    useLogisticTasksStore.getState().appendAndFinish(items, nextHasMore, newCursor);
  } catch {
    useLogisticTasksStore.setState({ isLoadingMore: false });
  }
}

export async function refreshLogisticTasksByIdsController(
  ids: string[],
  currentFilters: LogisticTaskFilters,
): Promise<void> {
  const { query } = useLogisticTasksStore.getState();
  void refreshLogisticIntentionCountsController(currentFilters, query);
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
        useTaskCountStore.getState().removeId(id);
      }
    }
  } catch {
    // Realtime refresh failures are silent — the next WS event will retry
  }
}
