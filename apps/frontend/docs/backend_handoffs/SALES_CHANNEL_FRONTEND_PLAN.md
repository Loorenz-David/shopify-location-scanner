# Sales Channel Frontend Implementation Plan

## What Changes and Why

The backend now classifies every sold item into a normalized sales channel:
`webshop`, `physical`, `imported`, or `unknown`. Zone stats are now physical-only.
A new endpoint (`GET /stats/channels`) provides the cross-channel breakdown.

The frontend needs to:
1. Show the channel breakdown on the analytics page
2. Let users filter the scan history list by channel
3. Add a "Physical only" label to zone stats so users understand what they're looking at
4. Let users toggle the velocity chart between "all channels" and a single channel

Related backend plan: `docs/under_development/SALES_CHANNEL_BACKEND_PLAN.md`
Related analytics plan: `docs/front_end_handoffs/STATS_FRONTEND_PLAN.md`

---

## New Types

**File:** `src/features/analytics/types/analytics.types.ts` — add:

```typescript
export type SalesChannel = "webshop" | "physical" | "imported" | "unknown";

export type SalesChannelOverviewItem = {
  salesChannel: SalesChannel;
  itemsSold: number;
  totalRevenue: number;
};
```

---

## New API File

**File:** `src/features/analytics/apis/get-sales-channel-overview.api.ts`

```typescript
import { apiClient } from "../../../core/api-client";
import type { SalesChannelOverviewItem } from "../types/analytics.types";

export async function getSalesChannelOverviewApi(
  from: string,
  to: string,
): Promise<SalesChannelOverviewItem[]> {
  const res = await apiClient.get<{ data: SalesChannelOverviewItem[] }>(
    `/stats/channels?from=${from}&to=${to}`,
    { requiresAuth: true },
  );
  return res.data;
}
```

**File:** `src/features/analytics/apis/get-sales-velocity.api.ts` — update to accept optional channel:

```typescript
export async function getSalesVelocityApi(
  from: string,
  to: string,
  salesChannel?: SalesChannel,
): Promise<VelocityPoint[]> {
  const channelParam = salesChannel ? `&salesChannel=${salesChannel}` : "";
  const res = await apiClient.get<{ data: VelocityPoint[] }>(
    `/stats/velocity?from=${from}&to=${to}${channelParam}`,
    { requiresAuth: true },
  );
  return res.data;
}
```

---

## Analytics Store — Additions

**File:** `src/features/analytics/stores/analytics.store.ts`

Add to `AnalyticsStore` type:

```typescript
channelOverview: SalesChannelOverviewItem[];
velocityChannel: SalesChannel | "all";    // filter for the velocity chart

setChannelOverview: (data: SalesChannelOverviewItem[]) => void;
setVelocityChannel: (channel: SalesChannel | "all") => void;
```

Add to initial state:

```typescript
channelOverview: [],
velocityChannel: "all",
```

Add setters:

```typescript
setChannelOverview: (data) => set({ channelOverview: data }),
setVelocityChannel: (channel) => set({ velocityChannel: channel }),
```

On `setDateRange`, also reset velocity channel:

```typescript
setDateRange: (range) => set({
  dateRange: range,
  selectedZone: null,
  zoneDetail: null,
  selectedCategory: null,
  categoryDetail: null,
  velocityChannel: "all",   // ADD
}),
```

---

## Update `use-analytics-page.flow.ts`

Add `getSalesChannelOverviewApi` to the parallel load:

```typescript
import { getSalesChannelOverviewApi } from "../apis/get-sales-channel-overview.api";

// Inside load():
const [overview, insights, velocity, categories, dimensions, channelOverview] =
  await Promise.all([
    getZonesOverviewApi(from, to),
    getSmartInsightsApi(from, to),
    getSalesVelocityApi(from, to),   // "all" default — no channel filter
    getCategoriesOverviewApi(from, to),
    getDimensionsStatsApi(from, to),
    getSalesChannelOverviewApi(from, to),
  ]);

store.setZonesOverview(overview);
store.setInsights(insights);
store.setVelocity(velocity);
store.setCategories(categories);
store.setDimensions(dimensions);
store.setChannelOverview(channelOverview);
```

