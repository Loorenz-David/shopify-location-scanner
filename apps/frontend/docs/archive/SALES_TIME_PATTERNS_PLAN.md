# Sales Time Patterns — Frontend Implementation Plan

Backend endpoint: `GET /stats/time-patterns?from=&to=&salesChannel=&latestLocation=&itemCategory=`

All params except `from`/`to` are optional and combinable.
Codex should implement all steps below in order. The pattern follows exactly
how the existing velocity, channel, and dimension charts are wired.

---

## Contexts

The chart appears in **three places**:

| Context | Filter params | Date range used | Store slice |
|---|---|---|---|
| Global (`AnalyticsPage`) | none | `dateRange` | `timePatterns` |
| Zone panel (`ZoneStatsPanel`) | `latestLocation=K2` | `zoneDateRange` | `zoneTimePatterns` |
| Category panel (`CategoryStatsPanel`) | `itemCategory=dining_chair` | `categoryDateRange` | `categoryTimePatterns` |

---

## 1. Add types to `analytics.types.ts`

File: `apps/frontend/src/features/analytics/types/analytics.types.ts`

Add at the bottom:

```ts
export type TimePatternHourPoint = {
  hour: number;       // 0–23
  label: string;      // "00:00", "01:00" … "23:00"
  itemsSold: number;
  revenue: number;
  isPeak: boolean;    // true on the single highest itemsSold hour
};

export type TimePatternWeekdayPoint = {
  weekday: number;    // 0=Sun … 6=Sat
  label: string;      // "Sun", "Mon" … "Sat"
  itemsSold: number;
  revenue: number;
  isPeak: boolean;    // true on the single highest itemsSold weekday
};

export type TimePatterns = {
  byHour: TimePatternHourPoint[];
  byWeekday: TimePatternWeekdayPoint[];
};
```

---

## 2. Add state to the analytics store

File: `apps/frontend/src/features/analytics/stores/analytics.store.ts`

### 2a. Import the new type
```ts
import type {
  ...,
  TimePatterns,
} from "../types/analytics.types";
```

### 2b. Add to `AnalyticsStoreState` interface
```ts
timePatterns: TimePatterns | null;
zoneTimePatterns: TimePatterns | null;
categoryTimePatterns: TimePatterns | null;
setTimePatterns: (data: TimePatterns | null) => void;
setZoneTimePatterns: (data: TimePatterns | null) => void;
setCategoryTimePatterns: (data: TimePatterns | null) => void;
```

### 2c. Add to `initialState`
```ts
timePatterns: null,
zoneTimePatterns: null,
categoryTimePatterns: null,
```

### 2d. Add setters in `create()`
```ts
setTimePatterns: (timePatterns) => set({ timePatterns }),
setZoneTimePatterns: (zoneTimePatterns) => set({ zoneTimePatterns }),
setCategoryTimePatterns: (categoryTimePatterns) => set({ categoryTimePatterns }),
```

### 2e. Clear derived slices when the primary selection resets.
In `setSelectedZone`:
```ts
setSelectedZone: (selectedZone) =>
  set((state) => ({
    selectedZone,
    zoneDetail: null,
    zoneTimePatterns: null,          // ← add
    zoneDateRange: selectedZone ? state.dateRange : state.zoneDateRange,
  })),
```
In `setSelectedCategory`:
```ts
setSelectedCategory: (selectedCategory) =>
  set((state) => ({
    selectedCategory,
    categoryDetail: null,
    categoryTimePatterns: null,      // ← add
    categoryDateRange: selectedCategory ? state.dateRange : state.categoryDateRange,
  })),
```

### 2f. Add selectors at the bottom of the file
```ts
export const selectAnalyticsTimePatterns = (state: AnalyticsStoreState) =>
  state.timePatterns;
export const selectAnalyticsZoneTimePatterns = (state: AnalyticsStoreState) =>
  state.zoneTimePatterns;
export const selectAnalyticsCategoryTimePatterns = (state: AnalyticsStoreState) =>
  state.categoryTimePatterns;
```

---

## 3. Create the API function

New file: `apps/frontend/src/features/analytics/apis/get-time-patterns.api.ts`

