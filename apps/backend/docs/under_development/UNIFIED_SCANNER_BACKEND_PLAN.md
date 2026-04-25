# Unified Scanner Backend — Implementation Plan

**Status:** READY FOR CODEX  
**Scope:** Two targeted changes across the `shopify` and `logistic` modules. No schema migrations, no new routes. All changes are backwards-compatible additive enrichments or relaxed constraints.

---

## 1. Goal

1. **`GET /shopify/items/by-sku`** — Search ScanHistory first (by SKU or barcode); fall back to Shopify GraphQL if no records found. Enrich every result with logistic fields (`id`, `isSold`, `intention`, `fixItem`, `isItemFixed`). Items from the Shopify fallback receive `null` for all logistic fields.

2. **`POST /logistic/placements`** — Accept items that have no intention set yet. If intention is null, derive it from the placed location's `zoneType` using a map, then persist the derived value. Include the final ScanHistory state (`intention`, `fixItem`, `isItemFixed`) in the response.

---

## 2. Existing Behavior Reference

### `GET /shopify/items/by-sku`

Route → `shopifyController.queryBySku`  
Current call chain: `searchProductsBySkuQuery` → `shopifyAdminApi.searchProductsBySku`

The Shopify integration already runs: `sku:*value* OR barcode:*value*` against the GraphQL API. Barcode search in the Shopify layer is already correct and must not change.

Current response shape (`ShopifySkuSearchItemDto`):
```typescript
{
  productId: string;
  title: string;
  imageUrl: string | null;
  sku: string;
  barcode: string | null;
}
```

---

### `POST /logistic/placements`

Route → `logisticController.markPlacement` → `markLogisticPlacementCommand`

The command currently fetches `ScanHistory` with the guard:
```typescript
where: {
  id: payload.scanHistoryId,
  shopId,
  isSold: true,
  intention: { not: null },   // ← blocks items without intention
}
```

If the record is not found (including when intention is null), it throws `NotFoundError("Sold item with intention not found for this shop")`.

Current response shape:
```typescript
{
  scanHistoryId: string;
  lastLogisticEventType: string;
  logisticLocationId: string;
}
```

---

## 3. Change 1 — Enriched SKU/Barcode Search

### 3.1 New response type

**File:** `apps/backend/src/modules/shopify/contracts/shopify.contract.ts`

Add a new DTO type alongside `ShopifySkuSearchItemDto`. Do **not** remove the existing type.

```typescript
import type { LogisticIntention } from "../../logistic/domain/logistic.domain.js";

export type UnifiedItemSearchResultDto = {
  productId: string;
  title: string;
  imageUrl: string | null;
  sku: string;
  barcode: string | null;
  // Logistic enrichment (null when item has no ScanHistory record):
  id: string;                           // ScanHistory.id ("" when from Shopify fallback)
  isSold: boolean;
  intention: LogisticIntention | null;
  fixItem: boolean;
  isItemFixed: boolean;
  currentPosition: string | null;       // ScanHistory.latestLocation; null for Shopify fallback items
};
```

---

### 3.2 New ScanHistory lookup method

**File:** `apps/backend/src/modules/scanner/repositories/scan-history.repository.ts`

Add a new method to `scanHistoryRepository`. The method queries only the fields needed for the unified search response — no `events` or `priceHistory` includes (lighter query than `listByShopPaginated`).

```typescript
async findBySkuOrBarcode(input: {
  shopId: string;
  value: string;
  limit: number;
}): Promise<Array<{
  id: string;
  productId: string;
  itemSku: string | null;
  itemBarcode: string | null;
  itemImageUrl: string | null;
  itemTitle: string;
  latestLocation: string | null;
  isSold: boolean;
  intention: LogisticIntention | null;
  fixItem: boolean | null;
  isItemFixed: boolean;
}>>
```

Implementation:

```typescript
const normalizedValue = input.value.trim().toLowerCase();

return prisma.scanHistory.findMany({
  where: {
    shopId: input.shopId,
    OR: [
      { itemSku: { contains: normalizedValue } },
      { itemBarcode: { contains: normalizedValue } },
    ],
  },
  select: {
    id: true,
    productId: true,
    itemSku: true,
    itemBarcode: true,
    itemImageUrl: true,
    itemTitle: true,
    latestLocation: true,
    isSold: true,
    intention: true,
    fixItem: true,
    isItemFixed: true,
  },
  orderBy: { lastModifiedAt: "desc" },
  take: input.limit,
});
```

> **Note on case sensitivity:** SQLite `LIKE` (used by Prisma `contains`) is case-insensitive for ASCII characters by default, which is sufficient here.

---

### 3.3 New unified search query

