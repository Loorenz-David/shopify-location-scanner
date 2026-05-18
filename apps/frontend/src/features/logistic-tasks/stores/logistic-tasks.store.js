import { create } from "zustand";
import { buildOrderGroups, countByIntention, groupByIntention, } from "../domain/logistic-tasks.domain";
import { serializeFiltersForRequestKey } from "../domain/logistic-tasks-filters.domain";
const ACTIVE_TAB_STORAGE_KEY = "logistic-tasks:activeTab";
function readStoredActiveTab() {
    try {
        const raw = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
        if (!raw)
            return null;
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
const initialState = {
    items: [],
    filters: {},
    query: "",
    activeIntentionTab: readStoredActiveTab(),
    batchNotification: null,
    isLoading: false,
    isLoadingMore: false,
    hasLoaded: false,
    hasMore: false,
    nextCursor: null,
    errorMessage: null,
    activeRequestId: 0,
};
export const useLogisticTasksStore = create((set, get) => ({
    ...initialState,
    hydrate: (items) => set({ items, isLoading: false }),
    hydrateAndFinish: (items, hasMore, nextCursor) => set({
        items,
        isLoading: false,
        hasLoaded: true,
        errorMessage: null,
        hasMore,
        nextCursor,
    }),
    appendAndFinish: (newItems, hasMore, nextCursor) => set((state) => ({
        items: [...state.items, ...newItems],
        isLoadingMore: false,
        hasMore,
        nextCursor,
    })),
    finishWithError: (msg) => set({ isLoading: false, isLoadingMore: false, hasLoaded: true, errorMessage: msg }),
    upsertItem: (item) => set((state) => {
        const index = state.items.findIndex((i) => i.id === item.id);
        if (index >= 0) {
            const next = [...state.items];
            next[index] = item;
            return { items: next };
        }
        return { items: [item, ...state.items] };
    }),
    removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
    setFilters: (partial) => set((state) => ({ filters: { ...state.filters, ...partial } })),
    setQuery: (query) => set({ query }),
    setActiveIntentionTab: (tab) => {
        localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, JSON.stringify(tab));
        set({ activeIntentionTab: tab });
    },
    setBatchNotification: (batchNotification) => set({ batchNotification }),
    incrementRequestId: () => {
        const next = get().activeRequestId + 1;
        set({ activeRequestId: next });
        return next;
    },
    reset: () => set(initialState),
}));
export const selectLogisticTasksItems = (state) => state.items;
export const selectLogisticTasksOrderGroups = (state) => buildOrderGroups(state.items);
export const selectLogisticTasksIntentionMap = (state) => groupByIntention(state.items);
export const selectLogisticTasksIntentionCounts = (state) => countByIntention(state.items);
export const selectLogisticTasksIsLoading = (state) => state.isLoading;
export const selectLogisticTasksHasLoaded = (state) => state.hasLoaded;
export const selectLogisticTasksErrorMessage = (state) => state.errorMessage;
export const selectLogisticTasksFiltersRequestKey = (state) => serializeFiltersForRequestKey(state.filters);
export const selectLogisticTasksActiveIntentionTab = (state) => state.activeIntentionTab;
export const selectLogisticTasksBatchNotification = (state) => state.batchNotification;
export const selectLogisticTasksHasMore = (state) => state.hasMore;
export const selectLogisticTasksIsLoadingMore = (state) => state.isLoadingMore;
