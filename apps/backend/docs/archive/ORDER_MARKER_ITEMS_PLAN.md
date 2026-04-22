# Order Marker Items — Webhook Intention Flow

## What this plan covers

Shopify orders can contain special "internal marker" line items. These items are not real products — they carry metadata about the order encoded in their SKU. When a webhook arrives (orders/create or orders/paid), the backend must:

1. Detect and skip INTERNAL_MARKER items so they are never persisted as ScanHistory records.
2. Parse any INTENT_* SKUs to derive a `LogisticIntention`.
3. Parse any FLAG_* SKUs to derive boolean flags (e.g. `fixItem`).
4. After the real items are persisted, apply the resolved intention and flags to every ScanHistory record in that order via the existing `markLogisticIntentionCommand`.

---

## Marker item contract (Shopify side)

A line item is an internal marker when its `itemType` field (Shopify product type) equals `INTERNAL_MARKER`.

**Intent SKUs** — map directly to `LogisticIntention`:

| Shopify SKU                    | `LogisticIntention` enum value |
|-------------------------------|-------------------------------|
| `INTENT_STORE_PICKUP`          | `store_pickup`                |
| `INTENT_LOCAL_DELIVERY`        | `local_delivery`              |
| `INTENT_INTERNATIONAL_SHIPPING`| `international_shipping`      |
| `INTENT_CUSTOMER_TOOK_IT`      | `customer_took_it`            |

**Flag SKUs** — map to item-level boolean fields:

| Shopify SKU        | Effect              |
|--------------------|---------------------|
| `FLAG_NEEDS_FIXING` | `fixItem = true`   |

Rules:
- At most one INTENT_* SKU is expected per order. If multiple are present, take the first one.
- Multiple FLAG_* SKUs may be present simultaneously.
- An order with only flags (no intent SKU) applies flags with `intention` left unchanged (null on new items).
- Marker items are completely invisible to the rest of the system — no ScanHistory record is created for them.

---

## Goals

1. Parse markers from order line items in a pure, easily-extended lookup table.
2. Filter INTERNAL_MARKER items out of the normal product-processing loop in both webhook commands.
3. After real items are persisted, apply resolved markers by reusing `markLogisticIntentionCommand`.
4. Keep each concern in its own file so adding a new SKU or flag requires touching exactly one lookup table.

---

## New files to create

### 1. `src/modules/shopify/domain/order-marker.ts`

Pure domain module — no I/O.

```ts
import type { LogisticIntention } from "../../logistic/contracts/logistic.contract.js";

export const INTERNAL_MARKER_TYPE = "INTERNAL_MARKER";

const INTENT_SKU_MAP: Record<string, LogisticIntention> = {
  INTENT_STORE_PICKUP: "store_pickup",
  INTENT_LOCAL_DELIVERY: "local_delivery",
  INTENT_INTERNATIONAL_SHIPPING: "international_shipping",
  INTENT_CUSTOMER_TOOK_IT: "customer_took_it",
};

const FLAG_SKU_FIXITEM = new Set(["FLAG_NEEDS_FIXING"]);

export type ParsedOrderMarkers = {
  intention: LogisticIntention | null;
  fixItem: boolean;
};

export type MarkerLineItem = {
  product_type?: string | null;
  sku?: string | null;
};

export function parseOrderMarkers(
  lineItems: MarkerLineItem[],
): ParsedOrderMarkers {
  let intention: LogisticIntention | null = null;
  let fixItem = false;

  for (const item of lineItems) {
    if (item.product_type !== INTERNAL_MARKER_TYPE) continue;

    const sku = item.sku ?? "";

    if (!intention && sku in INTENT_SKU_MAP) {
      intention = INTENT_SKU_MAP[sku];
    }

    if (FLAG_SKU_FIXITEM.has(sku)) {
      fixItem = true;
    }
  }

  return { intention, fixItem };
}

export function isInternalMarker(item: MarkerLineItem): boolean {
  return item.product_type === INTERNAL_MARKER_TYPE;
}
```

> To add a new intent: add one entry to `INTENT_SKU_MAP`.
> To add a new flag that maps to a different field: add a new `Set` and a new boolean result field to `ParsedOrderMarkers`.