**File:** `apps/backend/src/modules/shopify/queries/search-unified-items.query.ts`  
(New file — replaces the role of `search-products-by-sku.query.ts` for the unified scanner endpoint.)

```typescript
import { scanHistoryRepository } from "../../scanner/repositories/scan-history.repository.js";
import { searchProductsBySkuQuery } from "./search-products-by-sku.query.js";
import { shopRepository } from "../repositories/shop.repository.js";
import { NotFoundError } from "../../../shared/errors/http-errors.js";
import type { UnifiedItemSearchResultDto } from "../contracts/shopify.contract.js";

export const searchUnifiedItemsQuery = async (input: {
  shopId: string;
  value: string;
  limit?: number;
}): Promise<UnifiedItemSearchResultDto[]> => {
  const limit = input.limit ?? 10;

  // ── Step 1: ScanHistory-first lookup ──────────────────────────────────────
  const historyRecords = await scanHistoryRepository.findBySkuOrBarcode({
    shopId: input.shopId,
    value: input.value,
    limit,
  });

  if (historyRecords.length > 0) {
    return historyRecords.map((record) => ({
      productId: record.productId,
      title: record.itemTitle,
      imageUrl: record.itemImageUrl ?? null,
      sku: record.itemSku ?? "",
      barcode: record.itemBarcode ?? null,
      id: record.id,
      isSold: record.isSold,
      intention: record.intention ?? null,
      fixItem: record.fixItem ?? false,
      isItemFixed: record.isItemFixed,
      currentPosition: record.latestLocation ?? null,
    }));
  }

  // ── Step 2: Shopify GraphQL fallback ──────────────────────────────────────
  // searchProductsBySkuQuery already handles shop lookup and Shopify API call.
  const shopifyItems = await searchProductsBySkuQuery({
    shopId: input.shopId,
    sku: input.value,
  });

  return shopifyItems.map((item) => ({
    productId: item.productId,
    title: item.title,
    imageUrl: item.imageUrl ?? null,
    sku: item.sku,
    barcode: item.barcode ?? null,
    id: "",           // no ScanHistory record
    isSold: false,
    intention: null,
    fixItem: false,
    isItemFixed: false,
    currentPosition: null,
  }));
};
```

---

### 3.4 Update the controller handler

**File:** `apps/backend/src/modules/shopify/controllers/shopify.controller.ts`

In `queryBySku`, replace the call to `searchProductsBySkuQuery` with `searchUnifiedItemsQuery`. The query param name (`sku`) and the schema (`QueryBySkuSchema`) stay unchanged — the param now semantically accepts both SKU values and barcode values but the key name does not need to change.

```typescript
// Add import:
import { searchUnifiedItemsQuery } from "../queries/search-unified-items.query.js";

// Replace in queryBySku handler:
const items = await searchUnifiedItemsQuery({
  shopId: req.authUser.shopId as string,
  value: input.sku,
});
```

The response envelope `{ items, count: items.length }` stays the same.

---

## 4. Change 2 — Placement with Intent Auto-Derivation

### 4.1 Zone-type-to-intention map

**File:** `apps/backend/src/modules/logistic/domain/logistic.domain.ts`

Add the map to the existing domain file:

```typescript
// Maps a LogisticZoneType to the default LogisticIntention to assign when
// a scan history record has no intention set at the time of placement.
// for_delivery covers both domestic (local_delivery) and international
// shipments; local_delivery is used as the auto-assignment default since it
// is the more common case. for_fixing has no meaningful default — leave null.
export const ZONE_TYPE_DEFAULT_INTENTION: Partial<Record<LogisticZoneType, LogisticIntention>> = {
  for_delivery: "local_delivery",
  for_pickup:   "store_pickup",
  // for_fixing → omitted (no default; remains null)
};
```

---

### 4.2 Update placement command

**File:** `apps/backend/src/modules/logistic/commands/mark-logistic-placement.command.ts`

**Return type change:**

```typescript
Promise<{
  scanHistoryId: string;
  lastLogisticEventType: string;
  logisticLocationId: string;
  // Newly added — reflects the ScanHistory state after any intention derivation:
  intention: LogisticIntention | null;
  fixItem: boolean;
  isItemFixed: boolean;
}>
```

**Prisma query change** — remove the `intention: { not: null }` condition and relax the error message:

