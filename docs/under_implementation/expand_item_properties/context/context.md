# Item Properties — Current System Context

This document captures how the `properties` field on a scanned item (`ScanHistory.properties`) is obtained from Shopify, stored, and consumed today. It's meant as seed context for planning an expansion of this system (adding more properties, making them more structured, etc.) — it is descriptive, not prescriptive.

Backend root: `apps/backend`. Frontend root: `apps/frontend`.

## 1. What "properties" is

`properties` is a small, flat, free-form JSON bag of string key/value pairs attached to a `ScanHistory` record. It is **not** a generic Shopify property mirror — it only captures a fixed, hand-declared list of specific Shopify product metafields. Today that list has exactly two entries.

Declared in `apps/backend/src/modules/shopify/domain/shopify-metafield-properties.ts:8-22`:

```ts
export const SHOPIFY_SCAN_HISTORY_PROPERTY_METAFIELDS = [
  { alias: "extensionTypeMeta",     namespace: "custom", key: "extension_type",     propertyKey: "extension_type" },
  { alias: "extensionQuantityMeta", namespace: "custom", key: "extension_quantity", propertyKey: "extension_quantity" },
];
```

| propertyKey | Shopify metafield | Meaning (inferred) |
|---|---|---|
| `extension_type` | `custom.extension_type` | Some classification of a table's extension leaf/mechanism. Captured but **not read anywhere** (see §4). |
| `extension_quantity` | `custom.extension_quantity` | Number of extension leaves. Drives a UI quantity-pill override for tables (see §4). |

## 2. How properties are obtained (Shopify → backend)

`shopify-metafield-properties.ts` provides two functions that bracket the fetch:

- `buildShopifyPropertyMetafieldSelection()` (`shopify-metafield-properties.ts:24-29`) — generates the GraphQL fragment that requests each declared metafield, aliased (e.g. `extensionTypeMeta: metafield(namespace: "custom", key: "extension_type") { value }`). This is spliced into the product GraphQL queries in `apps/backend/src/modules/shopify/integrations/shopify-admin-api.integration.ts` (used at the type level around lines 59, 421, 538, 635, and interpolated into the query strings alongside the other metafield selections like `itemHeight`, `itemCategoryMeta`, etc.).
- `extractShopifyScanHistoryProperties(metafieldsByAlias)` (`shopify-metafield-properties.ts:31-49`) — takes the raw GraphQL response object (keyed by alias), trims each value, and only includes non-empty values in the output. If **no** declared metafield has a value, it returns `null` (not `{}`), so an item with no extension attributes has `properties: null` end-to-end.

This extraction is invoked in `shopify-admin-api.integration.ts:454-455` as part of building the resolved product object (the same function that resolves `itemCategory` via `categoryResolverService` and dimensions via `parseDimensionCm` — see the `refactor_item_category` context doc for that sibling pipeline). The resulting `properties: Record<string, string> | null` becomes a field on the shop/product DTO (`apps/backend/src/modules/shopify/domain/shopify-shop.ts:15`) and on `UnifiedItemLocationResultDto`-style contracts (`apps/backend/src/modules/shopify/contracts/shopify.contract.ts:224`).

There is a **single point of truth** for "which metafields count as properties" — the `SHOPIFY_SCAN_HISTORY_PROPERTY_METAFIELDS` array. Every GraphQL query that needs properties re-splices `buildShopifyPropertyMetafieldSelection()`, so adding a new metafield to the array automatically flows into every query that uses the helper — but any query that instead hand-rolled its own metafield block (worth checking during the expansion work) would not pick it up.

## 3. How properties get stored

`properties` lives as a `Prisma.Json` column on `ScanHistory` (see `prisma/schema.prisma`, `ScanHistory` model). It is written/read at several layers:

### 3.1 Domain type
`apps/backend/src/modules/scanner/domain/scan-history.ts:65` — `properties: Record<string, unknown> | null`.

