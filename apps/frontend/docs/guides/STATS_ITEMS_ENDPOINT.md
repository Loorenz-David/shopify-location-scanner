# `GET /stats/items` — Guide

The stats items endpoint returns a paginated list of `ScanHistory` records
enriched with derived fields (last known price, time to sell). It is designed
as the data source for the analytics item-explorer feature: the user can slice
the full item catalogue by status, location, category, dimensions, and date,
then sort by price or sell speed.

---

## Base URL

```
GET /stats/items
```

All requests must be authenticated (bearer token) and the user's account must
be linked to a shop.

---

## Response Shape

```jsonc
{
  "data": {
    "items": [ /* StatsItem[] */ ],
    "total": 142,   // total records matching the current filters
    "page": 1,
    "pageSize": 50
  }
}
```

### `StatsItem` fields

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | ScanHistory record id |
| `username` | `string` | Who last scanned the item |
| `itemImageUrl` | `string \| null` | Product image URL |
| `itemCategory` | `string \| null` | e.g. `"dining_table"` |
| `itemSku` | `string \| null` | |
| `itemTitle` | `string` | Shopify product title |
| `itemHeight` | `number \| null` | cm |
| `itemWidth` | `number \| null` | cm |
| `itemDepth` | `number \| null` | cm |
| `volume` | `number \| null` | cm³ |
| `quantity` | `number` | Units in the set (default 1) |
| `latestLocation` | `string \| null` | Last physical scan zone, e.g. `"K2"` |
| `isSold` | `boolean` | |
| `lastSoldChannel` | `"webshop" \| "physical" \| "imported" \| "unknown" \| null` | |
| `orderId` | `string \| null` | Shopify order id |
| `orderNumber` | `number \| null` | Shopify order number |
| `intention` | `string \| null` | Logistic intention if set |
| `fixItem` | `boolean \| null` | Flagged for repair |
| `lastKnownPrice` | `string \| null` | Latest price string from price history |
| `timeToSellSeconds` | `number \| null` | `lastModifiedAt − createdAt` in seconds. `null` when `isSold = false` |
| `lastModifiedAt` | `ISO string` | Effectively the sold timestamp for sold items |
| `createdAt` | `ISO string` | When the item was first scanned into the system |

---

## Query Parameters

All parameters are optional and combinable.

### Pagination

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | integer ≥ 1 | `1` | Page number |

Page size is fixed at **50**.

---

### Date range