Also handle the velocity channel toggle — when the user switches channels, re-fetch
velocity independently without reloading everything:

```typescript
// Add below the main load effect:
const { velocityChannel, dateRange } = store;

useEffect(() => {
  const { from, to } = dateRange;
  const channel = velocityChannel === "all" ? undefined : velocityChannel;
  getSalesVelocityApi(from, to, channel).then(store.setVelocity);
}, [velocityChannel, dateRange]);
```

---

## New Chart: `SalesChannelChart`

**File:** `src/features/analytics/components/charts/SalesChannelChart.tsx`

A donut-style or horizontal bar chart showing the channel split. Use a horizontal bar
(consistent with the rest of the charts in this feature).

```tsx
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { SalesChannelOverviewItem } from "../../types/analytics.types";

const CHANNEL_COLORS: Record<string, string> = {
  physical: "#22c55e",
  webshop:  "#6366f1",
  imported: "#f59e0b",
  unknown:  "#94a3b8",
};

const CHANNEL_LABELS: Record<string, string> = {
  physical: "Physical / POS",
  webshop:  "Webshop",
  imported: "Imported",
  unknown:  "Unknown",
};

type Props = {
  data: SalesChannelOverviewItem[];
  metric: "itemsSold" | "totalRevenue";
};

export function SalesChannelChart({ data, metric }: Props) {
  const chartData = data.map((d) => ({
    ...d,
    label: CHANNEL_LABELS[d.salesChannel] ?? d.salesChannel,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(100, chartData.length * 40)}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
      >
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={100} />
        <Tooltip />
        <Bar dataKey={metric} radius={[0, 4, 4, 0]}>
          {chartData.map((entry) => (
            <Cell
              key={entry.salesChannel}
              fill={CHANNEL_COLORS[entry.salesChannel] ?? "#94a3b8"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

---

## Update `AnalyticsPage.tsx`

### 1 — Sales channel section

Add a new section between the zone comparison and the sales velocity sections:

```tsx
import { SalesChannelChart } from "../components/charts/SalesChannelChart";

{/* Sales channel breakdown */}
{analyticsStore.channelOverview.length > 0 && (
  <div className="px-4 pb-3">
    <p className="text-xs font-semibold text-gray-500 mb-2">Sales by channel</p>
    <div className="bg-white rounded-xl p-3 shadow-sm">
      <SalesChannelChart
        data={analyticsStore.channelOverview}
        metric="itemsSold"
      />
    </div>
  </div>
)}
```

### 2 — Velocity chart channel toggle

Replace the existing static velocity section with a version that has a channel selector:

```tsx
{/* Sales velocity — with channel toggle */}
<div className="px-4 pb-3">
  <div className="flex items-center justify-between mb-2">
    <p className="text-xs font-semibold text-gray-500">Sales over time</p>
    <div className="flex gap-1 flex-wrap">
      {(["all", "physical", "webshop"] as const).map((ch) => (
        <button
          key={ch}
          onClick={() => setVelocityChannel(ch)}
          className={`text-xs px-2 py-1 rounded-full border transition-colors ${
            velocityChannel === ch
              ? "bg-indigo-600 text-white border-indigo-600"
              : "text-gray-500 border-gray-200"
          }`}
        >
          {ch === "all" ? "All" : ch === "physical" ? "Physical" : "Webshop"}
        </button>
      ))}
    </div>
  </div>
  <div className="bg-white rounded-xl p-3 shadow-sm">
    <SalesTimelineChart data={analyticsStore.velocity} metric="itemsSold" />
  </div>
</div>
```

Add `setVelocityChannel` and `velocityChannel` to the destructured store values at the
top of `AnalyticsPage`:

```typescript
const {
  setSelectedZone,
  setSelectedCategory,
  setDateRange,
  setZoneComparisonMetric,
  setVelocityChannel,       // ADD
  zoneComparisonMetric,
  velocityChannel,          // ADD
} = useAnalyticsStore();
```

### 3 — Zone stats panel clarification label

In `ZoneStatsPanel.tsx`, add a small note under the panel header so users know zone
stats are physical-only:

```tsx
{/* Under the header div, before the loading check: */}
<p className="text-xs text-gray-400 px-4 pb-2">
  Physical sales only — webshop orders excluded