```ts
import { apiClient } from "../../../core/api-client";
import type { SalesChannel, TimePatterns } from "../types/analytics.types";

export interface GetTimePatternsOptions {
  from: string;
  to: string;
  salesChannel?: SalesChannel;
  latestLocation?: string;
  itemCategory?: string;
}

export async function getTimePatternsApi(
  opts: GetTimePatternsOptions,
): Promise<TimePatterns> {
  const params = new URLSearchParams({ from: opts.from, to: opts.to });
  if (opts.salesChannel) params.set("salesChannel", opts.salesChannel);
  if (opts.latestLocation) params.set("latestLocation", opts.latestLocation);
  if (opts.itemCategory) params.set("itemCategory", opts.itemCategory);

  const response = await apiClient.get<{ data: TimePatterns }>(
    `/stats/time-patterns?${params.toString()}`,
    { requiresAuth: true },
  );
  return response.data;
}
```

---

## 4. Wire into flows

### 4a. Global — `use-analytics-page.flow.ts`

Import:
```ts
import { getTimePatternsApi } from "../apis/get-time-patterns.api";
```

Pull setter:
```ts
const setTimePatterns = useAnalyticsStore((state) => state.setTimePatterns);
```

Add to the `Promise.all` inside `load()`:
```ts
const [zonesOverview, insights, categories, dimensions, channelOverview, timePatterns] =
  await Promise.all([
    getZonesOverviewApi(from, to),
    getSmartInsightsApi(from, to),
    getCategoriesOverviewApi(from, to),
    getDimensionsStatsApi(from, to),
    getSalesChannelOverviewApi(from, to),
    getTimePatternsApi({ from, to }),
  ]);

setTimePatterns(timePatterns);
```

Add `setTimePatterns` to the `useCallback` dependency array.

---

### 4b. Zone panel — `use-zone-detail.flow.ts`

Import:
```ts
import { getTimePatternsApi } from "../apis/get-time-patterns.api";
```

Pull setter:
```ts
const setZoneTimePatterns = useAnalyticsStore((state) => state.setZoneTimePatterns);
```

Inside `load()`, fetch in parallel with zoneDetail:
```ts
const [zoneDetail, zoneTimePatterns] = await Promise.all([
  getZoneDetailApi(selectedZone, zoneDateRange.from, zoneDateRange.to),
  getTimePatternsApi({ from: zoneDateRange.from, to: zoneDateRange.to, latestLocation: selectedZone }),
]);

if (!isDisposed) {
  setZoneDetail(zoneDetail);
  setZoneTimePatterns(zoneTimePatterns);
}
```

Add `setZoneTimePatterns` to the `useEffect` dependency array.

---

### 4c. Category panel — `use-category-detail.flow.ts`

Import:
```ts
import { getTimePatternsApi } from "../apis/get-time-patterns.api";
```

Pull setter and date range:
```ts
const setCategoryTimePatterns = useAnalyticsStore((state) => state.setCategoryTimePatterns);
const categoryDateRange = useAnalyticsStore(selectAnalyticsCategoryDateRange);
```

Inside `load()`, fetch in parallel with category detail:
```ts
const [categoryDetail, categoryTimePatterns] = await Promise.all([
  getCategoryByLocationApi(selectedCategory, categoryDateRange.from, categoryDateRange.to),
  getTimePatternsApi({ from: categoryDateRange.from, to: categoryDateRange.to, itemCategory: selectedCategory }),
]);

if (!isDisposed) {
  setCategoryDetail(categoryDetail);
  setCategoryTimePatterns(categoryTimePatterns);
}
```

Add `setCategoryTimePatterns` and `categoryDateRange` to dependency arrays.

---

## 5. Create the chart component

New file: `apps/frontend/src/features/analytics/components/charts/SalesTimePatternsChart.tsx`

### Props
```ts
interface SalesTimePatternsChartProps {
  data: TimePatterns;
  metric: "itemsSold" | "revenue";
}
```

### Color logic
- Default bar fill: `#6366f1` (indigo — matches channel/velocity accent)
- Peak bar fill: `#f59e0b` (amber)
- Use Recharts `<Cell>` per bar to apply peak color, same pattern as `SalesChannelChart`

