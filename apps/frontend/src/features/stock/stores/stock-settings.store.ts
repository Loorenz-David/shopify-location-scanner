import { create } from "zustand";

import type {
  LocationStockDto,
  StockLocationSummaryDto,
} from "../types/stock.dto";
import type { StockOperationError } from "../types/stock.types";

interface StockSettingsStoreState {
  locations: StockLocationSummaryDto[];
  detailsByLocation: Record<string, LocationStockDto[]>;
  selectedLocation: string | null;
  isLoading: boolean;
  error: StockOperationError | null;
  errorMessage: string | null;
  setLocations: (locations: StockLocationSummaryDto[]) => void;
  setLocationDetails: (location: string, details: LocationStockDto[]) => void;
  setSelectedLocation: (location: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: StockOperationError | null) => void;
  reset: () => void;
}

export const useStockSettingsStore = create<StockSettingsStoreState>((set) => ({
  locations: [],
  detailsByLocation: {},
  selectedLocation: null,
  isLoading: false,
  error: null,
  errorMessage: null,
  setLocations: (locations) => set({ locations }),
  setLocationDetails: (location, details) =>
    set((state) => ({
      detailsByLocation: {
        ...state.detailsByLocation,
        [location]: details,
      },
      selectedLocation: location,
    })),
  setSelectedLocation: (selectedLocation) => set({ selectedLocation }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, errorMessage: error?.message ?? null }),
  reset: () =>
    set({
      locations: [],
      detailsByLocation: {},
      selectedLocation: null,
      isLoading: false,
      error: null,
      errorMessage: null,
    }),
}));

export const selectStockLocations = (state: StockSettingsStoreState) =>
  state.locations;

export const selectStockLocationDetails = (state: StockSettingsStoreState) =>
  state.selectedLocation === null
    ? []
    : state.detailsByLocation[state.selectedLocation] ?? [];

export const selectStockLocationDetailsByLocation = (
  state: StockSettingsStoreState,
) => state.detailsByLocation;

export const selectStockSelectedLocation = (state: StockSettingsStoreState) =>
  state.selectedLocation;

export const selectStockSettingsIsLoading = (state: StockSettingsStoreState) =>
  state.isLoading;

export const selectStockSettingsError = (state: StockSettingsStoreState) =>
  state.error;

export const selectStockSettingsErrorMessage = (
  state: StockSettingsStoreState,
) => state.errorMessage;