</p>
```

---

## Scan History List — Channel Filter

The scan history feature already has a filters panel
(`src/features/item-scan-history/components/ItemScanHistoryFiltersPanel.tsx` or
similar). Add `salesChannel` as a filter option.

### Update the filters type

**File:** `src/features/item-scan-history/types/` (wherever `ItemScanHistoryFilters` is defined)

```typescript
import type { SalesChannel } from "../../analytics/types/analytics.types";

// Add to ItemScanHistoryFilters:
salesChannel?: SalesChannel;
```

### Update the API call

**File:** `src/features/item-scan-history/apis/get-item-scan-history.api.ts`

Append `salesChannel` to the query string when present:

```typescript
const channelParam = filters.salesChannel
  ? `&salesChannel=${filters.salesChannel}`
  : "";
// Add to the existing query string construction
```

### Add to the filters panel UI

In the filters panel component, add a row with four pill buttons:

```tsx
const CHANNEL_OPTIONS: Array<{ value: SalesChannel | "all"; label: string }> = [
  { value: "all",      label: "All channels" },
  { value: "physical", label: "Physical" },
  { value: "webshop",  label: "Webshop" },
  { value: "unknown",  label: "Unknown" },
];
```

Render as pill buttons following the same style as the existing sold/in-store filter
buttons already in the panel.

---

## Scan History Card — Channel Badge

**File:** `src/features/item-scan-history/components/ItemScanHistoryCard.tsx`

When an item is sold, show a small channel badge next to the "Sold" status indicator:

```tsx
const CHANNEL_BADGE: Record<string, { label: string; color: string }> = {
  physical: { label: "POS",      color: "bg-green-100 text-green-700" },
  webshop:  { label: "Webshop",  color: "bg-indigo-100 text-indigo-700" },
  imported: { label: "Imported", color: "bg-amber-100 text-amber-700" },
  unknown:  { label: "?",        color: "bg-gray-100 text-gray-500" },
};

// In the card JSX, when item.isSold && item.lastSoldChannel:
{item.lastSoldChannel && (
  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
    CHANNEL_BADGE[item.lastSoldChannel]?.color ?? "bg-gray-100 text-gray-500"
  }`}>
    {CHANNEL_BADGE[item.lastSoldChannel]?.label ?? item.lastSoldChannel}
  </span>
)}
```

This requires `lastSoldChannel` to be included in the `ItemScanHistoryItem` type and
returned by `GET /scanner/history`. Check the existing DTO and add `lastSoldChannel:
SalesChannel | null` if not already present.

---

## Checklist

### Types & APIs
- [ ] Add `SalesChannel` and `SalesChannelOverviewItem` to `analytics.types.ts`
- [ ] Create `get-sales-channel-overview.api.ts`
- [ ] Update `get-sales-velocity.api.ts` to accept optional `salesChannel` param
- [ ] Add `lastSoldChannel` to `ItemScanHistoryItem` type + scan history DTO

### State
- [ ] Add `channelOverview`, `velocityChannel`, setters to `analytics.store.ts`

### Flows
- [ ] Update `use-analytics-page.flow.ts` — add channel overview to parallel load
- [ ] Update `use-analytics-page.flow.ts` — add velocity re-fetch on channel change

### Components
- [ ] Create `SalesChannelChart.tsx`
- [ ] Add channel breakdown section to `AnalyticsPage.tsx`
- [ ] Add velocity channel toggle to `AnalyticsPage.tsx`
- [ ] Add "Physical sales only" note to `ZoneStatsPanel.tsx`
- [ ] Add `salesChannel` filter pills to `ItemScanHistoryFiltersPanel`
- [ ] Add channel badge to `ItemScanHistoryCard`

### Integration tests
- [ ] Analytics page: channel breakdown chart shows physical / webshop split
- [ ] Velocity toggle: switching to "Webshop" refetches and shows webshop-only line
- [ ] ZoneStatsPanel: "Physical sales only" note visible
- [ ] History list: filtering by "Webshop" shows only webshop-sold items
- [ ] History card: sold items show a channel badge