### Structure
```tsx
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatKr } from "../../domain/format-currency.domain";
import type { TimePatterns } from "../../types/analytics.types";

export function SalesTimePatternsChart({ data, metric }: SalesTimePatternsChartProps) {
  const formatY = (v: number) => metric === "revenue" ? formatKr(v) : String(v);

  const peakHour = data.byHour.find((p) => p.isPeak);
  const peakWeekday = data.byWeekday.find((p) => p.isPeak);

  return (
    <div className="flex flex-col gap-6">
      {/* Hour of day */}
      <section>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
          Hour of day
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart
            accessibilityLayer={false}
            data={data.byHour}
            margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
          >
            <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={2} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={formatY} width={40} />
            <Tooltip content={() => null} cursor={false} />
            <Bar
              dataKey={metric}
              radius={[3, 3, 0, 0]}
              isAnimationActive
              animationBegin={0}
              animationDuration={400}
              animationEasing="ease-out"
            >
              {data.byHour.map((pt) => (
                <Cell key={pt.hour} fill={pt.isPeak ? "#f59e0b" : "#6366f1"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {peakHour && peakHour.itemsSold > 0 ? (
          <p className="m-0 mt-1 text-xs font-semibold text-amber-600">
            Peak: {peakHour.label}
          </p>
        ) : null}
      </section>

      {/* Day of week */}
      <section>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
          Day of week
        </p>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart
            accessibilityLayer={false}
            data={data.byWeekday}
            margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
          >
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={formatY} width={40} />
            <Tooltip content={() => null} cursor={false} />
            <Bar
              dataKey={metric}
              radius={[3, 3, 0, 0]}
              isAnimationActive
              animationBegin={0}
              animationDuration={400}
              animationEasing="ease-out"
            >
              {data.byWeekday.map((pt) => (
                <Cell key={pt.weekday} fill={pt.isPeak ? "#f59e0b" : "#6366f1"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        {peakWeekday && peakWeekday.itemsSold > 0 ? (
          <p className="m-0 mt-1 text-xs font-semibold text-amber-600">
            Peak: {peakWeekday.label}
          </p>
        ) : null}
      </section>
    </div>
  );
}
```

---

## 6. Add to AnalyticsPage (global)

File: `apps/frontend/src/features/analytics/pages/AnalyticsPage.tsx`

### 6a. Imports
```ts
import { SalesTimePatternsChart } from "../components/charts/SalesTimePatternsChart";
import {
  selectAnalyticsTimePatterns,
  // ... existing imports
} from "../stores/analytics.store";
```

### 6b. State + store read
```ts
const [timePatternsMetric, setTimePatternsMetric] = useState<"itemsSold" | "revenue">("itemsSold");
const timePatterns = useAnalyticsStore(selectAnalyticsTimePatterns);
```

### 6c. Section placement
Insert **after** the "Sales over time" `<InfoSheet>` and **before** the "Categories" section:

```tsx
{timePatterns ? (
  <div className="pb-4">
    <div className="mb-2 flex items-center justify-between gap-3">
      <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        Sales time patterns
      </p>
      <div className="flex gap-1">
        {(["itemsSold", "revenue"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setTimePatternsMetric(m)}
            className={`rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${
              timePatternsMetric === m
                ? "border-indigo-600 bg-indigo-600 text-white"
                : "border-slate-200 text-slate-500"
            }`}
          >
            {m === "itemsSold" ? "Items" : "Revenue"}
          </button>
        ))}
      </div>
    </div>
    <div className="rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
      <SalesTimePatternsChart data={timePatterns} metric={timePatternsMetric} />
    </div>
  </div>
) : null}
```

---

## 7. Add to ZoneStatsPanel

File: `apps/frontend/src/features/analytics/components/panels/ZoneStatsPanel.tsx`

### 7a. Imports
```ts
import { SalesTimePatternsChart } from "../charts/SalesTimePatternsChart";
import { selectAnalyticsZoneTimePatterns } from "../../stores/analytics.store";
```

### 7b. State + store read (inside `ZoneStatsPanel`)
```ts
const [zonePatternsMetric, setZonePatternsMetric] = useState<"itemsSold" | "revenue">("itemsSold");
const zoneTimePatterns = useAnalyticsStore(selectAnalyticsZoneTimePatterns);
```

### 7c. Section placement
Add **after** the "Sales over time" section inside the `zoneDetail ?` block (before the closing `</div>`):

```tsx
{zoneTimePatterns ? (
  <div className="pb-2">
    <div className="mb-2 flex items-center justify-between gap-2">
      <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        Time patterns
      </p>
      <div className="flex gap-1">
        {(["itemsSold", "revenue"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setZonePatternsMetric(m)}
            className={`rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors ${
              zonePatternsMetric === m
                ? "border-indigo-500 bg-indigo-500 text-white"
                : "border-slate-200 text-slate-500"
            }`}
          >
            {m === "itemsSold" ? "Items" : "Revenue"}
          </button>
        ))}
      </div>
    </div>
    <div className="rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
      <SalesTimePatternsChart data={zoneTimePatterns} metric={zonePatternsMetric} />
    </div>
  </div>
) : null}
```

---

