# Item Category / Type — Current System Context

Seed context for an intention plan around refactoring how item category/type is
stored and derived in the Item-Scanner-Shopify backend
(`apps/backend`). This is a factual snapshot of the system as it exists today,
not a proposal. All file paths are relative to `apps/backend` unless stated
otherwise.

## Overview: `itemType` vs `itemCategory`

These two fields live side by side on the same `ScanHistory` row and are
**semantically unrelated**, despite the similar names:

- **`itemType`** (`ScanHistory.itemType`, `String`, required) is **which
  identifier was used to resolve/scan the item** — one of `"product_id"`,
  `"handle"`, `"sku"`, `"barcode"`. It comes straight from
  `input.idType` on `updateItemLocationCommand`
  (`src/modules/shopify/commands/update-item-location.command.ts:137`) or is
  hardcoded to `"product_id"` for webhook-driven writes (product-update sync,
  order webhooks). It describes **how the scan resolved the product**, not
  what kind of product it is.
- **`itemCategory`** (`ScanHistory.itemCategory`, `String?`, nullable in the
  schema but never persisted as `null` in practice — see below) is the
  **resolved Shopify product category** — e.g. `"dining_chair"`,
  `"coffee_table"`, `"unknown"`. It drives category-level stats
  (`LocationCategoryStatsDaily`), search/filter UIs, and logistic item
  listings.

This distinction matters for the refactor because any redesign that
generalizes "category" or "type" terminology risks conflating these two
concepts, which currently have completely separate resolution pipelines,
storage semantics, and consumers.

---

## Data model

### `ScanHistory` (prisma/schema.prisma:114-175)

```prisma
model ScanHistory {
  id               String   @id @default(cuid())
  shopId           String
  userId           String?
  username         String
  productId        String
  itemCategory     String?
  itemSku          String?
  itemBarcode      String?
  itemImageUrl     String?
  itemType         String
  itemTitle        String
  itemHeight       Float?
  itemWidth        Float?
  itemDepth        Float?
  volume           Float?
  latestLocation   String?
  quantity         Int      @default(1)
  isSold           Boolean  @default(false)
  lastSoldChannel  SalesChannel?
  orderId              String?
  orderNumber          Int?
  intention            LogisticIntention?
  fixItem              Boolean?
  isItemFixed          Boolean  @default(false)
  fixNotes             String?
  scheduledDate        DateTime?
  lastLogisticEventType LogisticEventType?
  logisticLocationId   String?
  logisticsCompletedAt DateTime?
  restockedAt          DateTime?
  properties       Json?
  lastModifiedAt   DateTime @default(now())
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  events           ScanHistoryEvent[]
  priceHistory     ScanHistoryPrice[]
  ...
  @@unique([shopId, productId])
  @@index([shopId, itemCategory])
  @@index([shopId, itemType])
  ...
}
```

Key points:
- `itemCategory` is declared nullable (`String?`) in the schema, but every
  write path runs it through `normalizeCategory()` or
  `resolveCategoryForUpdate()` (both in `scan-history.repository.ts`), which
  always coalesce to the literal string `"unknown"` instead of `null`. In
  practice `itemCategory` is a non-null free-form string, just not enforced
  at the DB layer.
- `itemType` is a plain `String`, not an enum, and only 4 values are ever
  written in application code (`"product_id" | "handle" | "sku" | "barcode"`),
  enforced by a Zod schema (`ResolveItemIdTypeSchema`,
  `src/modules/shopify/contracts/shopify.contract.ts:39-44`), not by the DB.
- Both `itemCategory` and `itemType` have dedicated composite indexes
  (`@@index([shopId, itemCategory])` at schema.prisma:161,
  `@@index([shopId, itemType])` at schema.prisma:164).

### `LocationStatsDaily` (prisma/schema.prisma:276-286)

```prisma
model LocationStatsDaily {
  date                   DateTime
  location               String
  itemsSold              Int     @default(0) @map("items_sold")
  itemsReceived          Int     @default(0) @map("items_received")
  totalTimeToSellSeconds Float   @default(0) @map("total_time_to_sell_seconds")
  totalValuation         Float   @default(0) @map("total_valuation")

  @@id([date, location])
  @@map("location_stats_daily")
}
```

No category breakdown — keyed only by `[date, location]`.

### `LocationCategoryStatsDaily` (prisma/schema.prisma:288-298)

```prisma
model LocationCategoryStatsDaily {
  date                   DateTime
  location               String
  itemCategory           String
  itemsSold              Int   @default(0) @map("items_sold")
  totalRevenue           Float @default(0) @map("total_revenue")
  totalTimeToSellSeconds Float @default(0) @map("total_time_to_sell_seconds")

  @@id([date, location, itemCategory])
  @@map("location_category_stats_daily")
}
```

