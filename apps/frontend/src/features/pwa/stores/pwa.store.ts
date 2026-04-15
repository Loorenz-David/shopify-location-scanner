import { create } from "zustand";
import type { PwaState } from "../types/pwa.types";

interface PwaStoreState extends PwaState {
  pushSubscribed: boolean;
  setRegistration: (registration: ServiceWorkerRegistration | null) => void;
  setUpdateAvailable: (value: boolean) => void;
  setApplyingUpdate: (value: boolean) => void;
  setPushSubscribed: (value: boolean) => void;
}

export const usePwaStore = create<PwaStoreState>((set) => ({
  registration: null,
  updateAvailable: false,
  isApplyingUpdate: false,
  pushSubscribed: false,
  setRegistration: (registration) => set({ registration }),
  setUpdateAvailable: (updateAvailable) => set({ updateAvailable }),
  setApplyingUpdate: (isApplyingUpdate) => set({ isApplyingUpdate }),
  setPushSubscribed: (pushSubscribed) => set({ pushSubscribed }),
}));