## 8. Add to CategoryStatsPanel

File: `apps/frontend/src/features/analytics/components/panels/CategoryStatsPanel.tsx`

### 8a. Imports
```ts
import { useState } from "react";
import { SalesTimePatternsChart } from "../charts/SalesTimePatternsChart";
import { selectAnalyticsCategoryTimePatterns } from "../../stores/analytics.store";
```

### 8b. State + store read (inside `CategoryStatsPanel`)
```ts
const [categoryPatternsMetric, setCategoryPatternsMetric] = useState<"itemsSold" | "revenue">("itemsSold");
const categoryTimePatterns = useAnalyticsStore(selectAnalyticsCategoryTimePatterns);
```

### 8c. Section placement
Add **after** the "Performance by location" section inside the loaded state block:

```tsx
{categoryTimePatterns ? (
  <div>
    <div className="mb-2 flex items-center justify-between gap-2">
      <p className="m-0 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
        Time patterns
      </p>
      <div className="flex gap-1">
        {(["itemsSold", "revenue"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setCategoryPatternsMetric(m)}
            className={`rounded-full border px-2 py-0.5 text-xs font-semibold transition-colors ${
              categoryPatternsMetric === m
                ? "border-sky-500 bg-sky-500 text-white"
                : "border-slate-200 text-slate-500"
            }`}
          >
            {m === "itemsSold" ? "Items" : "Revenue"}
          </button>
        ))}
      </div>
    </div>
    <div className="rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
      <SalesTimePatternsChart data={categoryTimePatterns} metric={categoryPatternsMetric} />
    </div>
  </div>
) : null}
```

---

---

## 9. Channel split — global AnalyticsPage only

The global chart (step 6) should support splitting data into Physical vs Webshop
bars side by side. Zone and category panels are scoped by location/category already
so channel split is not needed there.

### 9a. Store additions

In `analytics.store.ts`, add:

```ts
// Interface
timePatternsCompare: { physical: TimePatterns; webshop: TimePatterns } | null;
setTimePatternsCompare: (data: { physical: TimePatterns; webshop: TimePatterns } | null) => void;

// initialState
timePatternsCompare: null,

// setter
setTimePatternsCompare: (timePatternsCompare) => set({ timePatternsCompare }),

// selector
export const selectAnalyticsTimePatternsCompare = (state: AnalyticsStoreState) =>
  state.timePatternsCompare;
```

Also clear it on date range change — add `timePatternsCompare: null` to `setDateRange`.

### 9b. Channel mode state in AnalyticsPage

```ts
const [timePatternsChannel, setTimePatternsChannel] = useState<
  "all" | "physical" | "webshop" | "compare"
>("all");
const timePatternsCompare = useAnalyticsStore(selectAnalyticsTimePatternsCompare);
```

### 9c. Fetch logic in `use-analytics-page.flow.ts`

Pull the new setter:
```ts
const setTimePatternsCompare = useAnalyticsStore((state) => state.setTimePatternsCompare);
```

Add a separate `useEffect` that re-fetches when `timePatternsChannel` changes.
This effect is driven by a `timePatternsChannel` prop/param passed down from
`AnalyticsPage` — but since the flow is a hook, use a callback approach:

In `useAnalyticsPageFlow`, expose a `loadTimePatternsForChannel` function:

```ts
const loadTimePatternsForChannel = useCallback(
  async (channel: "all" | "physical" | "webshop" | "compare") => {
    const { from, to } = dateRange;

    if (channel === "compare") {
      const [physical, webshop] = await Promise.all([
        getTimePatternsApi({ from, to, salesChannel: "physical" }),
        getTimePatternsApi({ from, to, salesChannel: "webshop" }),
      ]);
      setTimePatternsCompare({ physical, webshop });
      setTimePatterns(physical); // show physical as base while compare renders
    } else {
      setTimePatternsCompare(null);
      const data = await getTimePatternsApi({
        from,
        to,
        salesChannel: channel === "all" ? undefined : channel,
      });
      setTimePatterns(data);
    }
  },
  [dateRange, setTimePatterns, setTimePatternsCompare],
);
```

Return `loadTimePatternsForChannel` from the hook so `AnalyticsPage` can call it
when the user changes the channel tab.

Also call `loadTimePatternsForChannel("all")` inside the main `load()` (replaces the
current `getTimePatternsApi({ from, to })` call).

### 9d. Channel tab controls in AnalyticsPage

Add a second row of controls below the Items/Revenue toggle in the time patterns section:

