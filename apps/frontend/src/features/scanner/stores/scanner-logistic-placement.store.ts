import { create } from "zustand";

import type { LogisticLocationRecord } from "../../logistic-locations/types/logistic-locations.types";

interface ScannerLogisticPlacementStoreState {
  scanHistoryId: string | null;
  confirmedLocationId: string | null;
  confirmedLocationName: string | null;
  warning: string | null;
  isPlacing: boolean;
  pendingPlacementMatch: LogisticLocationRecord | null;
  requiresZoneMismatchConfirm: boolean;
  setScanHistoryId: (id: string | null) => void;
  setConfirmedLocation: (id: string | null, name: string | null) => void;
  setWarning: (w: string | null) => void;
  setPlacing: (v: boolean) => void;
  setPendingPlacementMatch: (match: LogisticLocationRecord | null) => void;
  setRequiresZoneMismatchConfirm: (v: boolean) => void;
  reset: () => void;
}

export const useScannerLogisticPlacementStore =
  create<ScannerLogisticPlacementStoreState>((set) => ({
    scanHistoryId: null,
    confirmedLocationId: null,
    confirmedLocationName: null,
    warning: null,
    isPlacing: false,
    pendingPlacementMatch: null,
    requiresZoneMismatchConfirm: false,
    setScanHistoryId: (scanHistoryId) => set({ scanHistoryId }),
    setConfirmedLocation: (confirmedLocationId, confirmedLocationName) =>
      set({ confirmedLocationId, confirmedLocationName }),
    setWarning: (warning) => set({ warning }),
    setPlacing: (isPlacing) => set({ isPlacing }),
    setPendingPlacementMatch: (pendingPlacementMatch) =>
      set({ pendingPlacementMatch }),
    setRequiresZoneMismatchConfirm: (requiresZoneMismatchConfirm) =>
      set({ requiresZoneMismatchConfirm }),
    reset: () =>
      set({
        scanHistoryId: null,
        confirmedLocationId: null,
        confirmedLocationName: null,
        warning: null,
        isPlacing: false,
        pendingPlacementMatch: null,
        requiresZoneMismatchConfirm: false,
      }),
  }));
