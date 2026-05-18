import { create } from "zustand";
import { filterLogisticLocations, sortWithRecentFirst, } from "../domain/logistic-locations.domain";
export const useLogisticLocationsStore = create((set) => ({
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
    addRecentlyAddedId: (id) => set((state) => ({ recentlyAddedIds: [id, ...state.recentlyAddedIds] })),
    replaceRecentlyAddedId: (oldId, newId) => set((state) => ({
        recentlyAddedIds: state.recentlyAddedIds.map((rid) => rid === oldId ? newId : rid),
    })),
    setExpandedId: (expandedId) => set({ expandedId }),
    setSelectedZoneType: (selectedZoneType) => set({ selectedZoneType }),
    setLoading: (isLoading) => set({ isLoading }),
    setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    setSubmitting: (isSubmitting) => set({ isSubmitting }),
    setErrorMessage: (errorMessage) => set({ errorMessage }),
    reset: () => set({
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
}));
export const selectLogisticLocations = (state) => state.locations;
export const selectFilteredLogisticLocations = (state) => sortWithRecentFirst(filterLogisticLocations(state.locations, state.query), state.recentlyAddedIds);
export const selectLogisticLocationsIsLoading = (state) => state.isLoading;
export const selectLogisticLocationsErrorMessage = (state) => state.errorMessage;
