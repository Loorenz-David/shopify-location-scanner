import { create } from "zustand";

import type { BootstrapPayloadDto } from "../types/bootstrap.dto";

interface BootstrapStoreState {
  payload: BootstrapPayloadDto | null;
  isHydrating: boolean;
  errorMessage: string | null;
  lastSyncedAt: string | null;
  setPayload: (payload: BootstrapPayloadDto | null) => void;
  setHydrating: (isHydrating: boolean) => void;
  setErrorMessage: (message: string | null) => void;
  setLastSyncedAt: (value: string | null) => void;
  reset: () => void;
}

export const useBootstrapStore = create<BootstrapStoreState>((set) => ({
  payload: null,
  isHydrating: false,
  errorMessage: null,
  lastSyncedAt: null,
  setPayload: (payload) => set({ payload }),
  setHydrating: (isHydrating) => set({ isHydrating }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  reset: () =>
    set({
      payload: null,
      isHydrating: false,
      errorMessage: null,
      lastSyncedAt: null,
    }),
}));

export const selectBootstrapLastSyncedAt = (state: BootstrapStoreState) =>
  state.lastSyncedAt;
