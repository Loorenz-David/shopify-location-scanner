import { create } from "zustand";

import {
  applyItemScanHistoryLiveFilters,
  countActiveItemScanHistoryFilters,
  defaultItemScanHistoryFilters,
  normalizeItemScanHistoryFilters,
  serializeItemScanHistoryFiltersForRequest,
} from "../domain/item-scan-history-filters.domain";
import type { ItemScanHistoryFilters } from "../types/item-scan-history-filters.types";
import type { ItemScanHistoryItem } from "../types/item-scan-history.types";

interface HydratedHistoryPayload {
  items: ItemScanHistoryItem[];
  page: number;
  pageSize: number;
  total: number;
}

interface ItemScanHistoryStoreState {
  query: string;
  filters: ItemScanHistoryFilters;
  items: ItemScanHistoryItem[];
  isLoading: boolean;
  errorMessage: string | null;
  hasLoaded: boolean;
  expandedItemIds: string[];
  total: number;
  page: number;
  pageSize: number;
  activeRequestId: number;
  setQuery: (query: string) => void;
  setFilters: (filters: Partial<ItemScanHistoryFilters>) => void;
  resetFilters: () => void;
  setLoading: (isLoading: boolean) => void;
  setErrorMessage: (errorMessage: string | null) => void;
  setHasLoaded: (hasLoaded: boolean) => void;
  setActiveRequestId: (activeRequestId: number) => void;
  hydrate: (payload: HydratedHistoryPayload) => void;
  hydrateAndFinish: (payload: HydratedHistoryPayload) => void;
  finishWithError: (errorMessage: string) => void;
  toggleExpandedItem: (itemId: string) => void;
  reset: () => void;
}

const initialState = {
  query: "",
  filters: defaultItemScanHistoryFilters,
  items: [],
  isLoading: false,
  errorMessage: null,
  hasLoaded: false,
  expandedItemIds: [],
  total: 0,
  page: 1,
  pageSize: 50,
  activeRequestId: 0,
};

export const useItemScanHistoryStore = create<ItemScanHistoryStoreState>(
  (set) => ({
    ...initialState,
    setQuery: (query) => set({ query }),
    setFilters: (filters) =>
      set((state) => ({
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
    hydrate: ({ items, page, pageSize, total }) =>
      set((state) => ({
        items,
        page,
        pageSize,
        total,
        expandedItemIds: state.expandedItemIds.filter((itemId) =>
          items.some((item) => item.id === itemId),
        ),
      })),
    hydrateAndFinish: ({ items, page, pageSize, total }) =>
      set((state) => ({
        items,
        page,
        pageSize,
        total,
        isLoading: false,
        hasLoaded: true,
        errorMessage: null,
        expandedItemIds: state.expandedItemIds.filter((itemId) =>
          items.some((item) => item.id === itemId),
        ),
      })),
    finishWithError: (errorMessage) =>
      set({ isLoading: false, hasLoaded: true, errorMessage }),
    toggleExpandedItem: (itemId) =>
      set((state) => ({
        expandedItemIds: state.expandedItemIds.includes(itemId)
          ? state.expandedItemIds.filter((value) => value !== itemId)
          : [...state.expandedItemIds, itemId],
      })),
    reset: () => set(initialState),
  }),
);

export const selectItemScanHistoryQuery = (state: ItemScanHistoryStoreState) =>
  state.query;
export const selectItemScanHistoryFilters = (
  state: ItemScanHistoryStoreState,
) => state.filters;
export const selectItemScanHistoryActiveFilterCount = (
  state: ItemScanHistoryStoreState,
) => countActiveItemScanHistoryFilters(state.filters);
export const selectItemScanHistoryFiltersRequestKey = (
  state: ItemScanHistoryStoreState,
) => serializeItemScanHistoryFiltersForRequest(state.filters);
export const selectItemScanHistoryItems = (state: ItemScanHistoryStoreState) =>
  state.items;
export const selectItemScanHistoryVisibleItems = (
  state: ItemScanHistoryStoreState,
) => applyItemScanHistoryLiveFilters(state.items, state.query, state.filters);
export const selectItemScanHistoryIsLoading = (
  state: ItemScanHistoryStoreState,
) => state.isLoading;
export const selectItemScanHistoryErrorMessage = (
  state: ItemScanHistoryStoreState,
) => state.errorMessage;
export const selectItemScanHistoryHasLoaded = (
  state: ItemScanHistoryStoreState,
) => state.hasLoaded;
export const selectItemScanHistoryExpandedItemIds = (
  state: ItemScanHistoryStoreState,
) => state.expandedItemIds;
