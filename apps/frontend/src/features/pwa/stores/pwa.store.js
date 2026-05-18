import { create } from "zustand";
export const usePwaStore = create((set) => ({
    registration: null,
    updateAvailable: false,
    isApplyingUpdate: false,
    pushSubscribed: false,
    setRegistration: (registration) => set({ registration }),
    setUpdateAvailable: (updateAvailable) => set({ updateAvailable }),
    setApplyingUpdate: (isApplyingUpdate) => set({ isApplyingUpdate }),
    setPushSubscribed: (pushSubscribed) => set({ pushSubscribed }),
}));
