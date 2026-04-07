import { create } from "zustand";

import type { LocationOptionsSettingsState } from "../types/location-options.types";

export const useLocationOptionsSettingsStore =
  create<LocationOptionsSettingsState>((set) => ({
    options: [],
    query: "",
    expandedValue: null,
    hasHydrated: false,
    isLoading: false,
    isSubmitting: false,
    errorMessage: null,
    setOptions: (options) => set({ options }),
    setQuery: (query) => set({ query }),
    setExpandedValue: (expandedValue) => set({ expandedValue }),
    setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    setLoading: (isLoading) => set({ isLoading }),
    setSubmitting: (isSubmitting) => set({ isSubmitting }),
    setErrorMessage: (errorMessage) => set({ errorMessage }),
  }));
