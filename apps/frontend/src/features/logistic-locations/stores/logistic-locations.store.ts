import { create } from "zustand";

import {
  filterLogisticLocations,
  sortWithRecentFirst,
} from "../domain/logistic-locations.domain";
import type {
  LogisticLocationRecord,
  LogisticZoneType,
} from "../types/logistic-locations.types";

interface LogisticLocationsStoreState {
  locations: LogisticLocationRecord[];
  query: string;
  recentlyAddedIds: string[];
  expandedId: string | null;
  selectedZoneType: LogisticZoneType | null;
  isLoading: boolean;
  hasHydrated: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  setLocations: (locations: LogisticLocationRecord[]) => void;
  setQuery: (query: string) => void;
  addRecentlyAddedId: (id: string) => void;
  replaceRecentlyAddedId: (oldId: string, newId: string) => void;
  setExpandedId: (id: string | null) => void;
  setSelectedZoneType: (zone: LogisticZoneType | null) => void;
  setLoading: (v: boolean) => void;
  setHasHydrated: (v: boolean) => void;
  setSubmitting: (v: boolean) => void;
  setErrorMessage: (msg: string | null) => void;
  reset: () => void;
}

export const useLogisticLocationsStore = create<LogisticLocationsStoreState>(
  (set) => ({
    locations: [],
    query: "",
    recentlyAddedIds: [],
    expandedId: null,
    selectedZoneType: null,
    isLoading: false,
    hasHydrated: false,
    isSubmitting: false,
    errorMessage: null,
    setLocations: (locations) => set({ locations }),
    setQuery: (query) => set({ query }),
    addRecentlyAddedId: (id) =>
      set((state) => ({ recentlyAddedIds: [id, ...state.recentlyAddedIds] })),
    replaceRecentlyAddedId: (oldId, newId) =>
      set((state) => ({
        recentlyAddedIds: state.recentlyAddedIds.map((rid) =>
          rid === oldId ? newId : rid,
        ),
      })),
    setExpandedId: (expandedId) => set({ expandedId }),
    setSelectedZoneType: (selectedZoneType) => set({ selectedZoneType }),
    setLoading: (isLoading) => set({ isLoading }),
    setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    setSubmitting: (isSubmitting) => set({ isSubmitting }),
    setErrorMessage: (errorMessage) => set({ errorMessage }),
    reset: () =>
      set({
        locations: [],
        query: "",
        recentlyAddedIds: [],
        expandedId: null,
        selectedZoneType: null,
        isLoading: false,
        hasHydrated: false,
        isSubmitting: false,
        errorMessage: null,
      }),
  }),
);

export const selectLogisticLocations = (state: LogisticLocationsStoreState) =>
  state.locations;

export const selectFilteredLogisticLocations = (
  state: LogisticLocationsStoreState,
) =>
  sortWithRecentFirst(
    filterLogisticLocations(state.locations, state.query),
    state.recentlyAddedIds,
  );

export const selectLogisticLocationsIsLoading = (
  state: LogisticLocationsStoreState,
) => state.isLoading;

export const selectLogisticLocationsErrorMessage = (
  state: LogisticLocationsStoreState,
) => state.errorMessage;