Keyed by `[date, location, itemCategory]`. `itemCategory` is `String`
(non-nullable at this table's level, always populated via
`normalizeCategory()` before upsert). No `itemType` field exists anywhere on
this table — category rollups are purely about product category, never scan
identifier type.

### Enums (prisma/schema.prisma:10-65)

None of the schema's enums model item type or item category. Full list, for
completeness:

```prisma
enum UserRole { admin manager worker seller }

enum ScanHistoryEventType {
  location_update
  unknown_position
  sold_terminal
  returned_to_store
}

enum ScanHistoryPriceTerminalType {
  unknown_position
  sold_terminal
  price_update
}

enum SalesChannel { webshop physical imported unknown }

enum WebhookIntakeStatus { pending processing processed failed }

enum LogisticIntention {
  customer_took_it
  store_pickup
  local_delivery
  international_shipping
}

enum LogisticEventType { marked_intention placed fulfilled }

enum LogisticZoneType { for_delivery for_pickup for_fixing }

enum OutboundEventType { item_placed }
```

`itemCategory` and `itemType` are both plain `String` columns — there is no
`ItemCategory` or `ItemType` enum in the database schema today. Any category
"vocabulary" that exists (the dictionary of canonical category names) lives
entirely in application code (see next section), not as a DB constraint.

---

## Category resolution pipeline

Two cooperating services live in `src/shared/category/`:

### `category-resolver.service.ts` (`src/shared/category/category-resolver.service.ts`)

```ts
export const categoryResolverService = {
  resolve(metafieldValue: string | null | undefined, title: string): string {
    const trimmed = metafieldValue?.trim();
    if (trimmed) {
      return trimmed;
    }
    const parsed = categoryParserService.parse(title);
    if (parsed) {
      return parsed;
    }
    return "unknown";
  },
};
```

Strict 3-step priority pipeline, no parsing logic of its own:
1. **Shopify metafield** `custom.productcategory` (queried as
   `itemCategoryMeta` in every product GraphQL query) — treated as the
   source of truth. Any non-empty trimmed value wins outright, verbatim
   (no validation against a known category list).
2. **Title-based parsing** via `categoryParserService.parse(title)` — only
   consulted when the metafield is empty/missing.
3. **`"unknown"`** — deterministic fallback, never `null`.

### `category-parser.service.ts` (`src/shared/category/category-parser.service.ts`)

```ts
export const categoryParserService = {
  parse(title: string): string | null {
    const normalized = title.toLowerCase().trim();
    if (!normalized) return null;
    for (const entry of categoryDictionaryProvider.getEntries()) {
      if (normalized.includes(entry.match)) {
        return entry.category;
      }
    }
    return null;
  },
};
```

Pure function: lowercases + trims the title, then does an ordered
substring-`includes` scan over a static dictionary, returning the first
match's canonical category (or `null` if nothing matches).

### `category-dictionary-provider.ts` + `category-dictionary.ts`

`category-dictionary-provider.ts` just exposes `CATEGORY_DICTIONARY` as
`getEntries()` (indirection intended for a future non-static source, per its
docstring — not currently used that way).

`category-dictionary.ts` is the actual data, explicitly documented as
"derived from Shopify smart collection TITLE CONTAINS rules." Full contents
(`src/shared/category/category-dictionary.ts:19-60`), in match order
(multi-word entries first, ordered longest-specific-match-first, then
single-word catch-alls):

| match (substring, lowercase) | category |
|---|---|
| `conference table` | `conference_table` |
| `chest of drawers` | `chest_of_drawers` |
| `chest of drawer` | `chest_of_drawers` |
| `serving trolley` | `serving_trolley` |
| `corner cabinet` | `corner_cabinet` |
| `nest of tables` | `nest_of_tables` |
| `bedside table` | `bedside_table` |
| `writing desk` | `writing_desk` |
| `sewing table` | `sewing_table` |
| `dining chair` | `dining_chair` |
| `dining table` | `dining_table` |
| `coffee table` | `coffee_table` |
| `plant stand` | `plant_stand` |
| `round table` | `dining_table` |
| `bar cabinet` | `bar_cabinet` |
| `small table` | `small_side_table` |
| `hall table` | `hall_table` |
| `of drawers` | `chest_of_drawers` |
| `side table` | `side_table` |
| `secretary` | `secretary_cabinet` |
| `armchairs` | `armchair` |
| `armchair` | `armchair` |
| `highboard` | `highboard` |
| `sideboard` | `sideboard` |
| `bookshelf` | `bookshelf` |
| `shelving` | `shelving` |
| `trolley` | `serving_trolley` |
| `cabinet` | `cabinet` |
| `chairs` | `dining_chair` |
| `chair` | `dining_chair` |
| `mirror` | `mirror` |
| `poster` | `poster` |
| `bench` | `bench` |
| `stool` | `stool` |
| `sofa` | `sofa` |
| `lamp` | `lamp` |

