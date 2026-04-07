import { create } from "zustand";

import type { ShopifyLinkedShopDto } from "../types/shopify.dto";

interface ShopifySettingsState {
  shop: ShopifyLinkedShopDto | null;
  hasLoaded: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  setShop: (shop: ShopifyLinkedShopDto | null) => void;
  setHasLoaded: (hasLoaded: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  setErrorMessage: (errorMessage: string | null) => void;
}

export const useShopifySettingsStore = create<ShopifySettingsState>((set) => ({
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
