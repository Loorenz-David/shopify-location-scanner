import { normalizeLogisticTasksPage } from "../domain/logistic-tasks.domain";
import { getLogisticTasksApi } from "../api/get-logistic-tasks.api";
import { useLogisticTasksStore } from "../stores/logistic-tasks.store";
export async function loadLogisticTasksController(filters) {
    const store = useLogisticTasksStore.getState();
    const requestId = store.incrementRequestId();
    store.setFilters({});
    useLogisticTasksStore.setState({
        isLoading: true,
        errorMessage: null,
        filters,
        hasMore: false,
        nextCursor: null,
    });
    try {
        const { query } = useLogisticTasksStore.getState();
        const response = await getLogisticTasksApi(filters, undefined, undefined, query);
        const currentRequestId = useLogisticTasksStore.getState().activeRequestId;
        if (requestId !== currentRequestId) {
            return;
        }
        const { items, hasMore, nextCursor } = normalizeLogisticTasksPage(response);
        useLogisticTasksStore.getState().hydrateAndFinish(items, hasMore, nextCursor);
    }
    catch {
        const currentRequestId = useLogisticTasksStore.getState().activeRequestId;
        if (requestId !== currentRequestId)
            return;
        useLogisticTasksStore
            .getState()
            .finishWithError("Unable to load logistic tasks.");
    }
}
export async function loadMoreLogisticTasksController() {
    const store = useLogisticTasksStore.getState();
    const { filters, query, nextCursor, isLoadingMore, hasMore } = store;
    if (!hasMore || isLoadingMore || !nextCursor)
        return;
    useLogisticTasksStore.setState({ isLoadingMore: true });
    try {
        const response = await getLogisticTasksApi(filters, undefined, nextCursor, query);
        const { items, hasMore: nextHasMore, nextCursor: newCursor } = normalizeLogisticTasksPage(response);
        useLogisticTasksStore.getState().appendAndFinish(items, nextHasMore, newCursor);
    }
    catch {
        useLogisticTasksStore.setState({ isLoadingMore: false });
    }
}
export async function refreshLogisticTasksByIdsController(ids, currentFilters) {
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
    }
    catch {
        // Realtime refresh failures are silent — the next WS event will retry
    }
}
