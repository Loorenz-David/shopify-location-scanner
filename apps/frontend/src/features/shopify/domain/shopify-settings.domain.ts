import type { ShopifyOauthInstallRequestDto } from "../types/shopify.dto";

export function normalizeShopifyStoreInput(
  value: string,
): ShopifyOauthInstallRequestDto {
  const normalized = value.trim();
  if (!normalized) {
    return { storeName: "" };
  }

  if (normalized.endsWith(".myshopify.com")) {
    return { shopDomain: normalized };
  }

  return { storeName: normalized };
}

export function formatShopConnectedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}
