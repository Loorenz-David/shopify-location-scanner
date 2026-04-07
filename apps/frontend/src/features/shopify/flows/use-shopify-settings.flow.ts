import { useEffect } from "react";

import { shopifySettingsActions } from "../actions/shopify-settings.actions";
import { useShopifySettingsStore } from "../stores/shopify-settings.store";

export function useShopifySettingsFlow(): void {
  const hasLoaded = useShopifySettingsStore((state) => state.hasLoaded);

  useEffect(() => {
    if (!hasLoaded) {
      void shopifySettingsActions.loadLinkedShop();
    }
  }, [hasLoaded]);
}