```tsx
<div className="flex flex-wrap gap-1">
  {(["all", "physical", "webshop", "compare"] as const).map((ch) => (
    <button
      key={ch}
      type="button"
      onClick={() => {
        setTimePatternsChannel(ch);
        void floorMap.reload?.() // no-op, use the exposed callback instead:
        void loadTimePatternsForChannel(ch);
      }}
      className={`rounded-full border px-2 py-1 text-xs font-semibold transition-colors ${
        timePatternsChannel === ch
          ? "border-indigo-600 bg-indigo-600 text-white"
          : "border-slate-200 text-slate-500"
      }`}
    >
      {ch === "all" ? "All" : ch === "compare" ? "Compare" : ch.charAt(0).toUpperCase() + ch.slice(1)}
    </button>
  ))}
</div>
```

### 9e. Pass compare data to the chart

```tsx
<SalesTimePatternsChart
  data={timePatterns}
  metric={timePatternsMetric}
  compareData={timePatternsChannel === "compare" ? timePatternsCompare : null}
  onHourClick={...}
  onWeekdayClick={...}
/>
```

### 9f. Grouped bar rendering in `SalesTimePatternsChart`

Add `compareData` prop:
```ts
interface SalesTimePatternsChartProps {
  data: TimePatterns;
  metric: "itemsSold" | "revenue";
  compareData?: { physical: TimePatterns; webshop: TimePatterns } | null;
  onHourClick?: (hour: number, label: string) => void;
  onWeekdayClick?: (weekday: number, label: string) => void;
}
```

When `compareData` is provided, **merge** the hour arrays into one dataset
with `physical` and `webshop` keys, and render two `<Bar>` components:

```ts
// Build merged dataset for grouped bar chart
const hourCompareData = compareData
  ? data.byHour.map((pt, i) => ({
      label: pt.label,
      physical: compareData.physical.byHour[i]?.[metric] ?? 0,
      webshop: compareData.webshop.byHour[i]?.[metric] ?? 0,
    }))
  : null;

const weekdayCompareData = compareData
  ? data.byWeekday.map((pt, i) => ({
      label: pt.label,
      physical: compareData.physical.byWeekday[i]?.[metric] ?? 0,
      webshop: compareData.webshop.byWeekday[i]?.[metric] ?? 0,
    }))
  : null;
```

When `hourCompareData` is not null, render two `<Bar>` instead of one:
```tsx
{hourCompareData ? (
  <>
    <Bar dataKey="physical" name="Physical" fill="#22c55e" radius={[3, 3, 0, 0]}
      isAnimationActive animationBegin={0} animationDuration={400} />
    <Bar dataKey="webshop" name="Webshop" fill="#6366f1" radius={[3, 3, 0, 0]}
      isAnimationActive animationBegin={0} animationDuration={400} />
  </>
) : (
  <Bar dataKey={metric} radius={[3, 3, 0, 0]} isAnimationActive animationBegin={0} animationDuration={400}>
    {data.byHour.map((pt) => (
      <Cell key={pt.hour} fill={pt.isPeak ? "#f59e0b" : "#6366f1"} />
    ))}
  </Bar>
)}
```

Same pattern for the weekday chart using `weekdayCompareData`.

Colors match the existing velocity compare: Physical = `#22c55e` (green), Webshop = `#6366f1` (indigo).

Peak highlight (`isPeak` / amber bar) is shown only in non-compare mode — in compare mode the two-color grouping is self-explanatory.

---

## Notes for Codex

- `isPeak` is computed by the backend — do not recompute on the frontend.
- `interval={2}` on the hour XAxis avoids label overlap on narrow screens (shows every 3rd label: 00:00, 03:00, …).
- Zone panel uses `teal` as its accent color for existing controls — match that for the metric toggle there (`border-teal-500 bg-teal-500`).
- Category panel uses `sky` as its accent — match for the metric toggle there.
- Global analytics page uses `indigo` — match for the metric toggle there.
- The section is hidden (`=== null`) until data arrives — no loading skeleton needed. This matches how `dimensions` is handled.
- Peak callout (`Peak: 14:00`) is hidden when `itemsSold === 0` on all slots (no data in range), and also hidden in compare mode.
- Do not add a channel filter to the zone or category panels — the endpoint already scopes to `latestLocation` / `itemCategory` which is the meaningful dimension there.
- In compare mode, `onHourClick`/`onWeekdayClick` should still fire but without a `lastSoldChannel` filter (the overlay will show all channels for that time slot). This keeps the click behaviour consistent across modes.