### 3.2 Write contract (internal, not a public HTTP body)
`apps/backend/src/modules/scanner/contracts/scan-history.contract.ts:158` validates incoming properties as:
```ts
properties: z.record(z.string(), z.string().trim().min(1)).optional()
```
i.e. a flat string→non-empty-string map. This is the shape enforced whenever `scanHistoryRepository.appendLocationEvent` / create paths are called — it's an internal command-input contract, not a schema exposed on a public REST endpoint for manually editing properties.

### 3.3 Repository persistence
`apps/backend/src/modules/scanner/repositories/scan-history.repository.ts` is where `properties` actually gets written to Postgres via Prisma. Key points:
- `resolvePropertiesForCreate(input.properties)` — used at record-creation time (lines ~493, ~857) to decide the `properties` value to persist on `create`.
- On updates/patches (lines ~658-678, ~1062-1123, ~1470-1510), the repository compares `existing.properties` against `input.properties` and only includes `properties` in the Prisma `update` payload if it actually changed — this is a general "diff before writing" pattern used across several `ScanHistory` fields, not unique to properties.
- `normalizeStoredProperties(record.properties)` (referenced around lines 272-275, 1473) — guards that a value read back from Postgres (`Prisma.JsonValue`) is actually a non-array object before treating it as a properties record, since JSON columns can technically hold anything.

### 3.3 Propagation into other write paths
`properties` is threaded through, unchanged in shape, wherever a resolved Shopify product feeds a `ScanHistory` write:
- `apps/backend/src/modules/shopify/commands/update-item-location.command.ts:131` — scan-time resolution path (`properties: after.properties ?? undefined`).
- `apps/backend/src/modules/shopify/commands/handle-orders-create-webhook.command.ts:186` and `handle-orders-paid-webhook.command.ts:164` — order webhook paths (`properties: productSnapshot?.properties ?? null`).
- `apps/backend/src/modules/shopify/jobs/process-products-update-webhook.job.ts:144, 184, 200` — the Shopify product-update webhook sync job also re-writes `properties` from the freshly-fetched product whenever it touches a `ScanHistory` row.

So, similar to `itemCategory`, properties get (re-)synced from Shopify at scan time, at order time, and on product-update webhooks — there is no single chokepoint; each write path independently decides to include the freshly-fetched `properties`.

### 3.4 Read/exposure
`apps/backend/src/modules/shopify/queries/search-unified-items.query.ts` is the main query that returns `properties` to callers (both frontend-facing and internal). It defines a local guard:
```ts
const toPropertiesObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};
```
used at lines 80 and 132 to safely coerce the stored `Prisma.JsonValue` into a typed object before it goes out over the API — this is the read-side counterpart of `normalizeStoredProperties` in the repository.

## 4. HTTP endpoints that surface properties to the frontend

Yes — `properties` reaches the frontend on most item-shaped API responses, **regardless of whether anything reads it**, because it rides along as a field on `ScanHistoryRecord` / the unified item DTOs rather than being selected per-endpoint. This was not previously documented anywhere in the codebase (no OpenAPI/Swagger spec or route-level doc comments exist for these routes — the route files and controllers are the only source of truth). Router mount prefixes: `app.use("/shopify", shopifyRouter)`, `/scanner`, `/stats`, `/logistic` (also duplicated under `/api/*`) — see `apps/backend/src/server.ts:127-143`.

**Endpoints that DO include `properties` in the response body:**

| Method & path | Controller | Backing query | Notes |
|---|---|---|---|
| `GET /shopify/items/by-sku` | `shopifyController.queryBySku` (`shopify.controller.ts:379`) | `searchUnifiedItemsQuery` | Returns `{ items, count }`, each item has `properties`. |
| `GET /scanner/history` | `scannerController.getHistory` | `getScanHistoryQuery` → `ScanHistoryPage.items[]` | Full `ScanHistoryRecord[]`, includes `properties` per item. |
| `GET /scanner/history/:productId` | `scannerController.getHistoryItem` | `getScanHistoryItemQuery` | Full `ScanHistoryRecord`, includes `properties`. |
| `GET /scanner/history/item` | `scannerController.getHistoryItemByQuery` | `getScanHistoryItemQuery` | Same as above. |
| `GET /logistic/items` | `logisticController.getItems` | `get-logistic-items.query.ts:161` | `properties: toPropertiesObject(record.properties)` explicitly selected. |
| `GET /stats/items` | `getStatsItemsController` | `get-stats-items.query.ts` → `stats-items.domain.ts:8` | Item domain type declares `properties: Record<string, unknown> | null`. |
| `PATCH/POST /shopify/items/location` | `shopifyController.updateLocationByIdentifier` | `updateItemLocationCommand` | Response includes `historyItem` (full `ScanHistoryRecord`, has `properties`); the sibling `product` object does **not** (see below). |
| `PATCH /shopify/products/:productId/location` | `shopifyController.updateLocation` | `updateItemLocationCommand` | Same as above — `historyItem.properties` present, `product.properties` absent. |

