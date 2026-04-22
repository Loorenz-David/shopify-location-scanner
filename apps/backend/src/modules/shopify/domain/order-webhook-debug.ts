import type { ShopifyOrderLineItem } from "../contracts/shopify.contract.js";
import { isInternalMarker } from "./order-marker.js";

export const buildOrderWebhookLineItemDebugSummary = (
  lineItems: ShopifyOrderLineItem[],
) =>
  lineItems.map((item, index) => ({
    index,
    id: String(item.id),
    productId: item.product_id ? String(item.product_id) : null,
    variantId: item.variant_id ? String(item.variant_id) : null,
    sku: item.sku ?? null,
    title: item.title,
    quantity: item.quantity ?? null,
    productType: item.product_type ?? null,
    isInternalMarker: isInternalMarker(item),
  }));
