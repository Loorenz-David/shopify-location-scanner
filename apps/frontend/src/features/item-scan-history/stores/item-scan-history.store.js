import { create } from "zustand";
import { applyItemScanHistoryLiveFilters, countActiveItemScanHistoryFilters, defaultItemScanHistoryFilters, normalizeItemScanHistoryFilters, serializeItemScanHistoryFiltersForRequest, } from "../domain/item-scan-history-filters.domain";
const initialState = {
    query: "",
    filters: defaultItemScanHistoryFilters,
    items: [],
    isLoading: false,
    isLoadingMore: false,
    errorMessage: null,
    hasLoaded: false,
    hasMore: false,
    nextCursor: null,
    expandedItemIds: [],
    total: 0,
    page: 1,
    pageSize: 25,
    activeRequestId: 0,
};
export const useItemScanHistoryStore = create((set) => ({
    ...initialState,
    setQuery: (query) => set({ query }),
    setFilters: (filters) => set((state) => ({
        filters: normalizeItemScanHistoryFilters({
            ...state.filters,
            ...filters,
        }),
    })),
    resetFilters: () => set({ filters: defaultItemScanHistoryFilters }),
    setLoading: (isLoading) => set({ isLoading }),
    setErrorMessage: (errorMessage) => set({ errorMessage }),
    setHasLoaded: (hasLoaded) => set({ hasLoaded }),
    setActiveRequestId: (activeRequestId) => set({ activeRequestId }),
    hydrate: ({ items, page, pageSize, total, hasMore, nextCursor }) => set((state) => ({
        items,
        page,
        pageSize,
        total,
        hasMore,
        nextCursor,
        expandedItemIds: state.expandedItemIds.filter((itemId) => items.some((item) => item.id === itemId)),
    })),
    hydrateAndFinish: ({ items, page, pageSize, total, hasMore, nextCursor }) => set((state) => ({
        items,
        page,
        pageSize,
        total,
        hasMore,
        nextCursor,
        isLoading: false,
        hasLoaded: true,
        errorMessage: null,
        expandedItemIds: state.expandedItemIds.filter((itemId) => items.some((item) => item.id === itemId)),
    })),
    appendAndFinish: ({ items: newItems, hasMore, nextCursor }) => set((state) => ({
        items: [...state.items, ...newItems],
        hasMore,
        nextCursor,
        isLoadingMore: false,
    })),
    finishWithError: (errorMessage) => set({ isLoading: false, isLoadingMore: false, hasLoaded: true, errorMessage }),
    toggleExpandedItem: (itemId) => set((state) => ({
        expandedItemIds: state.expandedItemIds.includes(itemId)
            ? state.expandedItemIds.filter((value) => value !== itemId)
            : [...state.expandedItemIds, itemId],
    })),
    reset: () => set(initialState),
}));
export const selectItemScanHistoryQuery = (state) => state.query;
export const selectItemScanHistoryFilters = (state) => state.filters;
export const selectItemScanHistoryActiveFilterCount = (state) => countActiveItemScanHistoryFilters(state.filters);
export const selectItemScanHistoryTotal = (state) => state.total;
export const selectItemScanHistoryFiltersRequestKey = (state) => serializeItemScanHistoryFiltersForRequest(state.filters);
export const selectItemScanHistoryItems = (state) => state.items;
export const selectItemScanHistoryVisibleItems = (state) => applyItemScanHistoryLiveFilters(state.items, state.query, state.filters);
export const selectItemScanHistoryIsLoading = (state) => state.isLoading;
export const selectItemScanHistoryErrorMessage = (state) => state.errorMessage;
export const selectItemScanHistoryHasLoaded = (state) => state.hasLoaded;
export const selectItemScanHistoryExpandedItemIds = (state) => state.expandedItemIds;
export const selectItemScanHistoryHasMore = (state) => state.hasMore;
export const selectItemScanHistoryIsLoadingMore = (state) => state.isLoadingMore;
