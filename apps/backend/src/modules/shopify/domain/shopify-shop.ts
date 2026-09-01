export type LinkedShop = {
  id: string;
  shopDomain: string;
  accessToken: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductLocationData = {
  id: string;
  title: string;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED" | "UNLISTED" | "UNKNOWN";
  itemCategory: string | null;
  quantity: number;
  /**
   * Shopify metafield-derived properties.
   * `null` = NOT FETCHED (the query did not ask for metafields) — callers must
   *          not write it; the stored value stays as it is.
   * `{}`   = fetched, and the product has no property metafields — authoritative,
   *          replaces whatever was stored.
   */
  metafieldProperties: Record<string, string> | null;
  sku: string | null;
  barcode: string | null;
  price: string | null;
  itemHeight: number | null;
  itemWidth: number | null;
  itemDepth: number | null;
  volume: number | null;
  imageUrl: string | null;
  location: string | null;
  updatedAt: string;
};

export type ProductLocationSnapshot = ProductLocationData;

/**
 * A snapshot whose properties have already been resolved through
 * `itemPropertiesResolver` (Shopify metafields merged with purchase-API
 * attributes). `resolvedProperties` is what write paths persist;
 * `null` means "not resolved" — leave the stored value alone.
 */
export type ResolvedProductSnapshot = ProductLocationSnapshot & {
  resolvedProperties: Record<string, string> | null;
};
