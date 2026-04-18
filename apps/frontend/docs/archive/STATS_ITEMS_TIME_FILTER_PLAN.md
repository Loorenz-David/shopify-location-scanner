# Stats Items — Hour & Weekday Drill-down Plan

Extends the time patterns chart so clicking a bar opens the `StatsItemsOverlay`
showing the actual items behind that time slot.

Backend adds two new optional query params to `GET /stats/items`:
- `hourOfDay` (integer 0–23) — items where `strftime('%H', lastModifiedAt) = hour`
- `weekday` (integer 0–6, 0=Sun) — items where `strftime('%w', lastModifiedAt) = weekday`

Both combine with the existing `from`/`to` date range and all other filters.

---

## 1. Extend `StatsItemsQuery` type

File: `apps/frontend/src/features/analytics/types/stats-items.types.ts`

Add two optional fields to `StatsItemsQuery`:

```ts
export type StatsItemsQuery = {
  // ... existing fields unchanged ...
  hourOfDay?: number;   // 0–23
  weekday?: number;     // 0–6 (0 = Sunday)
};
```

---

## 2. Extend `buildStatsItemsQuery`

File: `apps/frontend/src/features/analytics/domain/build-stats-items-query.domain.ts`

Add after the existing `volumeLabel` block:

```ts
if (query.hourOfDay !== undefined)
  params.set("hourOfDay", String(query.hourOfDay));
if (query.weekday !== undefined)
  params.set("weekday", String(query.weekday));
```

---

## 3. Add `onBarClick` props to `SalesTimePatternsChart`

File: `apps/frontend/src/features/analytics/components/charts/SalesTimePatternsChart.tsx`

### 3a. Extend props interface

```ts
interface SalesTimePatternsChartProps {
  data: TimePatterns;
  metric: "itemsSold" | "revenue";
  onHourClick?: (hour: number, label: string) => void;
  onWeekdayClick?: (weekday: number, label: string) => void;
}
```

### 3b. Wire click handlers to Recharts `<Bar>`

For the hour chart, add to `<Bar>`:
```tsx
onMouseDown={(entry) => {
  const pt = (entry as { payload?: TimePatternHourPoint }).payload;
  if (pt) onHourClick?.(pt.hour, pt.label);
}}
onTouchStart={(entry) => {
  const pt = (entry as { payload?: TimePatternHourPoint }).payload;
  if (pt) onHourClick?.(pt.hour, pt.label);
}}
onClick={(entry) => {
  const pt = (entry as { payload?: TimePatternHourPoint }).payload;
  if (pt) onHourClick?.(pt.hour, pt.label);
}}
```

For the weekday chart, same pattern using `TimePatternWeekdayPoint` and `onWeekdayClick`.

### 3c. Visual affordance — cursor pointer when handlers are present

Wrap `<BarChart>` in a `<div>` with `className={onHourClick ? "cursor-pointer" : ""}`.
Do the same for the weekday chart with `onWeekdayClick`.

---

## 4. Wire drill-down in AnalyticsPage (global context)

File: `apps/frontend/src/features/analytics/pages/AnalyticsPage.tsx`

Inside the `<SalesTimePatternsChart>` usage, add the two callbacks:

```tsx
<SalesTimePatternsChart
  data={timePatterns}
  metric={timePatternsMetric}
  onHourClick={(hour, label) =>
    statsItemsOverlayActions.open({
      query: {
        isSold: true,
        from: dateRange.from,
        to: dateRange.to,
        hourOfDay: hour,
        sortBy: "lastModifiedAt",
        sortDir: "desc",
      },
      cardMode: "with-channel",
      title: `Sales at ${label}`,
    })
  }
  onWeekdayClick={(weekday, label) =>
    statsItemsOverlayActions.open({
      query: {
        isSold: true,
        from: dateRange.from,
        to: dateRange.to,
        weekday,
        sortBy: "lastModifiedAt",
        sortDir: "desc",
      },
      cardMode: "with-channel",
      title: `Sales on ${label}s`,
    })
  }
/>
```

---

## 5. Wire drill-down in ZoneStatsPanel

File: `apps/frontend/src/features/analytics/components/panels/ZoneStatsPanel.tsx`

Inside the `<SalesTimePatternsChart>` usage, add callbacks scoped to the zone:

```tsx
<SalesTimePatternsChart
  data={zoneTimePatterns}
  metric={zonePatternsMetric}
  onHourClick={(hour, label) =>
    statsItemsOverlayActions.open({
      query: {
        isSold: true,
        latestLocation: selectedZone,
        from: zoneDateRange.from,
        to: zoneDateRange.to,
        hourOfDay: hour,
        sortBy: "lastModifiedAt",
        sortDir: "desc",
      },
      cardMode: "zone-standard",
      title: `${selectedZone} — Sales at ${label}`,
    })
  }
  onWeekdayClick={(weekday, label) =>
    statsItemsOverlayActions.open({
      query: {
        isSold: true,
        latestLocation: selectedZone,
        from: zoneDateRange.from,
        to: zoneDateRange.to,
        weekday,
        sortBy: "lastModifiedAt",
        sortDir: "desc",
      },
      cardMode: "zone-standard",
      title: `${selectedZone} — Sales on ${label}s`,
    })
  }
/>
```

---

## 6. Wire drill-down in CategoryStatsPanel

File: `apps/frontend/src/features/analytics/components/panels/CategoryStatsPanel.tsx`

Inside the `<SalesTimePatternsChart>` usage, add callbacks scoped to the category:

```tsx
<SalesTimePatternsChart
  data={categoryTimePatterns}
  metric={categoryPatternsMetric}
  onHourClick={(hour, label) =>
    statsItemsOverlayActions.open({
      query: {
        isSold: true,
        itemCategory: selectedCategory,
        from: categoryDateRange.from,
        to: categoryDateRange.to,
        hourOfDay: hour,
        sortBy: "lastModifiedAt",
        sortDir: "desc",
      },
      cardMode: "sold-default",
      title: `${selectedCategory} — Sales at ${label}`,
    })
  }
  onWeekdayClick={(weekday, label) =>
    statsItemsOverlayActions.open({
      query: {
        isSold: true,
        itemCategory: selectedCategory,
        from: categoryDateRange.from,
        to: categoryDateRange.to,
        weekday,
        sortBy: "lastModifiedAt",
        sortDir: "desc",
      },
      cardMode: "sold-default",
      title: `${selectedCategory} — Sales on ${label}s`,
    })
  }
/>
```

---

## Notes for Codex

- `statsItemsOverlayActions` is imported from `../../actions/stats-items-overlay.actions` (already imported in `AnalyticsPage`; needs to be imported in the panel files).
- `categoryDateRange` is already in the store and read in `CategoryStatsPanel` — use it directly.
- `selectedZone` and `zoneDateRange` are already in scope in `ZoneStatsPanel`.
- Bars with `itemsSold === 0` should still be clickable — the overlay will just show "no items" which is valid feedback.
- Do not add a selected-bar highlight state — the overlay opening is enough feedback.
- The `onHourClick`/`onWeekdayClick` props are optional — if omitted the chart is read-only (safe default for future reuse).