Filters on `lastModifiedAt` — which equals the sold timestamp for sold items
(see [Sold date accuracy](#sold-date-accuracy) below).

| Param | Type | Example |
|---|---|---|
| `from` | `YYYY-MM-DD` or ISO datetime | `2026-01-01` |
| `to` | `YYYY-MM-DD` or ISO datetime | `2026-03-31` |

```
GET /stats/items?from=2026-01-01&to=2026-03-31
```

---

### Status filter

| Param | Type | Values |
|---|---|---|
| `isSold` | boolean | `true` / `false` / `1` / `0` |

```
GET /stats/items?isSold=true
GET /stats/items?isSold=false
```

Omitting `isSold` returns both sold and active items.

---

### Exact-match filters

| Param | Type | Example |
|---|---|---|
| `latestLocation` | string | `K2` |
| `itemCategory` | string | `dining_table` |
| `lastSoldChannel` | enum | `webshop` / `physical` / `imported` / `unknown` |

```
GET /stats/items?isSold=false&latestLocation=K2
GET /stats/items?isSold=true&itemCategory=dining_chair&lastSoldChannel=webshop
```

`latestLocation` is an **exact** match against the `latestLocation` column.
For active (unsold) items this is the real physical zone. For sold items whose
history was corrected, it is also the last physical zone. Items sold without a
prior scan have `latestLocation = null` and will not match any location filter.

---

### Dimension range filters (cm)

Each dimension accepts an independent min/max pair.

| Params | Applies to |
|---|---|
| `heightMin`, `heightMax` | `itemHeight` |
| `widthMin`, `widthMax` | `itemWidth` |
| `depthMin`, `depthMax` | `itemDepth` |

```
GET /stats/items?heightMin=40&heightMax=80
GET /stats/items?widthMin=100&depthMax=60
```

Values are inclusive (`>=` / `<=`).

---

### Volume filter

Choose between a **named label** or the raw dimension filters above.

| Label | Range (cm³) | Approximate |
|---|---|---|
| `tiny` | 0 – 50,000 | < 0.05 m³ |
| `small` | 50,000 – 200,000 | 0.05 – 0.2 m³ |
| `medium` | 200,000 – 600,000 | 0.2 – 0.6 m³ |
| `large` | 600,000 – 1,500,000 | 0.6 – 1.5 m³ |
| `extra_large` | > 1,500,000 | > 1.5 m³ |

```
GET /stats/items?volumeLabel=small
GET /stats/items?isSold=true&volumeLabel=large
```

---

### Sorting

| Param | Values | Default |
|---|---|---|
| `sortBy` | `lastModifiedAt` · `lastKnownPrice` · `timeToSell` | `lastModifiedAt` |
| `sortDir` | `asc` · `desc` | `desc` |

```
GET /stats/items?sortBy=timeToSell&sortDir=asc          // slowest sellers first
GET /stats/items?sortBy=lastKnownPrice&sortDir=desc     // most expensive first
GET /stats/items?sortBy=lastModifiedAt&sortDir=asc      // oldest activity first
```

> **Sort accuracy note**
>
> `lastModifiedAt` sorting is handled at the database level and is accurate
> across all pages.
>
> `lastKnownPrice` and `timeToSell` are derived values (from a related table
> and a computed difference respectively) that cannot be expressed as a SQL
> `ORDER BY` without a raw query. The endpoint fetches up to **2,000** records
> matching your filters, sorts them in memory, then returns the requested page.
>
> In practice, apply enough filters to keep your result set small before using
> these sorts. If a full-table sort ever becomes necessary, the upgrade path is
> to denormalise `lastKnownPrice` and `timeToSellSeconds` onto the `ScanHistory`
> table directly.

---

### Order grouping

When `isSold=true`, items from the same Shopify order can be clustered together
in the response so the frontend can render them as a group.

| Param | Type | Default |
|---|---|---|
| `groupByOrder` | boolean | `false` |

```
GET /stats/items?isSold=true&groupByOrder=true
```

Items with an `orderId` appear first, grouped by order. Items without an
`orderId` (e.g. manually marked sold) appear last. Within each order group,
items are ordered by the primary `sortBy`/`sortDir` selection.

> **Category filter takes precedence.** If `itemCategory` is also present,
> `groupByOrder` is silently ignored. Category filtering slices items
> individually — grouping by order would produce misleading clusters when only
> a subset of each order's items passes the category filter.

---

## Common Recipes

### All items currently in zone K2
```
GET /stats/items?isSold=false&latestLocation=K2
```

### Sold dining chairs, this quarter, sorted by how fast they sold
```
GET /stats/items?isSold=true&itemCategory=dining_chair&from=2026-01-01&to=2026-03-31&sortBy=timeToSell&sortDir=asc
```

### Large items that have not sold yet, sorted by oldest scan first
```
GET /stats/items?isSold=false&volumeLabel=large&sortBy=lastModifiedAt&sortDir=asc
```

### Webshop orders placed in March, grouped by order
```
GET /stats/items?isSold=true&lastSoldChannel=webshop&from=2026-03-01&to=2026-03-31&groupByOrder=true
```

### Items between 40–80 cm tall and 100–200 cm wide, any status
```
GET /stats/items?heightMin=40&heightMax=80&widthMin=100&widthMax=200
```

### Second page of results
```
GET /stats/items?isSold=true&itemCategory=armchair&page=2
```

---

## Sold Date Accuracy

`lastModifiedAt` is set explicitly to the Shopify order's `processed_at`
timestamp when the webhook is handled — it is **not** Prisma's auto-managed
`updatedAt`. The logistics flow (marking intention, placing in a zone,
fulfilling) writes to separate logistic fields and never touches
`lastModifiedAt`, so the sold timestamp remains stable throughout the item's
post-sale lifecycle.

`timeToSellSeconds = lastModifiedAt − createdAt` is therefore the full time
from first scan to sale in seconds.

---

## Extending the Endpoint

The implementation is structured in four layers that can each be extended
independently:

| Layer | File | What to add |
|---|---|---|
| Contract | `contracts/stats-items.contract.ts` | New Zod field in `StatsItemsQuerySchema` |
| Domain | `domain/stats-items.domain.ts` | New field on `StatsItemsFilters` or `StatsItem` |
| Repository | `repositories/stats-items.repository.ts` | New `and.push(...)` condition in `buildWhere`, or new field in `toDomain` |
| Query | `queries/get-stats-items.query.ts` | Pre-processing logic (e.g. label → range) |

Adding a new filter typically requires touching the contract, domain, and
repository — the query and controller only need changes if the new parameter
needs pre-processing before reaching the repository.
