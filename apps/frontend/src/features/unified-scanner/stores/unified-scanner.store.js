import { create } from "zustand";
import { readScannerSettings, saveScannerOnScanAskSetting, } from "../domain/scanner-settings.domain";
const initialCycleState = {
    phase: "scanning-item",
    selectedItem: null,
    locationMode: null,
    selectedLocation: null,
    pendingLocationValue: null,
    pendingLocation: null,
    pendingWarnings: [],
    activeWarning: null,
    requiresZoneMismatchAfterFixCheck: false,
    frozenFrameAt: null,
    isLookingUpItem: false,
    itemLookupError: null,
    locationWarningBanner: null,
    lastPlacementError: null,
    canScanNext: false,
};
const initialScannerSettings = readScannerSettings();
export const useUnifiedScannerStore = create((set) => ({
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
    setPendingLocationValue: (pendingLocationValue) => set({ pendingLocationValue }),
    setPendingLocation: (pendingLocation) => set({ pendingLocation }),
    setPendingWarnings: (pendingWarnings) => set({ pendingWarnings }),
    setActiveWarning: (activeWarning) => set({ activeWarning }),
    setRequiresZoneMismatchAfterFixCheck: (requiresZoneMismatchAfterFixCheck) => set({ requiresZoneMismatchAfterFixCheck }),
    setFrozenFrameAt: (frozenFrameAt) => set({ frozenFrameAt }),
    setIsLookingUpItem: (isLookingUpItem) => set({ isLookingUpItem }),
    setItemLookupError: (itemLookupError) => set({ itemLookupError }),
    setLocationWarningBanner: (locationWarningBanner) => set({ locationWarningBanner }),
    setLastPlacementError: (lastPlacementError) => set({ lastPlacementError }),
    setCanScanNext: (canScanNext) => set({ canScanNext }),
    setFlashEnabled: (flashEnabled) => set({ flashEnabled }),
    setAvailableLenses: (availableLenses) => set({ availableLenses }),
    setSelectedLensId: (selectedLensId) => set({ selectedLensId }),
    bumpLensSelectionRevision: () => set((state) => ({ lensSelectionRevision: state.lensSelectionRevision + 1 })),
    setPrefilledItem: (prefilledItem) => set({ prefilledItem }),
    setOnScanAsk: (onScanAsk) => {
        saveScannerOnScanAskSetting(onScanAsk);
        set({ onScanAsk });
    },
    advanceWarning: () => set((state) => {
        const [nextWarning = null, ...restWarnings] = state.pendingWarnings;
        return {
            activeWarning: nextWarning,
            pendingWarnings: restWarnings,
        };
    }),
    resetCycle: () => set((state) => ({
        ...state,
        ...initialCycleState,
    })),
}));
