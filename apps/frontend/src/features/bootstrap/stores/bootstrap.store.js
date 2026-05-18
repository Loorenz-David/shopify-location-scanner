import { create } from "zustand";
export const useBootstrapStore = create((set) => ({
    payload: null,
    isHydrating: false,
    errorMessage: null,
    lastSyncedAt: null,
    setPayload: (payload) => set({ payload }),
    setHydrating: (isHydrating) => set({ isHydrating }),
    setErrorMessage: (errorMessage) => set({ errorMessage }),
    setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
    reset: () => set({
        payload: null,
        isHydrating: false,
        errorMessage: null,
        lastSyncedAt: null,
    }),
}));
export const selectBootstrapLastSyncedAt = (state) => state.lastSyncedAt;
