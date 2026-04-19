# Zone Level Location — Backend Implementation

## Overview

Adds support for multi-level shelf locations using a colon-separated string format
(`H1:2`). A zone can have a bare label (`H1`) or numbered levels (`H1:1`, `H1:2`).
All logic is query-time only — no schema migrations, no new tables.

---

## Location String Format

```
H1        → single-level zone (no colon)
H1:1      → zone H1, level 1
H1:2      → zone H1, level 2
```

**Parser regex:** `/^(.+):(\d+)$/`
- Matches `zone:level` only when level is numeric digits
- Does NOT match sentinels like `SOLD_ORDER:abc123` or `UNKNOWN_POSITION`

**Implicit level 1 rule:** a bare `H1` record that coexists with `H1:2` in the DB
is treated as level 1 at query time. No data migration required.

---

## Files Changed

### `src/modules/stats/repositories/stats.repository.ts`

#### Helpers added (top of file, after imports)

```typescript
const LEVEL_LOCATION_RE = /^(.+):(\d+)$/;
const parseZonePrefix = (location: string): string => { ... };
const isLevelLocation = (location: string): boolean => { ... };
const resolveMatchingLocations = (knownLocations, query) => { ... };
const normalizeLevelLabel = (rawLocation, matchingLocations) => { ... };
```

**`resolveMatchingLocations(knownLocations, query)`**
- Zone query (`"H1"`): returns `["H1", "H1:2", ...]` — bare + all levelled siblings
- Level query (`"H1:2"`): returns `["H1:2"]` — exact match
- Level-1 query (`"H1:1"`): returns `["H1:1"]` if it exists, otherwise falls back to `["H1"]`
- Any other level: exact match only

**`normalizeLevelLabel(rawLocation, matchingLocations)`**
- If `rawLocation` is bare (`H1`) AND has levelled siblings in `matchingLocations`
  → returns `"H1:1"` (display label, not DB key)
- Otherwise → returns `rawLocation` unchanged

#### `getZonesOverview`
- Groups raw `locationStatsDaily` rows by zone prefix in JS
- `H1` + `H1:2` cluster under zone key `"H1"` with `levelCount: 2`
- Returns `ZoneOverviewItem[]` with `levelCount: number` added

#### `getZoneDetail(shopId, location, from, to)`
- Uses `resolveMatchingLocations` to determine which DB rows to query
- Zone view (`"H1"`): queries all matching rows, aggregates kpis + daily series,
  builds `levels: ZoneLevelBreakdown[]` with normalized labels
- Level view (`"H1:2"`): queries exact rows, returns `isLevelView: true`, `levels: null`
- Level-1 view (`"H1:1"`): resolves to bare `"H1"` DB rows if `"H1:1"` doesn't exist

#### `getCategoryByLocation`
- Groups by zone prefix in JS (same pattern as `getZonesOverview`)
- `H1` + `H1:2` rows merge into a single `"H1"` entry in the response

#### `getCategoriesOverview`
- `bestLocation` now runs through `parseZonePrefix` so it always returns a zone
  prefix, never a raw level string like `"H1:2"`

#### `getTimePatterns`
- `latestLocation` filter uses zone-aware OR clause:
  - `"H1"` → `latestLocation = "H1" OR latestLocation LIKE "H1:%"`
  - `"H1:1"` → `latestLocation = "H1:1" OR latestLocation = "H1"` (level-1 fallback)
  - `"H1:2"` → exact match only
- Revenue fixed: `revenue += price` (not `price * qty`). The stored price is the
  total Shopify line item price; multiplying by quantity was double-counting.

### `src/modules/stats/repositories/stats-items.repository.ts`

#### `buildWhere` — `latestLocation` filter

Same three-case logic as `getTimePatterns`:
- Zone query: `OR [exact, startsWith]`
- Level-1 query: `OR [exact, bare zone fallback]`
- Other level: exact match

### `src/modules/stats/domain/stats.ts`

```typescript
// Added to ZoneOverviewItem:
levelCount: number;

// New type:
type ZoneLevelBreakdown = {
  level: string;
  itemsSold: number;
  itemsReceived: number;
  revenue: number;
  avgTimeToSellSeconds: number | null;
};

// Added to ZoneDetail:
isLevelView: boolean;
levels: ZoneLevelBreakdown[] | null;
```

### `src/modules/scanner/repositories/scan-history.repository.ts`

`itemsReceived` in both `location_update` handlers changed from `increment: 1`
to `increment: quantity`. Scanning a set of 4 chairs to a zone now correctly
records `itemsReceived += 4`.

---

## Stats Table Behaviour

Stats rows are written per exact location string — no rollup rows are written.

| DB rows | Zone query result | Level breakdown |
|---------|------------------|-----------------|
| `H1` only | `itemsSold` from H1 | `levels: null` |
| `H1`, `H1:2` | sum of H1 + H1:2 | `[{level:"H1:1"}, {level:"H1:2"}]` |
| `H1:1`, `H1:2` | sum of H1:1 + H1:2 | `[{level:"H1:1"}, {level:"H1:2"}]` |
| `H1:2` only | H1:2 stats | `levels: null` (single level) |

---

## Known Data Issue

`locationStatsDaily.itemsSold` in older records may show lower counts than
`locationCategoryStatsDaily.itemsSold` for the same location. This is because
an earlier code version incremented `itemsSold` by `1` per sold event instead
of by `quantity`. The category stats table was corrected via a data script but
`locationStatsDaily` was not. A correction script is needed to reconcile
these by summing from `locationCategoryStatsDaily` grouped by `date + location`.

---

## Endpoint Behaviour Reference

| Endpoint | `location = "H1"` | `location = "H1:1"` | `location = "H1:2"` |
|----------|-------------------|---------------------|---------------------|
| `GET /stats/zones` | H1 with `levelCount: 2` | — | — |
| `GET /stats/zones/H1` | All levels aggregated | — | — |
| `GET /stats/zones/H1:1` | — | H1 records (fallback) | — |
| `GET /stats/zones/H1:2` | — | — | H1:2 records only |
| `GET /stats/items?latestLocation=H1` | All H1 + H1:* items | — | — |
| `GET /stats/items?latestLocation=H1:1` | — | H1 items (fallback) | — |
| `GET /stats/items?latestLocation=H1:2` | — | — | H1:2 items only |
| `GET /stats/time-patterns?latestLocation=H1` | All H1 + H1:* | — | — |