Notes baked into the file's own comments: keys are lowercase title
substrings; canonical values are snake_case singular; multiple keys may map
to the same canonical (synonyms/plurals, e.g. `chairs`/`chair` →
`dining_chair`); ordering is manually curated so longer/more specific
matches shadow shorter catch-alls (e.g. `corner cabinet` must precede
`cabinet`); generic terms and empty-condition Shopify collections
(`"chairs"`, `"sale"`, `"all products"`) were deliberately excluded when this
dictionary was derived. This is a **static, hand-maintained list** — there is
no admin UI or DB table backing it; adding a category means editing this
source file.

---

## Scan-time resolution flow

Entry point: `updateItemLocationCommand`
(`src/modules/shopify/commands/update-item-location.command.ts`), invoked
whenever a user scans/moves an item in the app.

1. `shopifyAdminApi.getProductWithLocation({ productId })`
   (`src/modules/shopify/integrations/shopify-admin-api.integration.ts:612-770`)
   fetches the product from the Shopify Admin GraphQL API, requesting (among
   other fields):
   - `itemCategoryMeta`: `metafield(namespace: "custom", key: "productcategory")`
   - `quantityMeta`: `metafield(namespace: "custom", key: "quantity")`
   - height/width/depth metafields, each requested via **4 aliases** per
     dimension to support a namespace/key fallback chain: `itemHeight`,
     `itemHeightAlt`, `itemHeightFallback`, `itemHeightAltFallback` (and the
     same pattern for width/depth) — see
     `shopify-admin-api.integration.ts:646-658`. In practice `heightKeyAlt`
     is currently set to the same value as `heightKey` (`"totalheight"`), so
     the "Alt" aliases are presently redundant with the primary ones; the
     `dimensionNamespaceFallback` (`"custom"`) aliases exist as a fallback if
     the configured `SHOPIFY_METAFIELD_NAMESPACE` env var differs from
     `"custom"`.
   - property metafields defined in `shopify-metafield-properties.ts` (see
     below).
2. The raw GraphQL node is mapped by
   `mapProductNodeToLocationSnapshot()` (`shopify-admin-api.integration.ts:404-507`):
   - `itemCategory = categoryResolverService.resolve(product.itemCategoryMeta?.value, product.title)`
     (`shopify-admin-api.integration.ts:480-483`).
   - Dimensions parsed via `parseDimensionCm()`
     (`shopify-admin-api.integration.ts:297-313`, regex-extracts the first
     numeric token and rejects non-positive/non-finite values) into
     `itemHeight`/`itemWidth`/`itemDepth` (numbers, cm); `volume` computed as
     `h * w * d` only when all three are non-null
     (`shopify-admin-api.integration.ts:333-337`).
   - `quantity = resolveQuantity(quantityMeta.value, itemCategory, title)`
     (`shopify-admin-api.integration.ts:350-367`) — see the "Special cases"
     section below; this is where `itemCategory` feeds back into a
     **different** field (`quantity`), not just its own resolution.
   - `properties = extractShopifyScanHistoryProperties(...)`.
3. `extractShopifyScanHistoryProperties()`
   (`src/modules/shopify/domain/shopify-metafield-properties.ts:31-49`)
   builds a `Record<string, string> | null` from a small, explicitly
   registered list of "scan history property" metafields — currently just
   two: `custom.extension_type` → `properties.extension_type` and
   `custom.extension_quantity` → `properties.extension_quantity`
   (`shopify-metafield-properties.ts:8-22`). Empty/blank values are dropped;
   returns `null` if nothing was present. This is a generic, extensible
   metafield-to-JSON-properties mechanism, unrelated to `itemCategory`
   itself but registered/fetched via the same GraphQL query builder
   (`buildShopifyPropertyMetafieldSelection()`).
