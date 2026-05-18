import { create } from "zustand";
const PAGE_SIZE = 50;
const DEFAULT_OVERLAY_FILTERS = {
    isSold: null,
    sortOrder: "newest",
    lastSoldChannel: null,
};
const DEFAULT_OVERLAY_CONTROLS = {
    showStatusFilter: false,
    showSortToggle: false,
    showTimeToSellSort: false,
    salesChannelOptions: [],
};
export const useStatsItemsStore = create((set, get) => ({
    isOpen: false,
    title: "",
    baseQuery: null,
    query: null,
    filters: DEFAULT_OVERLAY_FILTERS,
    controls: DEFAULT_OVERLAY_CONTROLS,
    cardMode: "sold-default",
    items: [],
    total: 0,
    currentPage: 1,
    isLoading: false,
    hasMore: false,
    error: null,
    requestId: 0,
    openOverlay: (config) => set((state) => ({
        isOpen: true,
        title: config.title,
        baseQuery: config.query,
        query: config.query,
        filters: {
            isSold: config.query.isSold ?? null,
            sortOrder: config.query.isSold === false
                ? "oldest"
                : config.query.sortDir === "asc"
                    ? "oldest"
                    : "newest",
            lastSoldChannel: config.query.lastSoldChannel ?? null,
        },
        controls: {
            ...DEFAULT_OVERLAY_CONTROLS,
            ...config.controls,
        },
        cardMode: config.cardMode,
        items: [],
        total: 0,
        currentPage: 1,
        isLoading: false,
        hasMore: false,
        error: null,
        requestId: state.requestId + 1,
    })),
    closeOverlay: () => set((state) => ({
        isOpen: false,
        baseQuery: null,
        items: [],
        query: null,
        filters: DEFAULT_OVERLAY_FILTERS,
        controls: DEFAULT_OVERLAY_CONTROLS,
        total: 0,
        currentPage: 1,
        hasMore: false,
        error: null,
        requestId: state.requestId + 1,
    })),
    setIsSoldFilter: (isSold) => {
        const { baseQuery, filters, controls } = get();
        if (!baseQuery || filters.isSold === isSold)
            return;
        const nextQuery = buildFilteredQuery(baseQuery, {
            ...filters,
            isSold,
        }, controls);
        set((state) => ({
            filters: {
                ...state.filters,
                isSold,
            },
            query: nextQuery,
            items: [],
            total: 0,
            currentPage: 1,
            hasMore: false,
            error: null,
            isLoading: false,
            requestId: state.requestId + 1,
        }));
    },
    setSortOrderFilter: (sortOrder) => {
        const { baseQuery, filters, controls } = get();
        if (!baseQuery || filters.sortOrder === sortOrder)
            return;
        const nextQuery = buildFilteredQuery(baseQuery, {
            ...filters,
            sortOrder,
        }, controls);
        set((state) => ({
            filters: {
                ...state.filters,
                sortOrder,
            },
            query: nextQuery,
            items: [],
            total: 0,
            currentPage: 1,
            hasMore: false,
            error: null,
            isLoading: false,
            requestId: state.requestId + 1,
        }));
    },
    setLastSoldChannelFilter: (lastSoldChannel) => {
        const { baseQuery, filters, controls } = get();
        if (!baseQuery ||
            filters.lastSoldChannel === lastSoldChannel ||
            !controls.salesChannelOptions.length) {
            return;
        }
        const nextQuery = buildFilteredQuery(baseQuery, {
            ...filters,
            lastSoldChannel,
        }, controls);
        set((state) => ({
            filters: {
                ...state.filters,
                lastSoldChannel,
            },
            query: nextQuery,
            items: [],
            total: 0,
            currentPage: 1,
            hasMore: false,
            error: null,
            isLoading: false,
            requestId: state.requestId + 1,
        }));
    },
    setLoading: (isLoading) => set({ isLoading }),
    setError: (message) => set({ error: message, isLoading: false }),
    appendPage: (newItems, total, page, forRequestId) => {
        const { requestId } = get();
        if (forRequestId !== requestId)
            return false;
        set((state) => ({
            items: [...state.items, ...newItems],
            total,
            currentPage: page,
            hasMore: page * PAGE_SIZE < total,
            isLoading: false,
            error: null,
        }));
        return true;
    },
    advancePage: () => {
        const { hasMore, isLoading, currentPage } = get();
        if (!hasMore || isLoading)
            return;
        set({ currentPage: currentPage + 1 });
    },
}));
export const selectStatsItemsIsOpen = (s) => s.isOpen;
export const selectStatsItemsTitle = (s) => s.title;
export const selectStatsItemsBaseQuery = (s) => s.baseQuery;
export const selectStatsItemsQuery = (s) => s.query;
export const selectStatsItemsFilters = (s) => s.filters;
export const selectStatsItemsControls = (s) => s.controls;
export const selectStatsItemsCardMode = (s) => s.cardMode;
export const selectStatsItemsList = (s) => s.items;
export const selectStatsItemsIsLoading = (s) => s.isLoading;
export const selectStatsItemsHasMore = (s) => s.hasMore;
export const selectStatsItemsError = (s) => s.error;
export const selectStatsItemsCurrentPage = (s) => s.currentPage;
export const selectStatsItemsRequestId = (s) => s.requestId;
function buildFilteredQuery(baseQuery, filters, controls = DEFAULT_OVERLAY_CONTROLS) {
    const nextQuery = {
        ...baseQuery,
        ...(filters.isSold === null ? {} : { isSold: filters.isSold }),
        ...(filters.isSold === null ? { isSold: undefined } : {}),
    };
    if (controls.salesChannelOptions.length > 0) {
        nextQuery.lastSoldChannel =
            filters.lastSoldChannel &&
                controls.salesChannelOptions.includes(filters.lastSoldChannel)
                ? filters.lastSoldChannel
                : undefined;
    }
    if (controls.showSortToggle && filters.isSold === false) {
        nextQuery.sortBy = "timeInStock";
        nextQuery.sortDir = filters.sortOrder === "oldest" ? "asc" : "desc";
        nextQuery.groupByOrder = undefined;
    }
    if (controls.showSortToggle && filters.isSold === true) {
        nextQuery.sortBy = "lastModifiedAt";
        nextQuery.sortDir = filters.sortOrder === "oldest" ? "asc" : "desc";
    }
    if (controls.showSortToggle &&
        filters.isSold === null &&
        nextQuery.sortBy !== undefined) {
        nextQuery.sortDir = filters.sortOrder === "oldest" ? "asc" : "desc";
    }
    if (controls.showTimeToSellSort) {
        nextQuery.sortBy = "timeToSell";
        nextQuery.sortDir = filters.sortOrder === "oldest" ? "asc" : "desc";
        nextQuery.groupByOrder = undefined;
    }
    return nextQuery;
}
