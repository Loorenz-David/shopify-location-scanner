import type { LogisticIntention } from "../../logistic/domain/logistic.domain.js";

export const INTERNAL_MARKER_TYPE = "INTERNAL_MARKER";

const INTENT_SKU_MAP: Record<string, LogisticIntention> = {
  INTENT_STORE_PICKUP: "store_pickup",
  INTENT_LOCAL_DELIVERY: "local_delivery",
  INTENT_INTERNATIONAL_SHIPPING: "international_shipping",
  INTENT_CUSTOMER_TOOK_IT: "customer_took_it",
};

const FIX_ITEM_FLAG_SKUS = new Set(["FLAG_NEEDS_FIXING"]);

export type ParsedOrderMarkers = {
  intention: LogisticIntention | null;
  fixItem: boolean;
};

export type MarkerLineItem = {
  product_type?: string | null | undefined;
  sku?: string | null | undefined;
};

const normalizeSku = (sku?: string | null): string => sku?.trim() ?? "";

export const isMarkerSku = (sku?: string | null): boolean => {
  const normalizedSku = normalizeSku(sku);
  return Boolean(INTENT_SKU_MAP[normalizedSku]) || FIX_ITEM_FLAG_SKUS.has(normalizedSku);
};

export const isInternalMarker = (item: MarkerLineItem): boolean =>
  item.product_type === INTERNAL_MARKER_TYPE || isMarkerSku(item.sku);

export const parseOrderMarkers = (
  lineItems: MarkerLineItem[],
): ParsedOrderMarkers => {
  let intention: LogisticIntention | null = null;
  let fixItem = false;

  for (const item of lineItems) {
    if (!isInternalMarker(item)) {
      continue;
    }

    const sku = normalizeSku(item.sku);

    const mappedIntention = INTENT_SKU_MAP[sku];
    if (!intention && mappedIntention) {
      intention = mappedIntention;
    }

    if (FIX_ITEM_FLAG_SKUS.has(sku)) {
      fixItem = true;
    }
  }

  return {
    intention,
    fixItem,
  };
};