4. `scanHistoryRepository.appendLocationEvent(...)`
   (`src/modules/scanner/repositories/scan-history.repository.ts:480-818`)
   writes/updates the `ScanHistory` row inside a transaction:
   - `itemCategory = normalizeCategory(input.itemCategory)` (line 487) —
     trims, defaults to `"unknown"` if empty.
   - On **create** (no existing row): all fields including `itemCategory`
     are written as given (lines 534-575).
   - On **update** (existing row, and the location actually changed): the
     **new** `itemCategory` unconditionally overwrites the existing one
     (line 667: `itemCategory,` — no merge/preserve logic) — i.e. every scan
     that moves an item also re-syncs its category to whatever Shopify
     currently reports.
   - Also updates/creates `LocationStatsDaily` (item received count), but
     **not** `LocationCategoryStatsDaily` — location-received tracking has
     no category breakdown at all (matches the schema: only
     `LocationCategoryStatsDaily` on the sold side ties category + location
     together).
   - `itemType: input.idType` is written verbatim
     (`update-item-location.command.ts:137` → passed through as
     `itemType` in `appendLocationEvent`'s input).

---

## Product-update sync flow

Separate path that keeps `itemCategory` (and other product fields) current
when a product is edited in Shopify directly (not via a scan), driven by the
`PRODUCTS_UPDATE` webhook.

`processProductsUpdateWebhookJob`
(`src/modules/shopify/jobs/process-products-update-webhook.job.ts:56-224`):

1. Parses the webhook payload, normalizes the product ID.
2. If the payload carries a variant price, calls
   `scanHistoryRepository.appendPriceChangeIfHistoryExists(...)` (price-only,
   no category involvement).
3. Looks up the existing `ScanHistory` row for this product
   (`findByShopAndProduct`).
4. **If the existing item is already sold** (`existingHistory?.isSold`):
   only `syncSoldQuantityIfHistoryExists({ quantity: product.quantity })` is
   called (lines 89-106) — **`itemCategory` is never touched for sold
   items via this webhook path.** Category on a sold item's `ScanHistory`
   row is effectively frozen once sold, except through the recategorization
   scripts described below.
5. **If the item is not sold (or has no history yet)**: re-fetches the full
   product snapshot (`shopifyAdminApi.getProductWithLocation`, which
   re-runs `categoryResolverService.resolve(...)` fresh), then:
   - If `!isActiveProductStatus(product.status)` (i.e. not `"ACTIVE"`), the
     sync is skipped entirely and logged (lines 119-127) — draft/archived/
     unlisted products don't get category-synced even if unsold.
   - If no existing history and a location is set: creates a new
     `ScanHistory` row via `appendLocationEvent` with the freshly resolved
     `itemCategory` (lines 131-153) — `itemType: "product_id"` hardcoded
     (webhook-driven writes always use `"product_id"` since Shopify sends
     the product ID, not a scan-time identifier choice).
   - If existing history: calls
     `scanHistoryRepository.syncProductSnapshotIfHistoryExists({ itemCategory: product.itemCategory, ... })`
     (lines 169-186) to patch category/sku/barcode/image/dimensions/etc. if
     changed, **and separately**, if the location actually changed, also
     calls `appendLocationEvent` (lines 188-212) to record a location-move
     event (with its own `itemCategory` overwrite as described above).

`syncProductSnapshotIfHistoryExists`
(`scan-history.repository.ts:1400-1522`) uses
`resolveCategoryForUpdate(input.itemCategory, existing.itemCategory)`
(line 1445) rather than `normalizeCategory()` directly — this prefers the
freshly-fetched category, but **falls back to the existing persisted value**
(not `"unknown"`) if the input is empty, only defaulting to `"unknown"` as a
last resort (`resolveCategoryForUpdate` → `resolveStringForUpdate(...,
"unknown")`, lines 70-78). It only writes if `hasChanges` is true (diffing
every tracked field, line 1478-1490), and only broadcasts a WS update if a
change occurred.

**Net effect**: for **unsold** items, category can silently drift back into
sync with Shopify on every `PRODUCTS_UPDATE` webhook (title edits,
metafield edits). For **sold** items, category is frozen at time of sale
(or whatever it was last synced to) and is not automatically kept current —
only the repair/reconciliation scripts (below) touch sold-item categories.

---

## Stats rollups

### Writes to `LocationCategoryStatsDaily`

All three call sites live in `scan-history.repository.ts` and only fire for
`salesChannel === "physical"` — webshop/imported/unknown-channel sales never
produce a `LocationCategoryStatsDaily` row (only `SalesChannelStatsDaily`,
which has no category axis, is updated in that case).

1. **`appendSoldTerminalEventWithFallback` — new-record branch**
   (`scan-history.repository.ts:912-939`, inside the `!existing` branch
   starting at line 880). Business event: **an order-webhook (`orders/paid`
   or `orders/create`) reports a sale for a product that has no prior
   `ScanHistory` row at all** — i.e. the item was sold without ever being
   scanned into the system first. A brand-new `ScanHistory` row is created
   with `isSold: true` and the category from
   `normalizeCategory(input.itemCategory)` (line 850) is stamped into both
   the new row and this `LocationCategoryStatsDaily` upsert, keyed at the
   **unknown location** (`normalizedUnknownLocation`) since there's no
   known prior location to attribute the sale to.

2. **`appendSoldTerminalEventWithFallback` — existing-record branch**
   (`scan-history.repository.ts:1248-1275`, inside the `existing` branch).
   Business event: **an order-webhook reports a sale for a product that
   already has scan history** (was scanned/placed before being sold). Here
   `soldItemCategory = normalizeCategory(resolvedItemCategory)` (line 1191)
   where `resolvedItemCategory = resolveCategoryForUpdate(input.itemCategory,
   existing.itemCategory)` (lines 1043-1046) — i.e. the category is
   re-resolved preferring the freshly-fetched Shopify value but falling
   back to what was already stored, and is keyed at `arrivedLocation` — the
   location the item last moved to before the sale (with logic to avoid
   attributing to a stale pre-return-to-store move; see lines 1172-1188).

3. **`syncSoldQuantityIfHistoryExists`**
   (`scan-history.repository.ts:1653-1682`, inside a transaction starting
   at line 1532). Business event: **a later correction to the sold
   quantity of an already-sold item** — triggered from the `PRODUCTS_UPDATE`
   webhook path when Shopify's quantity metafield changes after the sale
   was recorded (see "Product-update sync flow" above, step 4), or by the
   `reconcile`/`repair` scripts. This does **not** re-resolve category at
   all — it uses `soldItemCategory = normalizeCategory(existing.itemCategory)`
   (line 1622), i.e. whatever category is already on the row, and only
   applies a **delta** (`quantityDelta = nextQuantity - existing.quantity`)
   to `itemsSold`/`totalRevenue`/`totalTimeToSellSeconds` for that
   `[date, location, itemCategory]` key — it can only increment or
   decrement existing rows, never re-key a sale into a different category
   bucket. If the item's category was wrong at time of sale, this path
   cannot fix the stats attribution.

### Reads / aggregation

`stats.repository.ts`:
- `getZoneDetail` (around line 236) — `prisma.locationCategoryStatsDaily.groupBy({ by: ["itemCategory"], ... })`
  (`stats.repository.ts:244-256`) to build the per-zone category breakdown
  shown in a location's detail view.
- `getCategoryByLocation(shopId, category, from, to)`
  (`stats.repository.ts:323-367`) — given one category, groups
  `LocationCategoryStatsDaily` `by: ["location"]` filtered on
  `itemCategory: category` (line 332-344), then clusters rows by zone
  prefix (`parseZonePrefix`) to answer "where does this category sell
  best."
- `getCategoriesOverview(shopId, from, to)`
  (`stats.repository.ts:369-`) — three parallel `groupBy` queries: total
  sold/revenue per category (line 381), best location by volume per
  category (line 393-401, `by: ["itemCategory", "location"]` sorted by
  itemsSold), and best location by revenue per category (line 402-410,
  same grouping sorted by totalRevenue) — with `UNKNOWN_POSITION`/
  `SOLD_ORDER:*` sentinel locations excluded from "best location" (line
  413-414, `isSentinel`).
- `getTimePatterns(shopId, from, to, salesChannel?, latestLocation?, itemCategory?)`
  (`stats.repository.ts:723-`) — an optional `itemCategory` exact-match
  filter (line 729, 752) on `ScanHistory` (not the daily rollup table) used
  to slice hour-of-day/day-of-week sales distributions by category.

`stats-items.repository.ts`:
- `buildWhere()` (line 29-128) — `filters.itemCategory` becomes an exact
  `{ itemCategory: filters.itemCategory }` AND-clause (lines 81-83) against
  `ScanHistory` directly, used by the paginated items list/table endpoint.
- `toDomain()` (line 154-196) — passes `record.itemCategory ?? null`
  straight through into the `StatsItem` DTO (line 174) with no
  transformation.

---

## Other touchpoints

- **`src/modules/logistic/queries/get-logistic-items.query.ts`** — the
  logistics/fulfillment item list query. `itemCategory` is included as one
  of the free-text search columns (`{ itemCategory: { contains: filters.q } }`,
  line 73) and is passed straight through into `LogisticItemSummary`
  (line 162) for display; no filtering or business logic keys off it beyond
  the free-text search.
- **`src/modules/logistic/domain/logistic.domain.ts`** — defines
  `LogisticItemSummary.itemCategory: string | null` (line 42) as a
  display/passthrough field on the logistics DTO; no logic here relates to
  category resolution.
- **`src/modules/shopify/queries/search-unified-items.query.ts`** — the
  scanner's unified lookup-by-SKU/barcode/handle query. Tries
  `ScanHistory` first (`itemCategory` passed through, line 76), and falls
  back to a live Shopify search (`searchProductsBySkuQuery`) when no local
  history exists, then re-merges any local history found by product ID so
  category prefers the stored value over the freshly-fetched one where
  both exist (line 128: `history?.itemCategory ?? item.itemCategory ?? null`).
- **`src/modules/shopify/contracts/shopify.contract.ts`** — defines the DTO
  shapes that carry `itemCategory: string | null` end-to-end:
  `ShopifyProductLocationDto` (line 194), `ShopifySkuSearchItemDto` (line
  210), `UnifiedItemSearchResultDto` (line 220). Also defines
  `ShopifyOrderLineItemSchema` with a `product_type` field (line 83) parsed
  from order webhooks but — see "Special cases" below — **never used** to
  populate `itemCategory`.
- **`src/modules/shopify/commands/handle-orders-paid-webhook.command.ts`**
  and **`handle-orders-create-webhook.command.ts`** — both order-webhook
  handlers batch-fetch full product snapshots via
  `loadProductSnapshotsForOrderService` (which calls
  `shopifyAdminApi.getProductWithLocation` per product, re-running
  `categoryResolverService.resolve` live) and pass
  `productSnapshot?.itemCategory ?? null` into
  `appendSoldTerminalEventWithFallback` (line 159 / line 181
  respectively) — the order webhook's own `product_type` field on each
  line item is parsed but discarded for category purposes (only used
  elsewhere, for internal-marker SKU/type detection — see
  `src/modules/shopify/domain/order-marker.ts:41`).
- **`src/modules/shopify/queries/get-product.query.ts`** — single-product
  lookup query, passes `product.itemCategory` straight through into
  `ShopifyProductLocationDto` (line 36) with no transformation; used by
  API consumers that need a live Shopify-resolved category for one
  product.
- **`src/modules/shopify/jobs/process-products-update-webhook.job.ts`** —
  see "Product-update sync flow" above; the other primary write path into
  `itemCategory`.
- **`src/modules/scanner/contracts/scan-history.contract.ts`** — Zod
  schemas: `itemCategory` is a valid `ScanHistoryStringFilterColumn` (line
  6) and `FrontendScanHistoryFieldSchema` value (line 21) for the
  scan-history search/filter API, mapped 1:1 to the same column name
  (`mapFrontendFieldToColumn`, line 101-102); `AppendScanLocationHistorySchema`
  validates `itemCategory` as an optional, nullable, max-120-char trimmed
  string (line 159) on the write path.
- **`src/modules/shopify/domain/shopify-shop.ts`** — defines
  `ProductLocationData`/`ProductLocationSnapshot` with
  `itemCategory: string | null` (line 13) as the canonical shape returned
  by every `shopifyAdminApi` product-fetch method; the single source of
  truth for what a "product snapshot" carries.
- **`src/modules/stats/contracts/stats-items.contract.ts`** — Zod schema
  for the stats-items list endpoint; `itemCategory` is an optional
  exact-match string filter (line 71), no enum/whitelist validation.
- **`src/modules/stats/queries/get-stats-items.query.ts`** — notably,
  filtering by `itemCategory` disables `groupByOrder` (line 25-26,
  `const groupByOrder = input.groupByOrder && !filters.itemCategory`)
  because category is a per-line-item attribute, not a per-order one — the
  comment explains category filtering "slices items, not orders."
- **`src/modules/stats/controllers/stats.controller.ts`** — HTTP layer:
  accepts a `:category` route param for `getCategoryByLocation` (lines
  53-60, URL-decoded, no validation against the dictionary — any string is
  accepted and simply returns an empty/zero result if it doesn't match any
  stored rows), and an optional `itemCategory` query param for
  `getTimePatterns` (lines 136-140) and the stats-items list (line 158).
- **`src/modules/stats/domain/stats-items.domain.ts`** — `StatsItem.itemCategory: string | null`
  (line 5) and `StatsItemsFilters.itemCategory?: string` (line 43) — plain
  passthrough types, no category-specific logic.
- **`scripts/reconcile-active-sold-items.ts`** — finds `ScanHistory` rows
  still `isSold: false` locally despite Shopify having a paid order for the
  same product, and drives them through the normal sold-terminal write path
  (so category resolution follows the same rules as the live webhook path,
  just replayed after the fact); `itemCategory` appears only as a
  passthrough field on its local type definitions (line 49) and in a
  reconciliation summary log (line 534).
- **`scripts/restore-scan-history.ts`** — a data-restore utility; fetches
  live product snapshots and writes `itemCategory` straight from
  `product.itemCategory` (lines 73, 103) when reconstructing `ScanHistory`
  rows from Shopify state, using the same `categoryResolverService`
  pipeline indirectly (via `shopifyAdminApi.getProductWithLocation`).
- **`scripts/correct-scan-history-data.ts`** — see "Special cases" below;
  a large historical-data-correction script that both (a) maintains its own
  **duplicated** copy of category resolution logic (its own
  `resolveQuantity`/dining_chair special case, lines 206-220) built on top
  of the shared `categoryParserService` (imported directly, not via
  `categoryResolverService` — so it re-implements the
  metafield-then-parser-then-"unknown" priority inline, lines 299-301), and
  (b) has a dedicated "Phase 6: Fixing unknown categories" step (lines
  936-975) that re-parses `itemTitle` for any row with
  `itemCategory === "unknown"` and updates it if the parser now resolves
  something — this is a **title-only** re-resolution; it does not
  re-check the Shopify metafield.
- **`scripts/repair-scan-history-order-metadata.ts`** — another repair
  script; selects sold `ScanHistory` rows with `itemCategory` null or
  `"unknown"` (among other missing fields, lines 390-392) as repair
  candidates, re-fetches each from Shopify, and only overwrites
  `itemCategory` if the new value differs **and is not itself
  `"unknown"`** (line 447: `if (currentCategory !== nextCategory &&
  nextCategory !== "unknown")`) — i.e. it will never regress a resolved
  category back to `"unknown"`, but also never removes a genuinely stale
  category if Shopify's fresh fetch also resolves to `"unknown"`. It also
  has a "Phase 3: Rebuilding category stats table" step (line 531) that
  fully recomputes `LocationCategoryStatsDaily` from corrected
  `ScanHistory` rows, using `record.itemCategory ?? "unknown"` (line 577)
  as the grouping key, and separately reports on stale `"unknown"` rows in
  the rebuilt table (lines 627-629).

---

## Special cases / hardcoded rules

A repo-wide grep for category-specific string comparisons and `"unknown"`
sentinel handling found the following:

- **`dining_chair` quantity-inference special case** —
  `shopify-admin-api.integration.ts:350-367` (`resolveQuantity`):

  ```ts
  const resolveQuantity = (
    metafieldValue: string | null | undefined,
    itemCategory: string,
    title: string,
  ): number => {
    const raw = metafieldValue?.trim();
    if (raw) {
      const parsed = Number.parseInt(raw, 10);
      if (Number.isInteger(parsed) && parsed > 0) return parsed;
    }
    if (itemCategory === "dining_chair") {
      const inferred = inferQuantityFromTitle(title);
      if (inferred !== null) return inferred;
    }
    return 1;
  };
  ```

  If the `custom.quantity` metafield is unset (or invalid), and the
  resolved `itemCategory` is exactly `"dining_chair"`, quantity is inferred
  from the title via a `set of (\d+)` regex
  (`inferQuantityFromTitle`, lines 342-348) — e.g. "Dining Chair, Set of 4"
  → quantity 4. For every other category, an unset quantity metafield
  always defaults to `1`. This is a genuine hardcoded, category-specific
  business rule with no config/data-driven equivalent.
  - **This exact logic is duplicated** (not shared/imported) in
    `scripts/correct-scan-history-data.ts:206-220`, with its own
    `inferQuantityFromTitle` (lines 199-204, using a slightly different
    regex boundary `\bset\s+of\s+(\d+)\b` and requiring `n >= 2` instead of
    `n > 0`, so the two implementations can technically diverge, e.g. a
    title matching "set of 1" would resolve differently between the two).
- **No other category-specific business rules were found.** A full grep for
  `itemCategory ===`, `category ===`, `.includes(...)` against category
  values, and other literal category strings across `src/` and `scripts/`
  (excluding `dist/`) turned up no other special-cased category besides
  `dining_chair`, and no special-cased handling of any *other* specific
  category value (e.g. no `"sofa"` or `"mirror"` special case exists).
- **`"unknown"` as a silent, repeated sentinel** — not a single-category
  special case, but a pervasive pattern worth flagging here since it
  recurs at nearly every layer: `category-resolver.service.ts:24`,
  `scan-history.repository.ts:49` (`normalizeCategory`),
  `scan-history.repository.ts:75-76` (`resolveCategoryForUpdate`'s
  fallback), `scan-history.repository.ts:1191`/`1622`
  (`soldItemCategory` derivations), `scripts/correct-scan-history-data.ts:301`,
  `scripts/repair-scan-history-order-metadata.ts:438-439,577`. Every one of
  these is an independent place that can turn `null`/empty into the string
  `"unknown"` — there is no single normalization chokepoint.
- **`product_type` from Shopify order-webhook line items is parsed but
  never used for `itemCategory`** — see `shopify.contract.ts:83` and its
  only consumer, `order-marker.ts:41` (internal-marker detection), and the
  debug-log helper `order-webhook-debug.ts:15`. Every category value that
  ends up on a `ScanHistory` row from an order webhook instead comes from a
  live re-fetch of the product via `loadProductSnapshotsForOrderService`
  (one Admin API GraphQL call per distinct product in the order), not from
  anything Shopify already included in the webhook payload itself.

---

## Open questions / refactor risk areas

The following are observations synthesized while reading the code, meant to
seed the user's own thinking — not a prescribed solution.

1. **Category is a free-form string everywhere, not an enum or FK.** The
   only "vocabulary" enforcement is the hand-maintained
   `CATEGORY_DICTIONARY` array, which is consulted only as a *fallback*
   parser, not a validator — a Shopify metafield value of literally
   anything (typo, different casing, a category that isn't even in the
   dictionary) becomes the category verbatim (`category-resolver.service.ts:14-17`).
   There is no place in the system that rejects or normalizes an
   out-of-vocabulary category coming from the metafield path. Any refactor
   toward a closed category enum needs a migration/reconciliation story for
   whatever free-form values currently exist in production data.
2. **`"unknown"` is a silent, unqueryable-as-"missing" fallback used in at
   least 8 separate call sites** (listed above) instead of a single shared
   normalization function or a `null`-preserving convention. This makes it
   impossible to distinguish "we tried to resolve a category and got
   nothing" from "someone set the category to the literal string
   'unknown'" — and every repair script effectively treats `"unknown"` as
   the marker for "needs re-resolution," which only works because nothing
   else currently produces that literal string on purpose.
3. **Category can silently change after `ScanHistory` already exists, with
   inconsistent "who wins" rules depending on the code path:**
   - A location-update scan (`appendLocationEvent`) always overwrites
     `itemCategory` with the freshly-resolved value
     (`scan-history.repository.ts:667`), no merge.
   - `syncProductSnapshotIfHistoryExists` (product-update webhook, unsold
     items only) prefers the fresh value but falls back to the existing
     one if the fresh fetch is empty (`resolveCategoryForUpdate`).
   - Once an item is `isSold: true`, `syncSoldQuantityIfHistoryExists`
     (the other product-update webhook path for sold items) never touches
     `itemCategory` at all — sold items are effectively frozen unless a
     repair script runs.
   - The repair scripts have yet a third rule: never let a fresh
     `"unknown"` regress an already-resolved category
     (`repair-scan-history-order-metadata.ts:447`).
   Three different reconciliation strategies for the same field, none of
   which record *when* or *why* a category changed — there's no audit
   trail (no `ScanHistoryEvent`-style history for category changes the way
   there is for location and price).
4. **Category changes after a sale do not retroactively fix historical
   stats attribution.** `LocationCategoryStatsDaily` rows are additive
   deltas keyed by `[date, location, itemCategory]` at time of write; if an
   item's category is later corrected, past daily rows stay keyed under the
   old (wrong) category unless a full rebuild is run (only
   `repair-scan-history-order-metadata.ts` Phase 3 does this, and it's a
   manual, offline, full-table rebuild — not an automatic consequence of a
   category correction).
5. **The category dictionary and the `dining_chair` special case are
   duplicated in application code and in `scripts/correct-scan-history-data.ts`**
   (not imported from a shared module for the quantity-inference regex),
   so the two implementations can drift (see the `\bset\s+of\s+(\d+)\b` /
   `n >= 2` vs `n > 0` discrepancy noted above). Any refactor of category
   resolution needs to also account for this script (and check for other
   scripts with similarly copy-pasted logic) rather than assuming
   `src/shared/category/` is the only place resolution logic lives.
6. **The dictionary is derived from — and implicitly coupled to —
   Shopify's smart-collection title rules**, per its own docstring, but
   there's no mechanism keeping it in sync with Shopify collections if
   those change; it's a point-in-time snapshot maintained by hand.
7. **`itemCategory` filters/params accept arbitrary strings with no
   validation against the dictionary anywhere in the HTTP layer**
   (`stats.controller.ts`'s `:category` route param, `itemCategory` query
   params across stats/scan-history/logistic endpoints) — a typo'd filter
   value silently returns zero results rather than erroring, which could
   mask both API misuse and genuine data-quality problems in the same way.
8. **No `itemCategory` field exists on `LocationStatsDaily`, only on
   `LocationCategoryStatsDaily`**, so any query that wants both a
   location-only aggregate (with received counts) and a category
   breakdown must issue two separate queries and reconcile them in
   application code (as `getZoneDetail` already does) — a design that a
   category refactor should either preserve deliberately or explicitly
   change.
9. **`itemType` (`"product_id" | "handle" | "sku" | "barcode"`) is
   entirely separate from `itemCategory` today, but both are similarly
   "stringly typed" with no DB-level enum**, and both are exposed on
   overlapping DTOs and filter surfaces (e.g.
   `ScanHistoryStringFilterColumn` includes both). If the refactor
   introduces a formal `ItemCategory` (or `ItemType`) concept, worth
   deciding explicitly whether `itemType`'s scan-identifier semantics stay
   completely out of scope, since the similar naming has already proven
   confusing enough to need this document.
