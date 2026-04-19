import { create } from "zustand";

import {
  buildOrderGroups,
  countByIntention,
  groupByIntention,
} from "../domain/logistic-tasks.domain";
import { serializeFiltersForRequestKey } from "../domain/logistic-tasks-filters.domain";
import type {
  LogisticIntention,
  LogisticOrderGroup,
  LogisticTaskFilters,
  LogisticTaskItem,
} from "../types/logistic-tasks.types";

const ACTIVE_TAB_STORAGE_KEY = "logistic-tasks:activeTab";

function readStoredActiveTab(): LogisticIntention | null {
  try {
    const raw = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LogisticIntention | null;
  } catch {
    return null;
  }
}

interface LogisticTasksStoreState {
  items: LogisticTaskItem[];
  filters: LogisticTaskFilters;
  query: string;
  activeIntentionTab: LogisticIntention | null;
  batchNotification: { count: number; message: string } | null;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasLoaded: boolean;
  hasMore: boolean;
  nextCursor: string | null;
  errorMessage: string | null;
  activeRequestId: number;
  hydrate: (items: LogisticTaskItem[]) => void;
  hydrateAndFinish: (
    items: LogisticTaskItem[],
    hasMore: boolean,
    nextCursor: string | null,
  ) => void;
  appendAndFinish: (
    items: LogisticTaskItem[],
    hasMore: boolean,
    nextCursor: string | null,
  ) => void;
  finishWithError: (msg: string) => void;
  upsertItem: (item: LogisticTaskItem) => void;
  removeItem: (id: string) => void;
  setFilters: (partial: Partial<LogisticTaskFilters>) => void;
  setQuery: (q: string) => void;
  setActiveIntentionTab: (tab: LogisticIntention | null) => void;
  setBatchNotification: (n: { count: number; message: string } | null) => void;
  incrementRequestId: () => number;
  reset: () => void;
}

const initialState = {
  items: [] as LogisticTaskItem[],
  filters: {} as LogisticTaskFilters,
  query: "",
  activeIntentionTab: readStoredActiveTab(),
  batchNotification: null as { count: number; message: string } | null,
  isLoading: false,
  isLoadingMore: false,
  hasLoaded: false,
  hasMore: false,
  nextCursor: null as string | null,
  errorMessage: null as string | null,
  activeRequestId: 0,
};

export const useLogisticTasksStore = create<LogisticTasksStoreState>(
  (set, get) => ({
    ...initialState,
    hydrate: (items) => set({ items, isLoading: false }),
    hydrateAndFinish: (items, hasMore, nextCursor) =>
      set({
        items,
        isLoading: false,
        hasLoaded: true,
        errorMessage: null,
        hasMore,
        nextCursor,
      }),
    appendAndFinish: (newItems, hasMore, nextCursor) =>
      set((state) => ({
        items: [...state.items, ...newItems],
        isLoadingMore: false,
        hasMore,
        nextCursor,
      })),
    finishWithError: (msg) =>
      set({ isLoading: false, isLoadingMore: false, hasLoaded: true, errorMessage: msg }),
    upsertItem: (item) =>
      set((state) => {
        const index = state.items.findIndex((i) => i.id === item.id);
        if (index >= 0) {
          const next = [...state.items];
          next[index] = item;
          return { items: next };
        }
        return { items: [item, ...state.items] };
      }),
    removeItem: (id) =>
      set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
    setFilters: (partial) =>
      set((state) => ({ filters: { ...state.filters, ...partial } })),
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
  }),
);

export const selectLogisticTasksItems = (state: LogisticTasksStoreState) =>
  state.items;

export const selectLogisticTasksOrderGroups = (
  state: LogisticTasksStoreState,
): LogisticOrderGroup[] => buildOrderGroups(state.items);

export const selectLogisticTasksIntentionMap = (
  state: LogisticTasksStoreState,
) => groupByIntention(state.items);

export const selectLogisticTasksIntentionCounts = (
  state: LogisticTasksStoreState,
) => countByIntention(state.items);

export const selectLogisticTasksIsLoading = (state: LogisticTasksStoreState) =>
  state.isLoading;

export const selectLogisticTasksHasLoaded = (state: LogisticTasksStoreState) =>
  state.hasLoaded;

export const selectLogisticTasksErrorMessage = (
  state: LogisticTasksStoreState,
) => state.errorMessage;

export const selectLogisticTasksFiltersRequestKey = (
  state: LogisticTasksStoreState,
) => serializeFiltersForRequestKey(state.filters);

export const selectLogisticTasksActiveIntentionTab = (
  state: LogisticTasksStoreState,
) => state.activeIntentionTab;

export const selectLogisticTasksBatchNotification = (
  state: LogisticTasksStoreState,
) => state.batchNotification;

export const selectLogisticTasksHasMore = (state: LogisticTasksStoreState) =>
  state.hasMore;

export const selectLogisticTasksIsLoadingMore = (
  state: LogisticTasksStoreState,
) => state.isLoadingMore;