**Endpoints that do NOT include `properties`:**

| Method & path | Controller | Why not |
|---|---|---|
| `GET /shopify/products/:productId` | `shopifyController.getProduct` | `getProductQuery` (`get-product.query.ts:33-46`) manually constructs `ShopifyProductLocationDto` and simply omits `properties` from the returned object — the underlying `shopifyAdminApi.getProductWithLocation()` call fetches it, it's just not projected into this DTO. |
| `product` field on the two `updateLocation*` responses above | same commands | `update-item-location.command.ts:168-183` builds the `product` object field-by-field and likewise omits `properties` (and omits it from `ShopifyProductLocationDto` generally) — only the `historyItem` alongside it carries `properties`. |

So the pattern is: **any response shaped as a full `ScanHistoryRecord` or a unified/logistic/stats "item" carries `properties`; any response shaped as the narrower `ShopifyProductLocationDto` (raw Shopify product view) does not.** These two DTO shapes are maintained by hand in parallel (`shopify.contract.ts` for `ShopifyProductLocationDto`/`UnifiedItemSearchResultDto` vs. `scan-history.ts` for `ScanHistoryRecord`), so there's no single mechanism guaranteeing they stay consistent — a future field added to one won't automatically appear in the other.

## 5. Where properties are currently consumed

### 4.1 Backend
Properties are **not branched on** anywhere in backend business logic today — every backend touchpoint either fetches, stores, diffs, or passes through the value. There is no server-side code that reads `extension_type` or `extension_quantity` to make a decision (compare with the `dining_chair` category special-case in `shopify-admin-api.integration.ts:361`, which *is* a backend-side business rule — properties have no equivalent today).

### 4.2 Frontend
There is exactly **one** consumption point: `apps/frontend/src/features/item-scan-history/ui/ItemQuantityPill.tsx`.

- `resolveExtensionQuantity(properties)` (lines 70-86) reads `properties.extension_quantity`, coerces it to a number, and treats it as valid only if finite and `> 0`.
- `resolveItemQuantityPillProps({ quantity, itemCategory, properties })` (lines 42-68): if `itemCategory` (case-insensitively) contains `"table"` **and** a valid `extension_quantity` is present, it overrides the pill to show the extension quantity instead of the scan `quantity`, with label prefix `"ext "` and a `"table"` category match instead of the component's default `"chair"` match.
- `ItemQuantityPill` itself (lines 15-40) is a small presentational badge: it renders `+{quantity}` (or `ext {quantity}`) but **only if** `itemCategory` matches `categoryMatch` (default `"chair"`, overridden to `"table"` by the resolver above). So the pill is itself category-gated on top of the extension-quantity override being category-gated.
- `extension_type` has **no reader anywhere in the frontend** — it is fetched and stored but currently inert.

`properties` (the whole object, untyped beyond `Record<string, unknown> | null`) is threaded from the API response into `resolveItemQuantityPillProps` from five call sites, all passing `item.properties` / `selectedItem.properties` straight through with no intermediate transformation:
- `apps/frontend/src/features/unified-scanner/ui/UnifiedLocationScanPage.tsx:47`
- `apps/frontend/src/features/unified-scanner/ui/UnifiedItemManualInputPanel.tsx:128`
- `apps/frontend/src/features/item-scan-history/ui/ItemScanHistoryCard.tsx:32`
- `apps/frontend/src/features/logistic-tasks/ui/LogisticTasksCard.tsx:53`
- `apps/frontend/src/features/analytics/components/items/StatsItemCard.tsx:86`

