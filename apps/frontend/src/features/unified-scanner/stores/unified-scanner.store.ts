import { create } from "zustand";

import {
  readScannerSettings,
  saveScannerOnScanAskSetting,
} from "../domain/scanner-settings.domain";
import type {
  LocationScannerMode,
  LocationWarning,
  ResolvedLocation,
  ScannerLens,
  UnifiedScannerItem,
  UnifiedScannerPhase,
} from "../types/unified-scanner.types";

interface UnifiedScannerStore extends Record<string, unknown> {
  prefilledItem: UnifiedScannerItem | null;
  phase: UnifiedScannerPhase;
  selectedItem: UnifiedScannerItem | null;
  locationMode: LocationScannerMode | null;
  selectedLocation: ResolvedLocation | null;
  pendingLocationValue: string | null;
  pendingLocationKind: LocationScannerMode | null;
  pendingLocation: ResolvedLocation | null;
  pendingWarnings: LocationWarning[];
  activeWarning: LocationWarning | null;
  requiresZoneMismatchAfterFixCheck: boolean;
  returnToStore: boolean;
  frozenFrameAt: string | null;
  isLookingUpItem: boolean;
  itemLookupError: string | null;
  locationWarningBanner: string | null;
  lastPlacementError: string | null;
  canScanNext: boolean;
  flashEnabled: boolean;
  availableLenses: ScannerLens[];
  selectedLensId: string | null;
  lensSelectionRevision: number;
  onScanAsk: boolean;
  setPhase: (phase: UnifiedScannerPhase) => void;
  setSelectedItem: (item: UnifiedScannerItem | null) => void;
  setLocationMode: (mode: LocationScannerMode | null) => void;
  setSelectedLocation: (location: ResolvedLocation | null) => void;
  setPendingLocationValue: (
    value: string | null,
    kind?: LocationScannerMode | null,
  ) => void;
  setPendingLocation: (location: ResolvedLocation | null) => void;
  setPendingWarnings: (warnings: LocationWarning[]) => void;
  setActiveWarning: (warning: LocationWarning | null) => void;
  setRequiresZoneMismatchAfterFixCheck: (value: boolean) => void;
  setReturnToStore: (value: boolean) => void;
  setFrozenFrameAt: (value: string | null) => void;
  setIsLookingUpItem: (value: boolean) => void;
  setItemLookupError: (value: string | null) => void;
  setLocationWarningBanner: (value: string | null) => void;
  setLastPlacementError: (value: string | null) => void;
  setCanScanNext: (value: boolean) => void;
  setFlashEnabled: (value: boolean) => void;
  setAvailableLenses: (value: ScannerLens[]) => void;
  setSelectedLensId: (value: string | null) => void;
  bumpLensSelectionRevision: () => void;
  setOnScanAsk: (value: boolean) => void;
  setPrefilledItem: (item: UnifiedScannerItem | null) => void;
  advanceWarning: () => void;
  resetCycle: () => void;
}

const initialCycleState = {
  phase: "scanning-item" as UnifiedScannerPhase,
  selectedItem: null,
  locationMode: null,
  selectedLocation: null,
  pendingLocationValue: null,
  pendingLocationKind: null,
  pendingLocation: null,
  pendingWarnings: [] as LocationWarning[],
  activeWarning: null,
  requiresZoneMismatchAfterFixCheck: false,
  returnToStore: false,
  frozenFrameAt: null,
  isLookingUpItem: false,
  itemLookupError: null,
  locationWarningBanner: null,
  lastPlacementError: null,
  canScanNext: false,
};

const initialScannerSettings = readScannerSettings();

export const useUnifiedScannerStore = create<UnifiedScannerStore>((set) => ({
  prefilledItem: null,
  ...initialCycleState,
  flashEnabled: false,
  availableLenses: [],
  selectedLensId: null,
  lensSelectionRevision: 0,
  onScanAsk: initialScannerSettings.onScanAsk,
  setPhase: (phase) => set({ phase }),
  setSelectedItem: (selectedItem) => set({ selectedItem }),
  setLocationMode: (locationMode) => set({ locationMode }),
  setSelectedLocation: (selectedLocation) => set({ selectedLocation }),
  setPendingLocationValue: (pendingLocationValue, kind = null) =>
    set({ pendingLocationValue, pendingLocationKind: kind }),
  setPendingLocation: (pendingLocation) => set({ pendingLocation }),
  setPendingWarnings: (pendingWarnings) => set({ pendingWarnings }),
  setActiveWarning: (activeWarning) => set({ activeWarning }),
  setRequiresZoneMismatchAfterFixCheck: (requiresZoneMismatchAfterFixCheck) =>
    set({ requiresZoneMismatchAfterFixCheck }),
  setReturnToStore: (returnToStore) => set({ returnToStore }),
  setFrozenFrameAt: (frozenFrameAt) => set({ frozenFrameAt }),
  setIsLookingUpItem: (isLookingUpItem) => set({ isLookingUpItem }),
  setItemLookupError: (itemLookupError) => set({ itemLookupError }),
  setLocationWarningBanner: (locationWarningBanner) =>
    set({ locationWarningBanner }),
  setLastPlacementError: (lastPlacementError) => set({ lastPlacementError }),
  setCanScanNext: (canScanNext) => set({ canScanNext }),
  setFlashEnabled: (flashEnabled) => set({ flashEnabled }),
  setAvailableLenses: (availableLenses) => set({ availableLenses }),
  setSelectedLensId: (selectedLensId) => set({ selectedLensId }),
  bumpLensSelectionRevision: () =>
    set((state) => ({ lensSelectionRevision: state.lensSelectionRevision + 1 })),
  setPrefilledItem: (prefilledItem) => set({ prefilledItem }),
  setOnScanAsk: (onScanAsk) => {
    saveScannerOnScanAskSetting(onScanAsk);
    set({ onScanAsk });
  },
  advanceWarning: () =>
    set((state) => {
      const [nextWarning = null, ...restWarnings] = state.pendingWarnings;

      return {
        activeWarning: nextWarning,
        pendingWarnings: restWarnings,
      };
    }),
  resetCycle: () =>
    set((state) => ({
      ...state,
      ...initialCycleState,
    })),
}));
