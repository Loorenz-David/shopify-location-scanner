import { ApiClientError, tokenAuthController } from "../../../core/api-client";
import { getShopApi } from "../api/get-shop.api";
import { unlinkShopApi } from "../api/unlink-shop.api";
import { normalizeShopifyStoreInput } from "../domain/shopify-settings.domain";
import { useShopifySettingsStore } from "../stores/shopify-settings.store";

export async function loadLinkedShopController(): Promise<void> {
  const store = useShopifySettingsStore.getState();
  store.setLoading(true);
  store.setErrorMessage(null);

  try {
    const response = await getShopApi();
    store.setShop(response.shop);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      store.setShop(null);
    } else {
      store.setErrorMessage("Unable to load Shopify status.");
    }
  } finally {
    store.setLoading(false);
    store.setHasLoaded(true);
  }
}

export async function unlinkShopController(): Promise<void> {
  const store = useShopifySettingsStore.getState();
  store.setSubmitting(true);
  store.setErrorMessage(null);

  try {
    await unlinkShopApi();
    store.setShop(null);
  } catch {
    store.setErrorMessage("Unable to unlink Shopify right now.");
  } finally {
    store.setSubmitting(false);
  }
}

export function startShopifyInstallController(storeInput: string): void {
  const store = useShopifySettingsStore.getState();
  const payload = normalizeShopifyStoreInput(storeInput);

  if (!payload.shopDomain && !payload.storeName) {
    store.setErrorMessage("Enter a Shopify domain to continue.");
    return;
  }

  const token = tokenAuthController.getAccessToken();
  if (!token) {
    store.setErrorMessage("Session expired. Please log in again.");
    return;
  }

  const params = new URLSearchParams({ token });
  if (payload.shopDomain) {
    params.set("shop", payload.shopDomain);
  } else if (payload.storeName) {
    params.set("storeName", payload.storeName);
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
  window.location.href = `${apiBase}/shopify/oauth/install?${params.toString()}`;
}