```typescript
// Before:
const scanHistory = await prisma.scanHistory.findFirst({
  where: {
    id: input.payload.scanHistoryId,
    shopId: input.shopId,
    isSold: true,
    intention: { not: null },          // ← remove this line
  },
  select: {
    id: true,
    orderId: true,
    itemSku: true,
    fixItem: true,
    logisticsCompletedAt: true,
  },
});

if (!scanHistory) {
  throw new NotFoundError("Sold item with intention not found for this shop");  // ← update message
}

// After:
const scanHistory = await prisma.scanHistory.findFirst({
  where: {
    id: input.payload.scanHistoryId,
    shopId: input.shopId,
    isSold: true,
    // intention is no longer required — it is auto-derived from zoneType when null
  },
  select: {
    id: true,
    orderId: true,
    itemSku: true,
    fixItem: true,
    isItemFixed: true,       // ← add to select
    intention: true,         // ← add to select (needed to check if null)
    logisticsCompletedAt: true,
  },
});

if (!scanHistory) {
  throw new NotFoundError("Sold item not found for this shop");
}
```

**Intention derivation** — add after the `logisticsCompletedAt` guard:

```typescript
import { ZONE_TYPE_DEFAULT_INTENTION } from "../domain/logistic.domain.js";
import type { LogisticIntention } from "../domain/logistic.domain.js";

// Derive intention from zoneType if not set
let finalIntention: LogisticIntention | null = scanHistory.intention ?? null;

if (finalIntention === null) {
  const derived = ZONE_TYPE_DEFAULT_INTENTION[location.zoneType] ?? null;
  if (derived !== null) {
    await prisma.scanHistory.update({
      where: { id: scanHistory.id },
      data: { intention: derived },
    });
    finalIntention = derived;
  }
}
```

This update runs inside the same function, **before** the `logisticEventRepository.appendEvent(...)` call so the intention is persisted before the event is logged.

**Return value change** — enrich the returned object:

```typescript
// Before:
return {
  scanHistoryId: scanHistory.id,
  lastLogisticEventType: "placed",
  logisticLocationId: input.payload.logisticLocationId,
};

// After:
return {
  scanHistoryId: scanHistory.id,
  lastLogisticEventType: "placed",
  logisticLocationId: input.payload.logisticLocationId,
  intention: finalIntention,
  fixItem: scanHistory.fixItem ?? false,
  isItemFixed: scanHistory.isItemFixed,
};
```

---

## 5. Implementation Order for Codex

```
1. logistic/domain/logistic.domain.ts
     — Add ZONE_TYPE_DEFAULT_INTENTION map

2. scanner/repositories/scan-history.repository.ts
     — Add findBySkuOrBarcode method

3. shopify/contracts/shopify.contract.ts
     — Add UnifiedItemSearchResultDto type

4. shopify/queries/search-unified-items.query.ts
     — New file: ScanHistory-first with Shopify fallback

5. shopify/controllers/shopify.controller.ts
     — Import searchUnifiedItemsQuery; update queryBySku call

6. logistic/commands/mark-logistic-placement.command.ts
     — Relax intention guard; derive intention from zoneType; enrich response
```

---

## 6. Existing Files — NOT Changed

- `shopify/queries/search-products-by-sku.query.ts` — left intact, still used by `searchUnifiedItemsQuery` as the fallback
- `shopify/contracts/shopify.contract.ts` — `ShopifySkuSearchItemDto` is preserved (still returned by the existing Shopify-only query used in other contexts)
- `logistic/contracts/logistic.contract.ts` — no schema changes; the `MarkPlacementInput` is unchanged
- `logistic/controllers/logistic.controller.ts` — no changes needed; controller passes result through as-is
- No Prisma schema migrations required — all fields (`intention`, `fixItem`, `isItemFixed`) already exist

---

## 7. Decision Log

| # | Question | Decision |
|---|---|---|
| D1 | Keep `sku` query param name? | Yes — frontend already uses `?sku=value`; param name doesn't need to change, semantics are broadened to include barcode values |
| D2 | ScanHistory match strategy (exact vs contains)? | `contains` (case-insensitive) — mirrors the Shopify GraphQL `*value*` strategy; enables partial manual search without a separate endpoint |
| D3 | Which intention to assign for `for_delivery`? | `local_delivery` — listed first, most common domestic case; `international_shipping` is also associated with the zone but cannot be auto-assigned without order context |
| D4 | `for_fixing` auto-assignment? | No default intention — `for_fixing` items need an explicit intention set by a user; the command proceeds with `intention = null` and persists no update |
| D5 | Intention update inside the command transaction? | Not wrapped in a DB transaction with the event append — a simple sequential `update` then `appendEvent` is sufficient; if the event append fails the intention update will have already committed (acceptable; the item can be re-placed) |
| D6 | Preserve existing `ShopifySkuSearchItemDto`? | Yes — other code paths (e.g. resolve-product-id, stats) still use `searchProductsBySkuQuery` directly |
| D7 | `id` field for Shopify fallback items? | Empty string `""` — consistent with the frontend plan's `UnifiedScannerItem.id = ""` for items with no history record |
