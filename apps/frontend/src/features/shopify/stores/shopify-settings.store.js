import { create } from "zustand";
export const useShopifySettingsStore = create((set) => ({
    shop: null,
    hasLoaded: false,
    isLoading: false,
    isSubmitting: false,
    errorMessage: null,
    setShop: (shop) => set({ shop }),
    setHasLoaded: (hasLoaded) => set({ hasLoaded }),
    setLoading: (isLoading) => set({ isLoading }),
    setSubmitting: (isSubmitting) => set({ isSubmitting }),
    setErrorMessage: (errorMessage) => set({ errorMessage }),
}));
