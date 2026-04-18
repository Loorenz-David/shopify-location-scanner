import { create } from "zustand";

import type {
  StatsItem,
  StatsItemCardMode,
  StatsItemsOverlayConfig,
  StatsItemsOverlayFilters,
  StatsItemsQuery,
} from "../types/stats-items.types";
import type { SalesChannel } from "../types/analytics.types";

const PAGE_SIZE = 50;

const DEFAULT_OVERLAY_FILTERS: StatsItemsOverlayFilters = {
  isSold: null,
  sortOrder: "newest",
  lastSoldChannel: null,
};

const DEFAULT_OVERLAY_CONTROLS = {
  showStatusFilter: false,
  showSortToggle: false,
  showTimeToSellSort: false,
  salesChannelOptions: [] as SalesChannel[],
};

interface StatsItemsStoreState {
  isOpen: boolean;
  title: string;
  baseQuery: StatsItemsQuery | null;
  query: StatsItemsQuery | null;
  filters: StatsItemsOverlayFilters;
  controls: typeof DEFAULT_OVERLAY_CONTROLS;
  cardMode: StatsItemCardMode;
  items: StatsItem[];
  total: number;
  currentPage: number;
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
  requestId: number;

  openOverlay: (config: StatsItemsOverlayConfig) => void;
  closeOverlay: () => void;
  setIsSoldFilter: (value: boolean | null) => void;
  setSortOrderFilter: (value: "newest" | "oldest") => void;
  setLastSoldChannelFilter: (value: SalesChannel | null) => void;
  setLoading: (value: boolean) => void;
  setError: (message: string | null) => void;
  appendPage: (
    items: StatsItem[],
    total: number,
    page: number,
    forRequestId: number,
  ) => boolean;
  advancePage: () => void;
}

export const useStatsItemsStore = create<StatsItemsStoreState>((set, get) => ({
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

  openOverlay: (config) =>
    set((state) => ({
      isOpen: true,
      title: config.title,
      baseQuery: config.query,
      query: config.query,
      filters: {
        isSold: config.query.isSold ?? null,
        sortOrder:
          config.query.isSold === false
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

  closeOverlay: () =>
    set((state) => ({
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
    if (!baseQuery || filters.isSold === isSold) return;

    const nextQuery = buildFilteredQuery(
      baseQuery,
      {
        ...filters,
        isSold,
      },
      controls,
    );

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
    if (!baseQuery || filters.sortOrder === sortOrder) return;

    const nextQuery = buildFilteredQuery(
      baseQuery,
      {
        ...filters,
        sortOrder,
      },
      controls,
    );

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
    if (
      !baseQuery ||
      filters.lastSoldChannel === lastSoldChannel ||
      !controls.salesChannelOptions.length
    ) {
      return;
    }

    const nextQuery = buildFilteredQuery(
      baseQuery,
      {
        ...filters,
        lastSoldChannel,
      },
      controls,
    );

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
    if (forRequestId !== requestId) return false;
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
    if (!hasMore || isLoading) return;
    set({ currentPage: currentPage + 1 });
  },
}));

export const selectStatsItemsIsOpen = (s: StatsItemsStoreState) => s.isOpen;
export const selectStatsItemsTitle = (s: StatsItemsStoreState) => s.title;
export const selectStatsItemsBaseQuery = (s: StatsItemsStoreState) =>
  s.baseQuery;
export const selectStatsItemsQuery = (s: StatsItemsStoreState) => s.query;
export const selectStatsItemsFilters = (s: StatsItemsStoreState) => s.filters;
export const selectStatsItemsControls = (s: StatsItemsStoreState) =>
  s.controls;
export const selectStatsItemsCardMode = (s: StatsItemsStoreState) => s.cardMode;
export const selectStatsItemsList = (s: StatsItemsStoreState) => s.items;
export const selectStatsItemsIsLoading = (s: StatsItemsStoreState) =>
  s.isLoading;
export const selectStatsItemsHasMore = (s: StatsItemsStoreState) => s.hasMore;
export const selectStatsItemsError = (s: StatsItemsStoreState) => s.error;
export const selectStatsItemsCurrentPage = (s: StatsItemsStoreState) =>
  s.currentPage;
export const selectStatsItemsRequestId = (s: StatsItemsStoreState) =>
  s.requestId;

function buildFilteredQuery(
  baseQuery: StatsItemsQuery,
  filters: StatsItemsOverlayFilters,
  controls: typeof DEFAULT_OVERLAY_CONTROLS = DEFAULT_OVERLAY_CONTROLS,
): StatsItemsQuery {
  const nextQuery: StatsItemsQuery = {
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

  if (
    controls.showSortToggle &&
    filters.isSold === null &&
    nextQuery.sortBy !== undefined
  ) {
    nextQuery.sortDir = filters.sortOrder === "oldest" ? "asc" : "desc";
  }

  if (controls.showTimeToSellSort) {
    nextQuery.sortBy = "timeToSell";
    nextQuery.sortDir = filters.sortOrder === "oldest" ? "asc" : "desc";
    nextQuery.groupByOrder = undefined;
  }

  return nextQuery;
}