These are the item cards across the scanner, logistics, and analytics surfaces of the app — i.e. properties reach every place an item is rendered as a card, but only `extension_quantity` on `"table"`-categorized items actually changes what's rendered.

Frontend types treat `properties` generically (`Record<string, unknown> | null`), not with named `extension_type`/`extension_quantity` fields — see `item-scan-history.types.ts`, `item-scan-history.dto.ts`, `unified-scanner.types.ts`, `logistic-tasks.types.ts`, `logistic-tasks.dto.ts`, `stats-items.types.ts`. None of these types encode the specific known property keys; they all just pass an untyped bag through to `ItemQuantityPill`.

## 6. Summary of the pipeline

```
Shopify metafields (custom.extension_type, custom.extension_quantity)
  → buildShopifyPropertyMetafieldSelection() adds them to GraphQL product queries
  → shopify-admin-api.integration.ts fetches + extractShopifyScanHistoryProperties() trims/filters
  → propagated into ScanHistory.properties via 3 independent write paths:
      - update-item-location.command.ts (scan-time)
      - handle-orders-create/paid-webhook.command.ts (order-time)
      - process-products-update-webhook.job.ts (Shopify product-edit sync)
  → scan-history.repository.ts persists (create) / diffs-and-persists (update) to the Json column
  → search-unified-items.query.ts reads it back, coerced via toPropertiesObject()
  → frontend item cards pass `item.properties` into ItemQuantityPill.resolveItemQuantityPillProps()
  → only extension_quantity (gated on itemCategory containing "table") changes rendered output;
    extension_type is stored but unused.
```

## 7. Open questions / expansion risk areas

These are observations, not recommendations — meant to seed your own thinking before planning the expansion:

- **Single declaration list, but not the only place shape is assumed.** `SHOPIFY_SCAN_HISTORY_PROPERTY_METAFIELDS` is the one place to add a new metafield for *fetching*, but consumption (`ItemQuantityPill`) hardcodes the specific key `extension_quantity` and a specific category substring match (`"table"`). Adding a new property won't automatically produce any UI — each new property will need its own explicit consumer, same as `extension_quantity` did.
- **`extension_type` is already dead code from the consumption side.** Worth deciding whether the expansion should finally use it, replace it, or drop it — right now it's fetched, resolved, stored, and threaded through every write path for no behavioral effect.
- **Properties are string-only by contract** (`z.record(z.string(), z.string().trim().min(1))`), even though `extension_quantity` is immediately parsed back into a number on the frontend. If new properties need richer types (numbers, booleans, enums), the current all-string contract and the "trim + treat empty as absent" extraction logic would need to change.
- **No shared "known property keys" enum/type** exists between backend and frontend — the backend declares keys in a plain array, the frontend accesses them by string literal (`properties?.extension_quantity`) with no compile-time link to the backend's declared list. A key rename on one side wouldn't be caught by the type system.
- **Three independent write paths, no single sync chokepoint** — same shape of risk as documented for `itemCategory` in the `refactor_item_category` context doc: scan-time, order-time, and product-update-webhook paths each independently decide whether/how to refresh `properties`, so drift between paths is possible if one is changed without the others.
- **`null` vs `{}` semantics**: absence of all declared metafields yields `properties: null`, not an empty object — any new consumer needs to handle both `null` and a partially-populated object, not assume a key is always present when the object exists.
- **`properties` surfaces wherever the response shape happens to be `ScanHistoryRecord`-like, not by deliberate per-endpoint choice** (see §4) — that means new properties will automatically appear in most item list/detail responses without any endpoint change, but the two `ShopifyProductLocationDto`-shaped responses (`getProduct`, and the `product` half of `updateLocation*`) will silently keep omitting them unless someone remembers to add the field there too.
- **Category-gating is duplicated logic**: `ItemQuantityPill` checks `itemCategory` twice (once inside `resolveItemQuantityPillProps` to decide whether to override, once inside the component itself to decide whether to render at all) — an expansion that adds more property-driven UI variants should decide whether to generalize this gating rather than repeat it per property.
