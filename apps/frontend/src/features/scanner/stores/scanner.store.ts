import { create } from "zustand";

import {
  readScannerSettings,
  saveScannerOnScanAskSetting,
} from "../domain/scanner-settings.domain";
import type {
  ScannerItem,
  ScannerLens,
  ScannerLocation,
  ScannerStep,
  ScannerLinkError,
} from "../types/scanner.types";

interface ScannerStoreState {
  scannerStep: ScannerStep;
  selectedItem: ScannerItem | null;
  selectedLocation: ScannerLocation | null;
  frozenFrameAt: string | null;
  flashEnabled: boolean;
  availableLenses: ScannerLens[];
  selectedLensId: string | null;
  itemSearchQuery: string;
  itemSearchResults: ScannerItem[];
  locationSearchQuery: string;
  locationSearchResults: ScannerLocation[];
  isSearchingItems: boolean;
  isSearchingLocations: boolean;
  isLinking: boolean;
  canScanNext: boolean;
  onScanAsk: boolean;
  lastLinkedPairKey: string | null;
  lastError: ScannerLinkError | null;
  setScannerStep: (step: ScannerStep) => void;
  setSelectedItem: (item: ScannerItem | null) => void;
  setSelectedLocation: (location: ScannerLocation | null) => void;
  setFrozenFrameAt: (value: string | null) => void;
  setFlashEnabled: (value: boolean) => void;
  setAvailableLenses: (lenses: ScannerLens[]) => void;
  setSelectedLensId: (lensId: string | null) => void;
  setItemSearchQuery: (query: string) => void;
  setItemSearchResults: (results: ScannerItem[]) => void;
  setItemSearchState: (query: string, results: ScannerItem[]) => void;
  setLocationSearchState: (query: string, results: ScannerLocation[]) => void;
  setSearchingItems: (value: boolean) => void;
  setSearchingLocations: (value: boolean) => void;
  setLinking: (value: boolean) => void;
  setCanScanNext: (value: boolean) => void;
  setOnScanAsk: (value: boolean) => void;
  setLastLinkedPairKey: (value: string | null) => void;
  setLastError: (value: ScannerLinkError | null) => void;
  resetCycle: () => void;
}

const initialCycleState = {
  scannerStep: "item" as ScannerStep,
  selectedItem: null,
  selectedLocation: null,
  frozenFrameAt: null,
  isLinking: false,
  canScanNext: false,
  lastLinkedPairKey: null,
  lastError: null,
};

const initialScannerSettings = readScannerSettings();

export const useScannerStore = create<ScannerStoreState>((set) => ({
  ...initialCycleState,
  flashEnabled: false,
  availableLenses: [],
  selectedLensId: null,
  itemSearchQuery: "",
  itemSearchResults: [],
  locationSearchQuery: "",
  locationSearchResults: [],
  isSearchingItems: false,
  isSearchingLocations: false,
  onScanAsk: initialScannerSettings.onScanAsk,
  setScannerStep: (scannerStep) => set({ scannerStep }),
  setSelectedItem: (selectedItem) => set({ selectedItem }),
  setSelectedLocation: (selectedLocation) => set({ selectedLocation }),
  setFrozenFrameAt: (frozenFrameAt) => set({ frozenFrameAt }),
  setFlashEnabled: (flashEnabled) => set({ flashEnabled }),
  setAvailableLenses: (availableLenses) => set({ availableLenses }),
  setSelectedLensId: (selectedLensId) => set({ selectedLensId }),
  setItemSearchQuery: (itemSearchQuery) => set({ itemSearchQuery }),
  setItemSearchResults: (itemSearchResults) => set({ itemSearchResults }),
  setItemSearchState: (itemSearchQuery, itemSearchResults) =>
    set({ itemSearchQuery, itemSearchResults }),
  setLocationSearchState: (locationSearchQuery, locationSearchResults) =>
    set({ locationSearchQuery, locationSearchResults }),
  setSearchingItems: (isSearchingItems) => set({ isSearchingItems }),
  setSearchingLocations: (isSearchingLocations) =>
    set({ isSearchingLocations }),
  setLinking: (isLinking) => set({ isLinking }),
  setCanScanNext: (canScanNext) => set({ canScanNext }),
  setOnScanAsk: (onScanAsk) => {
    saveScannerOnScanAskSetting(onScanAsk);
    set({ onScanAsk });
  },
  setLastLinkedPairKey: (lastLinkedPairKey) => set({ lastLinkedPairKey }),
  setLastError: (lastError) => set({ lastError }),
  resetCycle: () => {
    set((state) => ({
      ...state,
      ...initialCycleState,
    }));
  },
}));

export const selectScannerStep = (state: ScannerStoreState) =>
  state.scannerStep;
export const selectSelectedItem = (state: ScannerStoreState) =>
  state.selectedItem;
export const selectSelectedLocation = (state: ScannerStoreState) =>
  state.selectedLocation;
export const selectScannerItemSearchQuery = (state: ScannerStoreState) =>
  state.itemSearchQuery;
export const selectScannerItemSearchResults = (state: ScannerStoreState) =>
  state.itemSearchResults;
export const selectScannerLocationSearchQuery = (state: ScannerStoreState) =>
  state.locationSearchQuery;
export const selectScannerLocationSearchResults = (state: ScannerStoreState) =>
  state.locationSearchResults;
export const selectScannerIsSearchingItems = (state: ScannerStoreState) =>
  state.isSearchingItems;
export const selectScannerIsSearchingLocations = (state: ScannerStoreState) =>
  state.isSearchingLocations;
export const selectScannerLastError = (state: ScannerStoreState) =>
  state.lastError;
export const selectScannerOnScanAsk = (state: ScannerStoreState) =>
  state.onScanAsk;
