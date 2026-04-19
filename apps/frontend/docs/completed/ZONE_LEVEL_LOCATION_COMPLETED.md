# Zone Level Location — Frontend Implementation

## Overview

The analytics zone panel now supports multi-level shelf locations. When a zone
has levelled data (e.g. `H1:1`, `H1:2`), a **Floor** selector appears in the
panel. The user can view all floors aggregated or drill into a specific floor.
Single-level zones are unaffected — no UI change.

---

## User Flow

1. User taps a zone on the map (e.g. `H1`)
2. Zone stats panel slides in, fetches `GET /stats/zones/H1`
3. If the response includes `levels: [{level:"H1:1",...}, {level:"H1:2",...}]`:
   - A **Floor** pill row appears between the header and date picker
   - Pills: `All` | `H1:1` | `H1:2`
4. Tapping a level pill re-fetches `GET /stats/zones/H1:2`
   - All charts, KPIs, and "show items" actions update for that floor only
5. Tapping `All` returns to the aggregated zone view
6. Closing and re-opening the zone resets to `All`

---

## Files Changed

### `src/features/analytics/types/analytics.types.ts`

```typescript
// ZoneOverviewItem — added:
levelCount: number;

// New type:
type ZoneLevelBreakdown = {
  level: string;           // "H1:2"
  itemsSold: number;
  itemsReceived: number;
  revenue: number;
  avgTimeToSellSeconds: number | null;
};

// ZoneDetail — added:
isLevelView: boolean;      // true when fetched as a specific level
levels: ZoneLevelBreakdown[] | null;
```

### `src/features/analytics/stores/analytics.store.ts`

Two new state slices added:

| Field | Type | Purpose |
|-------|------|---------|
| `selectedZoneLevel` | `string \| null` | Active level pill. `null` = "All" |
| `zoneLevels` | `ZoneLevelBreakdown[] \| null` | Tab list. Persists across level drill-downs |

**`setSelectedZone`** — clears both `selectedZoneLevel` and `zoneLevels` on zone change.

**`setSelectedZoneLevel`** — clears `zoneDetail` and `zoneTimePatterns` to trigger a
re-fetch with the new effective location.

**`setZoneLevels`** — called by the flow after a zone-level fetch that returns levels.

New selectors:
- `selectAnalyticsSelectedZoneLevel`
- `selectAnalyticsZoneLevels`

### `src/features/analytics/flows/use-zone-detail.flow.ts`

**Effective location** — `selectedZoneLevel ?? selectedZone`

- If `selectedZoneLevel` is null: fetches the full zone (`"H1"`)
- If `selectedZoneLevel` is set: fetches that level (`"H1:2"`)

**`zoneLevels` population** — after a zone-level fetch (not a level drill-down),
if `zoneDetail.levels` is non-null, calls `setZoneLevels(zoneDetail.levels)`.
This stores the tab list so it remains visible while viewing a specific level
(where `zoneDetail.levels` is null).

Effect dependencies include `selectedZoneLevel` so the fetch re-runs on level change.

### `src/features/analytics/components/panels/ZoneStatsPanel.tsx`

Floor selector rendered between header and date picker:

```tsx
{zoneLevels && zoneLevels.length > 0 ? (
  <div className="border-b border-slate-900/10 px-4 py-2">
    <p className="mb-1.5 text-[10px] ...">Floor</p>
    <div className="flex flex-wrap gap-1.5">
      <button onClick={() => setSelectedZoneLevel(null)}>All</button>
      {zoneLevels.map(l => (
        <button key={l.level} onClick={() => setSelectedZoneLevel(l.level)}>
          {l.level}
        </button>
      ))}
    </div>
  </div>
) : null}
```

Active pill: teal background. Inactive: slate border.
Hidden entirely when `zoneLevels` is null or empty (single-level zone).

---

## State Flow Diagram

```
User taps zone "H1"
  → setSelectedZone("H1")        clears selectedZoneLevel, zoneLevels, zoneDetail
  → flow effect fires
  → fetch GET /stats/zones/H1
  → setZoneDetail(data)
  → setZoneLevels(data.levels)   ["H1:1", "H1:2"] now in store
  → Floor pills render

User taps "H1:2" pill
  → setSelectedZoneLevel("H1:2") clears zoneDetail
  → flow effect fires (selectedZoneLevel changed)
  → fetch GET /stats/zones/H1:2
  → setZoneDetail(data)          isLevelView: true, levels: null
  → zoneLevels unchanged         pills still visible

User taps "All" pill
  → setSelectedZoneLevel(null)   clears zoneDetail
  → flow effect fires
  → fetch GET /stats/zones/H1
  → setZoneDetail(data)
  → setZoneLevels(data.levels)   refreshes tab list

User closes panel
  → setSelectedZone(null)        clears everything
```

---

## "Show Items" Actions

All `statsItemsOverlayActions.open(...)` calls inside `ZoneStatsPanel` pass
`latestLocation: selectedZone` (the zone prefix, not the level). The backend
`buildWhere` will expand this to match all levels. When the user is in level
view, the KPI buttons pass `latestLocation: selectedZone` still — to show
all items for the zone. If a level-specific items list is needed in the future,
pass `latestLocation: selectedZoneLevel ?? selectedZone` instead.

---

## Debugging Notes

**Floor pills not showing:**
- Check `zoneDetail.levels` in the store — is it non-null with entries?
- The flow only calls `setZoneLevels` when `!selectedZoneLevel && zoneDetail.levels`
- If the zone only has one location string in DB (e.g. only `H1`, no `H1:2`),
  `levels` will be `null` and pills will not render

**Level drill-down returns no data:**
- Backend resolves `"H1:1"` → bare `"H1"` only when `"H1:1"` is not in DB
- Check that the bare `H1` record exists in `locationStatsDaily`
- `"H1:2"` is exact match — must exist in `locationStatsDaily`

**Pills disappear after selecting a level:**
- `zoneLevels` should persist across level drill-downs
- `setSelectedZoneLevel` only clears `zoneDetail`, not `zoneLevels`
- If pills disappear, check that `setSelectedZone` is not being called instead

**Wrong location passed to items overlay:**
- `statsItemsOverlayActions` passes `latestLocation: zone` (the zone prefix)
- Backend `buildWhere` expands this to all levels via OR clause