---

### 2. `src/modules/shopify/services/apply-order-markers.service.ts`

Orchestrates the post-persistence step.

```ts
import { prisma } from "../../../shared/database/prisma-client.js";
import { markLogisticIntentionCommand } from "../../logistic/commands/mark-logistic-intention.command.js";
import type { ParsedOrderMarkers } from "../domain/order-marker.js";
import { logger } from "../../../shared/logging/logger.js";

const MARKER_ACTOR = "system:shopify-marker";

export async function applyOrderMarkersService(input: {
  shopId: string;
  orderId: string;
  markers: ParsedOrderMarkers;
}): Promise<void> {
  const { shopId, orderId, markers } = input;

  if (!markers.intention && !markers.fixItem) return;

  const items = await prisma.scanHistory.findMany({
    where: { shopId, orderId, isSold: true, logisticsCompletedAt: null },
    select: { id: true },
  });

  if (items.length === 0) {
    logger.warn("applyOrderMarkersService: no eligible items found", {
      shopId,
      orderId,
    });
    return;
  }

  for (const item of items) {
    if (markers.intention) {
      await markLogisticIntentionCommand({
        shopId,
        username: MARKER_ACTOR,
        payload: {
          scanHistoryId: item.id,
          intention: markers.intention,
          fixItem: markers.fixItem,
          fixNotes: undefined,
          scheduledDate: undefined,
        },
      });
    } else if (markers.fixItem) {
      // Only flags, no intention — update fixItem directly without marking intention
      await prisma.scanHistory.update({
        where: { id: item.id },
        data: { fixItem: true },
      });
    }
  }

  logger.info("applyOrderMarkersService: markers applied", {
    shopId,
    orderId,
    intention: markers.intention,
    fixItem: markers.fixItem,
    itemCount: items.length,
  });
}
```

---

## Files to modify

### 3. `src/modules/shopify/commands/handle-orders-paid-webhook.command.ts`

**Step A — import the new modules** at the top:

```ts
import { parseOrderMarkers, isInternalMarker } from "../domain/order-marker.js";
import { applyOrderMarkersService } from "../services/apply-order-markers.service.js";
```

**Step B — parse markers before the product loop** (after `salesChannel` is resolved):

```ts
const markers = parseOrderMarkers(input.payload.line_items);
```

**Step C — skip internal markers inside the line-item loop**:

```ts
for (const lineItem of input.payload.line_items) {
  if (isInternalMarker(lineItem)) continue;   // <-- add this guard
  if (!lineItem.product_id) continue;
  // ... rest of existing deduplication logic unchanged ...
}
```

**Step D — apply markers after all items are persisted** (before the webhook delivery log write):

```ts
if (processedProducts > 0) {
  await applyOrderMarkersService({ shopId: input.shopId, orderId, markers });
}
```

The `skippedProducts` count should NOT count marker items — only products with no `product_id`. Adjust the skip counter accordingly if needed.

---

### 4. `src/modules/shopify/commands/handle-orders-create-webhook.command.ts`

Apply the exact same four-step change as above (the two commands are structurally identical at this point).

---

### 5. `src/modules/shopify/contracts/shopify.contract.ts` (if needed)

The `line_items` array type must include `product_type`. Check whether `ShopifyOrdersPaidWebhookPayload` / `ShopifyOrdersCreateWebhookPayload` already has this field. If not, add it:

```ts
product_type?: string | null;
```

to the line item interface inside those payload types.

---

## Data flow summary

```
Shopify webhook payload arrives
        │
        ▼
parseOrderMarkers(line_items)
  → { intention: "local_delivery", fixItem: false }
        │
        ▼
Filter out isInternalMarker items from processing loop
        │
        ▼
Existing flow: appendSoldTerminalEventWithFallback for each real product
        │
        ▼
applyOrderMarkersService(shopId, orderId, markers)
  → queries ScanHistory by orderId+shopId
  → calls markLogisticIntentionCommand per item
        │
        ▼
markLogisticIntentionCommand (existing)
  → updates intention + fixItem on ScanHistory
```
