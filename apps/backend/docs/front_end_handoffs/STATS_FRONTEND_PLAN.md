# Stats & Analytics Frontend Implementation Plan

## Goal

Build a complete analytics and floor-map experience:
- An interactive 2D store map (Konva canvas) where zones are color-coded by performance
- Tap a zone → side panel with charts (Recharts)
- Location comparison, category deep-dive, dimension insights, time-based intelligence
- A zone editor for admins to draw and label zones on the map image
- Smart insight cards

Related backend plan: `docs/under_development/STATS_BACKEND_PLAN.md`

---

## Packages to Install

```bash
cd apps/frontend
npm install recharts konva react-konva
npm install --save-dev @types/konva
```

| Package | Version target | Purpose |
|---------|---------------|---------|
| `recharts` | latest | Bar charts, line charts, horizontal bars |
| `konva` | latest | 2D canvas engine |
| `react-konva` | latest | React bindings for Konva |

> **No `use-image` needed.** The map has no background image — zones are drawn
> directly on the dark Konva canvas. The `use-image` package was removed from this plan.

---

## New Feature: `analytics`

All files live under `src/features/analytics/`.

### Complete Directory Structure

```
src/features/analytics/
  pages/
    AnalyticsPage.tsx                   # Root page, renders floor map + panel
  components/
    floor-map/
      FloorMapCanvas.tsx                # Konva Stage with map image + zones
      FloorMapZone.tsx                  # Single Konva zone rect + label
      FloorMapHeatOverlay.tsx           # Computes heat color per zone
      FloorMapTooltip.tsx               # Hover tooltip (HTML, not Konva)
    panels/
      ZoneStatsPanel.tsx                # Side panel shown on zone tap
      CategoryStatsPanel.tsx            # Category deep-dive panel
    charts/
      CategoryBarChart.tsx              # Horizontal bar: category → itemsSold
      SalesTimelineChart.tsx            # Line chart: daily sales over time
      ZoneComparisonChart.tsx           # Horizontal bar: zones ranked
      CategoryByLocationChart.tsx       # Grouped bar: category × location
      DimensionBucketChart.tsx          # Vertical bar: dimension buckets
      TimeToSellChart.tsx               # Bar: time-to-sell per category
    insights/
      InsightCard.tsx                   # Single insight badge
      InsightList.tsx                   # Row of insight cards
    shared/
      KpiCard.tsx                       # Single KPI (number + label)
      KpiRow.tsx                        # Row of KPI cards
      DateRangePicker.tsx               # from/to date selector
      StatsSectionTitle.tsx             # Section heading
  stores/
    analytics.store.ts                  # Global analytics state
    floor-map.store.ts                  # Zone positions + selected zone
  flows/
    use-analytics-page.flow.ts          # Loads overview data on mount
    use-zone-detail.flow.ts             # Loads zone detail when zone selected
    use-floor-map.flow.ts               # Konva stage sizing + interaction
    use-zone-editor.flow.ts             # Admin: draw/resize zones
  apis/
    get-zones-overview.api.ts
    get-zone-detail.api.ts
    get-categories-overview.api.ts
    get-dimensions-stats.api.ts
    get-sales-velocity.api.ts
    get-smart-insights.api.ts
    list-zones.api.ts
    create-zone.api.ts
    update-zone.api.ts
    delete-zone.api.ts
    reorder-zones.api.ts
  types/
    analytics.types.ts
```

---

## Step 1 — TypeScript Types

**File:** `src/features/analytics/types/analytics.types.ts`

```typescript
export type ZoneOverviewItem = {
  location: string;
  itemsSold: number;
  itemsReceived: number;
  revenue: number;
  avgTimeToSellSeconds: number | null;
};

export type ZoneDetail = {
  location: string;
  kpis: {
    itemsSold: number;
    itemsReceived: number;
    revenue: number;
    avgTimeToSellSeconds: number | null;
  };
  categories: Array<{
    category: string;
    itemsSold: number;
    revenue: number;
  }>;
  dailySeries: Array<{
    date: string;
    itemsSold: number;
    revenue: number;
  }>;
};

export type CategoryOverviewItem = {
  category: string;
  itemsSold: number;
  totalRevenue: number;
  avgTimeToSellSeconds: number | null;
  bestLocation: string | null;
};

export type DimensionBucket = {
  bucket: string;
  label: string;
  soldCount: number;
  totalCount: number;
};

export type DimensionsStats = {
  height: DimensionBucket[];
  width: DimensionBucket[];
  depth: DimensionBucket[];
  volume: DimensionBucket[];
};

export type VelocityPoint = {
  date: string;
  itemsSold: number;
  revenue: number;
};

export type SmartInsight = {
  type: "positive" | "warning" | "neutral";
  message: string;
};

export type StoreZoneType = "zone" | "corridor";

export type StoreZone = {
  id: string;
  label: string;
  // "zone"     → stat-tracked shelving/display area. Heat-colored, tappable, shows panel.
  // "corridor" → walkable space. Visual only: flat gray, no tap, no stats.
  type: StoreZoneType;
  // Percentages (0–100) of canvas dimensions as stored in the backend.
  // Convert to pixels before passing to Konva:
  //   xPx = zone.xPct * stageWidth / 100
  //   yPx = zone.yPct * stageHeight / 100
  //   widthPx = zone.widthPct * stageWidth / 100
  //   heightPx = zone.heightPct * stageHeight / 100
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  sortOrder: number;
};

export type DateRange = {
  from: string; // ISO date string "YYYY-MM-DD"
  to: string;
};
```

---

## Step 2 — API Functions

All API files follow the same pattern as the existing `get-item-scan-history.api.ts`.
They call `apiClient.get(...)` from `src/core/api-client`.

**File:** `src/features/analytics/apis/get-zones-overview.api.ts`

```typescript
import { apiClient } from "../../../core/api-client";
import type { ZoneOverviewItem } from "../types/analytics.types";

export async function getZonesOverviewApi(from: string, to: string): Promise<ZoneOverviewItem[]> {
  const res = await apiClient.get<{ data: ZoneOverviewItem[] }>(
    `/stats/zones?from=${from}&to=${to}`,
    { requiresAuth: true },
  );
  return res.data;
}
```

Create identical files for each endpoint, changing the path and return type:

| File | Path | Return type |
|------|------|-------------|
| `get-zone-detail.api.ts` | `/stats/zones/:location` | `ZoneDetail` |
| `get-categories-overview.api.ts` | `/stats/categories` | `CategoryOverviewItem[]` |
| `get-dimensions-stats.api.ts` | `/stats/dimensions` | `DimensionsStats` |
| `get-sales-velocity.api.ts` | `/stats/velocity` | `VelocityPoint[]` |
| `get-smart-insights.api.ts` | `/stats/insights` | `SmartInsight[]` |
| `list-zones.api.ts` | `/zones` | `StoreZone[]` |
| `create-zone.api.ts` | `POST /zones` | `StoreZone` |
| `update-zone.api.ts` | `PATCH /zones/:id` | `void` |
| `delete-zone.api.ts` | `DELETE /zones/:id` | `void` |
| `reorder-zones.api.ts` | `PUT /zones/reorder` | `void` |

---

## Step 3 — Analytics Store

**File:** `src/features/analytics/stores/analytics.store.ts`

Uses Zustand following the exact same pattern as `item-scan-history.store.ts`.

```typescript
import { create } from "zustand";
import type {
  ZoneOverviewItem,
  ZoneDetail,
  CategoryOverviewItem,
  DimensionsStats,
  VelocityPoint,
  SmartInsight,
  DateRange,
} from "../types/analytics.types";

type AnalyticsStore = {
  dateRange: DateRange;
  zonesOverview: ZoneOverviewItem[];
  selectedZone: string | null;
  zoneDetail: ZoneDetail | null;
  selectedCategory: string | null;   // drives CategoryStatsPanel
  categories: CategoryOverviewItem[];
  dimensions: DimensionsStats | null;
  velocity: VelocityPoint[];
  insights: SmartInsight[];
  zoneComparisonMetric: "itemsSold" | "revenue"; // toggle on ZoneComparisonChart

  isLoadingOverview: boolean;
  isLoadingZoneDetail: boolean;
  isLoadingCategories: boolean;

  setDateRange: (range: DateRange) => void;
  setSelectedZone: (location: string | null) => void;
  setSelectedCategory: (category: string | null) => void;
  setZoneComparisonMetric: (metric: "itemsSold" | "revenue") => void;
  setZonesOverview: (data: ZoneOverviewItem[]) => void;
  setZoneDetail: (data: ZoneDetail | null) => void;
  setCategories: (data: CategoryOverviewItem[]) => void;
  setDimensions: (data: DimensionsStats) => void;
  setVelocity: (data: VelocityPoint[]) => void;
  setInsights: (data: SmartInsight[]) => void;
  setLoadingOverview: (v: boolean) => void;
  setLoadingZoneDetail: (v: boolean) => void;
  setLoadingCategories: (v: boolean) => void;
};

function defaultDateRange(): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export const useAnalyticsStore = create<AnalyticsStore>((set) => ({
  dateRange: defaultDateRange(),
  zonesOverview: [],
  selectedZone: null,
  zoneDetail: null,
  selectedCategory: null,
  categories: [],
  dimensions: null,
  velocity: [],
  insights: [],
  zoneComparisonMetric: "itemsSold",

  isLoadingOverview: false,
  isLoadingZoneDetail: false,
  isLoadingCategories: false,

  setDateRange: (range) => set({ dateRange: range, selectedZone: null, zoneDetail: null, selectedCategory: null }),
  setSelectedZone: (location) => set({ selectedZone: location, zoneDetail: null }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setZoneComparisonMetric: (metric) => set({ zoneComparisonMetric: metric }),
  setZonesOverview: (data) => set({ zonesOverview: data }),
  setZoneDetail: (data) => set({ zoneDetail: data }),
  setCategories: (data) => set({ categories: data }),
  setDimensions: (data) => set({ dimensions: data }),
  setVelocity: (data) => set({ velocity: data }),
  setInsights: (data) => set({ insights: data }),
  setLoadingOverview: (v) => set({ isLoadingOverview: v }),
  setLoadingZoneDetail: (v) => set({ isLoadingZoneDetail: v }),
  setLoadingCategories: (v) => set({ isLoadingCategories: v }),
}));
```

---

## Step 4 — Floor Map Store

**File:** `src/features/analytics/stores/floor-map.store.ts`

```typescript
import { create } from "zustand";
import type { StoreZone } from "../types/analytics.types";

type FloorMapStore = {
  zones: StoreZone[];       // coordinates in percentages, as returned by the API
  isEditorMode: boolean;
  stageWidth: number;       // current pixel width of the Konva Stage
  stageHeight: number;      // current pixel height of the Konva Stage

  setZones: (zones: StoreZone[]) => void;
  upsertZone: (zone: StoreZone) => void;
  removeZone: (id: string) => void;
  setEditorMode: (v: boolean) => void;
  setStageSize: (width: number, height: number) => void;
};

export const useFloorMapStore = create<FloorMapStore>((set) => ({
  zones: [],
  isEditorMode: false,
  stageWidth: 800,
  stageHeight: 600,

  setZones: (zones) => set({ zones }),
  upsertZone: (zone) =>
    set((s) => ({
      zones: s.zones.some((z) => z.id === zone.id)
        ? s.zones.map((z) => (z.id === zone.id ? zone : z))
        : [...s.zones, zone],
    })),
  removeZone: (id) => set((s) => ({ zones: s.zones.filter((z) => z.id !== id) })),
  setEditorMode: (v) => set({ isEditorMode: v }),
  setStageSize: (stageWidth, stageHeight) => set({ stageWidth, stageHeight }),
}));
```

---

## Step 5 — Flows (React Hooks)

### 5a — Analytics Page Flow

**File:** `src/features/analytics/flows/use-analytics-page.flow.ts`

```typescript
import { useEffect, useCallback } from "react";
import { useAnalyticsStore } from "../stores/analytics.store";
import { getZonesOverviewApi } from "../apis/get-zones-overview.api";
import { getSmartInsightsApi } from "../apis/get-smart-insights.api";
import { getSalesVelocityApi } from "../apis/get-sales-velocity.api";
import { getCategoriesOverviewApi } from "../apis/get-categories-overview.api";
import { getDimensionsStatsApi } from "../apis/get-dimensions-stats.api";
import { useWsEvent } from "../../../core/ws-client/use-ws-event";

export function useAnalyticsPageFlow() {
  const store = useAnalyticsStore();

  const load = useCallback(async () => {
    const { from, to } = store.dateRange;
    store.setLoadingOverview(true);
    try {
      const [overview, insights, velocity, categories, dimensions] = await Promise.all([
        getZonesOverviewApi(from, to),
        getSmartInsightsApi(from, to),
        getSalesVelocityApi(from, to),
        getCategoriesOverviewApi(from, to),
        getDimensionsStatsApi(from, to),
      ]);
      store.setZonesOverview(overview);
      store.setInsights(insights);
      store.setVelocity(velocity);
      store.setCategories(categories);
      store.setDimensions(dimensions);
    } finally {
      store.setLoadingOverview(false);
    }
  }, [store.dateRange]);

  useEffect(() => {
    load();
  }, [load]);

  // Re-fetch all overview data when any scan changes in real time.
  // The analytics page shows aggregates, so any productId change can affect
  // zone totals, category totals, velocity, and insights.
  useWsEvent("scan_history_updated", load);

  return { store, reload: load };
}
```

### 5b — Zone Detail Flow

**File:** `src/features/analytics/flows/use-zone-detail.flow.ts`

```typescript
import { useEffect } from "react";
import { useAnalyticsStore } from "../stores/analytics.store";
import { getZoneDetailApi } from "../apis/get-zone-detail.api";
import { getCategoriesOverviewApi } from "../apis/get-categories-overview.api";

export function useZoneDetailFlow() {
  const store = useAnalyticsStore();

  useEffect(() => {
    if (!store.selectedZone) return;

    const { from, to } = store.dateRange;
    store.setLoadingZoneDetail(true);

    getZoneDetailApi(store.selectedZone, from, to)
      .then(store.setZoneDetail)
      .finally(() => store.setLoadingZoneDetail(false));
  }, [store.selectedZone, store.dateRange]);
}
```

### 5c — Floor Map Flow

**File:** `src/features/analytics/flows/use-floor-map.flow.ts`

```typescript
import { useEffect, useRef } from "react";
import { useFloorMapStore } from "../stores/floor-map.store";
import { listZonesApi } from "../apis/list-zones.api";

export function useFloorMapFlow(containerRef: React.RefObject<HTMLDivElement>) {
  const store = useFloorMapStore();

  // Load zones from backend
  useEffect(() => {
    listZonesApi().then(store.setZones);
  }, []);

  // Fit stage to container width, maintain aspect ratio
  useEffect(() => {
    const resize = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        store.setStageSize(w, w * 0.6); // 5:3 aspect ratio default
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return store;
}
```

---

## Step 6 — Heat Color Utility

**File:** `src/features/analytics/components/floor-map/FloorMapHeatOverlay.tsx`

Exported as a pure function, not a component.

```typescript
import type { ZoneOverviewItem } from "../../types/analytics.types";

/**
 * Returns a CSS hex color string for a zone based on its itemsSold
 * relative to the max sold across all zones.
 */
export function getZoneHeatColor(
  location: string,
  zonesOverview: ZoneOverviewItem[],
): string {
  const zone = zonesOverview.find((z) => z.location === location);
  if (!zone || zone.itemsSold === 0) return "#94a3b8"; // slate-400 (no data)

  const max = Math.max(...zonesOverview.map((z) => z.itemsSold));
  const ratio = zone.itemsSold / max;

  // Interpolate from orange-red (low) to green (high)
  if (ratio >= 0.75) return "#22c55e"; // green-500
  if (ratio >= 0.5) return "#84cc16";  // lime-500
  if (ratio >= 0.25) return "#f59e0b"; // amber-500
  return "#ef4444";                     // red-500
}
```

---

## Step 7 — Konva Floor Map Component

**File:** `src/features/analytics/components/floor-map/FloorMapCanvas.tsx`

The map has no background image. The Konva `Stage` is the floor — zones are drawn
directly on the canvas background. Coordinates stored in the DB are percentages (0–100);
they are converted to pixels at render time using `stageWidth` and `stageHeight`.

```tsx
import { Stage, Layer, Rect, Text, Group } from "react-konva";
import type { StoreZone, ZoneOverviewItem } from "../../types/analytics.types";
import { getZoneHeatColor } from "./FloorMapHeatOverlay";

type Props = {
  zones: StoreZone[];
  zonesOverview: ZoneOverviewItem[];
  stageWidth: number;
  stageHeight: number;
  selectedZone: string | null;
  onZoneTap: (location: string) => void;
};

// Convert a percentage value to pixels given the axis dimension
function pct(value: number, axisPx: number): number {
  return (value / 100) * axisPx;
}

export function FloorMapCanvas({
  zones,
  zonesOverview,
  stageWidth,
  stageHeight,
  selectedZone,
  onZoneTap,
}: Props) {
  return (
    <Stage
      width={stageWidth}
      height={stageHeight}
      style={{ background: "#1e293b", borderRadius: 12 }} // dark slate canvas background
    >
      <Layer>
        {zones.map((zone) => {
          // Convert percentage coordinates to pixels
          const x = pct(zone.xPct, stageWidth);
          const y = pct(zone.yPct, stageHeight);
          const w = pct(zone.widthPct, stageWidth);
          const h = pct(zone.heightPct, stageHeight);

          // ── Corridor: visual only, no interaction ──────────────────────────
          if (zone.type === "corridor") {
            return (
              <Group key={zone.id}>
                <Rect
                  x={x}
                  y={y}
                  width={w}
                  height={h}
                  fill="#334155"      // slate-700 — subtle walkway color
                  opacity={0.5}
                  stroke="#475569"
                  strokeWidth={1}
                  cornerRadius={2}
                />
                <Text
                  x={x + 4}
                  y={y + 4}
                  text={zone.label}
                  fontSize={9}
                  fill="#94a3b8"      // slate-400 — muted label
                />
              </Group>
            );
          }

          // ── Zone: heat-colored, tappable, shows stats panel ────────────────
          const heatColor = getZoneHeatColor(zone.label, zonesOverview);
          const isSelected = selectedZone === zone.label;
          const overview = zonesOverview.find((z) => z.location === zone.label);

          return (
            <Group
              key={zone.id}
              onClick={() => onZoneTap(zone.label)}
              onTap={() => onZoneTap(zone.label)}
            >
              <Rect
                x={x}
                y={y}
                width={w}
                height={h}
                fill={heatColor}
                opacity={isSelected ? 0.85 : 0.55}
                stroke={isSelected ? "#ffffff" : "#475569"}
                strokeWidth={isSelected ? 2 : 1}
                cornerRadius={4}
              />

              {/* Zone label */}
              <Text
                x={x + 6}
                y={y + 6}
                text={zone.label}
                fontSize={11}
                fontStyle="bold"
                fill="#ffffff"
                shadowColor="black"
                shadowBlur={4}
                shadowOpacity={0.6}
              />

              {/* Sold count badge */}
              {overview && (
                <Text
                  x={x + 6}
                  y={y + 20}
                  text={`${overview.itemsSold} sold`}
                  fontSize={10}
                  fill="#ffffff"
                  shadowColor="black"
                  shadowBlur={3}
                  shadowOpacity={0.5}
                />
              )}
            </Group>
          );
        })}
      </Layer>
    </Stage>
  );
}
```

---

## Step 8 — KPI Row Component

**File:** `src/features/analytics/components/shared/KpiRow.tsx`

```tsx
type KpiCardProps = {
  label: string;
  value: string | number;
  sub?: string;
};

function KpiCard({ label, value, sub }: KpiCardProps) {
  return (
    <div className="flex flex-col items-center bg-white rounded-xl p-3 shadow-sm min-w-[70px]">
      <span className="text-xl font-bold text-gray-900">{value}</span>
      <span className="text-xs text-gray-500 text-center mt-0.5">{label}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

type KpiRowProps = {
  itemsSold: number;
  revenue: number;
  avgTimeToSellSeconds: number | null;
  itemsReceived?: number;
};

export function KpiRow({ itemsSold, revenue, avgTimeToSellSeconds, itemsReceived }: KpiRowProps) {
  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return "—";
    const days = Math.floor(seconds / 86400);
    if (days > 0) return `${days}d`;
    const hours = Math.floor(seconds / 3600);
    return `${hours}h`;
  };

  return (
    <div className="flex gap-2 overflow-x-auto py-1">
      <KpiCard label="Sold" value={itemsSold} />
      <KpiCard label="Revenue" value={`${revenue.toFixed(0)} kr`} />
      <KpiCard label="Avg sell time" value={formatTime(avgTimeToSellSeconds)} />
      {itemsReceived !== undefined && (
        <KpiCard label="Received" value={itemsReceived} />
      )}
    </div>
  );
}
```

---

## Step 9 — Chart Components

All charts use Recharts. Follow the Recharts docs exactly.

### 9a — Category Bar Chart

**File:** `src/features/analytics/components/charts/CategoryBarChart.tsx`

```tsx
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

type Props = {
  data: Array<{ category: string; itemsSold: number }>;
};

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

export function CategoryBarChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
      >
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="category"
          tick={{ fontSize: 11 }}
          width={80}
        />
        <Tooltip formatter={(v: number) => [`${v} items`, "Sold"]} />
        <Bar dataKey="itemsSold" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### 9b — Sales Timeline Chart

**File:** `src/features/analytics/components/charts/SalesTimelineChart.tsx`

```tsx
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import type { VelocityPoint } from "../../types/analytics.types";

type Props = {
  data: VelocityPoint[];
  metric: "itemsSold" | "revenue";
};

export function SalesTimelineChart({ data, metric }: Props) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10 }}
          tickFormatter={(v: string) => v.slice(5)} // "MM-DD"
        />
        <YAxis tick={{ fontSize: 10 }} />
        <Tooltip />
        <Line
          type="monotone"
          dataKey={metric}
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

### 9c — Zone Comparison Chart

**File:** `src/features/analytics/components/charts/ZoneComparisonChart.tsx`

```tsx
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { ZoneOverviewItem } from "../../types/analytics.types";

type Props = {
  data: ZoneOverviewItem[];
  metric: "itemsSold" | "revenue";
  onBarClick?: (location: string) => void;
};

export function ZoneComparisonChart({ data, metric, onBarClick }: Props) {
  const sorted = [...data].sort((a, b) => b[metric] - a[metric]);

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, sorted.length * 36)}>
      <BarChart
        layout="vertical"
        data={sorted}
        margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
        onClick={(e) => {
          if (e?.activePayload?.[0]?.payload?.location && onBarClick) {
            onBarClick(e.activePayload[0].payload.location);
          }
        }}
      >
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis
          type="category"
          dataKey="location"
          tick={{ fontSize: 11 }}
          width={72}
        />
        <Tooltip />
        <Bar dataKey={metric} fill="#6366f1" radius={[0, 4, 4, 0]} cursor="pointer" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

### 9d — Dimension Bucket Chart

**File:** `src/features/analytics/components/charts/DimensionBucketChart.tsx`

```tsx
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import type { DimensionBucket } from "../../types/analytics.types";

type Props = {
  data: DimensionBucket[];
  title: string;
};

export function DimensionBucketChart({ data, title }: Props) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-1">{title}</p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="soldCount" name="Sold" fill="#22c55e" radius={[4, 4, 0, 0]} />
          <Bar dataKey="totalCount" name="Total" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

### 9e — Time To Sell Chart

**File:** `src/features/analytics/components/charts/TimeToSellChart.tsx`

```tsx
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import type { CategoryOverviewItem } from "../../types/analytics.types";

type Props = {
  data: CategoryOverviewItem[];
};

export function TimeToSellChart({ data }: Props) {
  const chartData = data
    .filter((c) => c.avgTimeToSellSeconds !== null)
    .map((c) => ({
      category: c.category,
      days: Math.round((c.avgTimeToSellSeconds! / 86400) * 10) / 10,
    }))
    .sort((a, b) => a.days - b.days);

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart
        layout="vertical"
        data={chartData}
        margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
      >
        <XAxis type="number" tick={{ fontSize: 11 }} unit=" d" />
        <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={80} />
        <Tooltip formatter={(v: number) => [`${v} days`, "Avg time to sell"]} />
        <Bar dataKey="days" fill="#f59e0b" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

---

## Step 10 — Zone Stats Panel

**File:** `src/features/analytics/components/panels/ZoneStatsPanel.tsx`

This is the slide-in panel that opens when a zone is tapped.

```tsx
import { useEffect } from "react";
import { useAnalyticsStore } from "../../stores/analytics.store";
import { useZoneDetailFlow } from "../../flows/use-zone-detail.flow";
import { KpiRow } from "../shared/KpiRow";
import { CategoryBarChart } from "../charts/CategoryBarChart";
import { SalesTimelineChart } from "../charts/SalesTimelineChart";

export function ZoneStatsPanel() {
  useZoneDetailFlow();

  const { selectedZone, zoneDetail, isLoadingZoneDetail, setSelectedZone } =
    useAnalyticsStore();

  if (!selectedZone) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-base font-semibold text-gray-900">{selectedZone}</h2>
        <button
          className="text-gray-400 hover:text-gray-600 text-xl"
          onClick={() => setSelectedZone(null)}
        >
          ✕
        </button>
      </div>

      {isLoadingZoneDetail ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Loading…
        </div>
      ) : zoneDetail ? (
        <div className="flex flex-col gap-5 px-4 py-4">
          {/* KPIs */}
          <KpiRow
            itemsSold={zoneDetail.kpis.itemsSold}
            revenue={zoneDetail.kpis.revenue}
            avgTimeToSellSeconds={zoneDetail.kpis.avgTimeToSellSeconds}
            itemsReceived={zoneDetail.kpis.itemsReceived}
          />

          {/* Category performance */}
          <section>
            <p className="text-xs font-semibold text-gray-500 mb-2">
              Category performance
            </p>
            <CategoryBarChart data={zoneDetail.categories} />
          </section>

          {/* Sales over time */}
          <section>
            <p className="text-xs font-semibold text-gray-500 mb-2">
              Sales over time
            </p>
            <SalesTimelineChart data={zoneDetail.dailySeries} metric="itemsSold" />
          </section>
        </div>
      ) : null}
    </div>
  );
}
```

---

## Step 11 — Insight Cards

**File:** `src/features/analytics/components/insights/InsightCard.tsx`

```tsx
import type { SmartInsight } from "../../types/analytics.types";

const styleMap = {
  positive: "bg-green-50 text-green-800 border-green-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  neutral: "bg-slate-50 text-slate-700 border-slate-200",
};

const iconMap = {
  positive: "🔥",
  warning: "⚠️",
  neutral: "📈",
};

type Props = { insight: SmartInsight };

export function InsightCard({ insight }: Props) {
  return (
    <div className={`flex gap-2 items-start border rounded-xl px-3 py-2 text-xs ${styleMap[insight.type]}`}>
      <span>{iconMap[insight.type]}</span>
      <span>{insight.message}</span>
    </div>
  );
}
```

**File:** `src/features/analytics/components/insights/InsightList.tsx`

```tsx
import { InsightCard } from "./InsightCard";
import type { SmartInsight } from "../../types/analytics.types";

export function InsightList({ insights }: { insights: SmartInsight[] }) {
  if (insights.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {insights.map((insight, i) => (
        <InsightCard key={i} insight={insight} />
      ))}
    </div>
  );
}
```

---

## Step 12 — Date Range Picker

**File:** `src/features/analytics/components/shared/DateRangePicker.tsx`

```tsx
import type { DateRange } from "../../types/analytics.types";

type Props = {
  value: DateRange;
  onChange: (range: DateRange) => void;
};

const PRESETS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

export function DateRangePicker({ value, onChange }: Props) {
  const applyPreset = (days: number) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    onChange({
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    });
  };

  return (
    <div className="flex items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.label}
          onClick={() => applyPreset(p.days)}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
```

---

## Step 13 — Analytics Page

**File:** `src/features/analytics/pages/AnalyticsPage.tsx`

```tsx
import { useRef } from "react";
import { useAnalyticsPageFlow } from "../flows/use-analytics-page.flow";
import { useFloorMapFlow } from "../flows/use-floor-map.flow";
import { useAnalyticsStore } from "../stores/analytics.store";
import { useFloorMapStore } from "../stores/floor-map.store";
import { FloorMapCanvas } from "../components/floor-map/FloorMapCanvas";
import { FloorMapLegend } from "../components/floor-map/FloorMapLegend";
import { ZoneStatsPanel } from "../components/panels/ZoneStatsPanel";
import { CategoryStatsPanel } from "../components/panels/CategoryStatsPanel";
import { ZoneComparisonChart } from "../components/charts/ZoneComparisonChart";
import { SalesTimelineChart } from "../components/charts/SalesTimelineChart";
import { TimeToSellChart } from "../components/charts/TimeToSellChart";
import { DimensionBucketChart } from "../components/charts/DimensionBucketChart";
import { InsightList } from "../components/insights/InsightList";
import { DateRangePicker } from "../components/shared/DateRangePicker";

export function AnalyticsPage() {
  const containerRef = useRef<HTMLDivElement>(null!);
  const { store: analyticsStore } = useAnalyticsPageFlow();
  const floorMap = useFloorMapFlow(containerRef);

  const {
    setSelectedZone,
    setSelectedCategory,
    setDateRange,
    setZoneComparisonMetric,
    zoneComparisonMetric,
  } = useAnalyticsStore();

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Analytics</h1>
        <DateRangePicker
          value={analyticsStore.dateRange}
          onChange={setDateRange}
        />
      </div>

      {/* Smart insights */}
      {analyticsStore.insights.length > 0 && (
        <div className="px-4 pb-3">
          <InsightList insights={analyticsStore.insights} />
        </div>
      )}

      {/* Floor map */}
      <div ref={containerRef} className="px-4 pb-1">
        <FloorMapCanvas
          zones={floorMap.zones}
          zonesOverview={analyticsStore.zonesOverview}
          stageWidth={floorMap.stageWidth}
          stageHeight={floorMap.stageHeight}
          selectedZone={analyticsStore.selectedZone}
          onZoneTap={setSelectedZone}
        />
      </div>

      {/* Heat map legend */}
      <div className="px-4 pb-3">
        <FloorMapLegend />
      </div>

      {/* Zone comparison — with metric toggle */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500">Zone ranking</p>
          <div className="flex gap-1">
            {(["itemsSold", "revenue"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setZoneComparisonMetric(m)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  zoneComparisonMetric === m
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "text-gray-500 border-gray-200"
                }`}
              >
                {m === "itemsSold" ? "Items" : "Revenue"}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <ZoneComparisonChart
            data={analyticsStore.zonesOverview}
            metric={zoneComparisonMetric}
            onBarClick={setSelectedZone}
          />
        </div>
      </div>

      {/* Sales velocity */}
      <div className="px-4 pb-3">
        <p className="text-xs font-semibold text-gray-500 mb-2">Sales over time</p>
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <SalesTimelineChart data={analyticsStore.velocity} metric="itemsSold" />
        </div>
      </div>

      {/* Categories — time to sell + tappable rows */}
      <div className="px-4 pb-3">
        <p className="text-xs font-semibold text-gray-500 mb-2">Categories</p>
        <div className="bg-white rounded-xl p-3 shadow-sm">
          <TimeToSellChart data={analyticsStore.categories} />
          <div className="mt-3 flex flex-col divide-y divide-gray-100">
            {analyticsStore.categories.map((cat) => (
              <button
                key={cat.category}
                onClick={() => setSelectedCategory(cat.category)}
                className="flex items-center justify-between py-2 text-left hover:bg-gray-50 px-1 rounded"
              >
                <span className="text-sm text-gray-800">{cat.category}</span>
                <span className="text-xs text-gray-400">
                  {cat.itemsSold} sold · best: {cat.bestLocation ?? "—"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dimension insights */}
      {analyticsStore.dimensions && (
        <div className="px-4 pb-6">
          <p className="text-xs font-semibold text-gray-500 mb-2">Dimension insights</p>
          <div className="bg-white rounded-xl p-3 shadow-sm flex flex-col gap-4">
            <DimensionBucketChart data={analyticsStore.dimensions.height} title="Height" />
            <DimensionBucketChart data={analyticsStore.dimensions.width} title="Width" />
            <DimensionBucketChart data={analyticsStore.dimensions.depth} title="Depth" />
            <DimensionBucketChart data={analyticsStore.dimensions.volume} title="Volume" />
          </div>
        </div>
      )}

      {/* Zone detail side panel */}
      <ZoneStatsPanel />

      {/* Category deep-dive side panel */}
      <CategoryStatsPanel />
    </div>
  );
}
```

---

## Step 13b — `CategoryByLocationChart`

**File:** `src/features/analytics/components/charts/CategoryByLocationChart.tsx`

Horizontal bar chart showing how a single category performs across all locations.
Used inside `CategoryStatsPanel` to answer "Where should I place this category?"

```tsx
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

type Props = {
  // Each row is one location with sold count for the selected category
  data: Array<{ location: string; itemsSold: number; revenue: number }>;
  metric: "itemsSold" | "revenue";
};

export function CategoryByLocationChart({ data, metric }: Props) {
  const sorted = [...data].sort((a, b) => b[metric] - a[metric]);

  return (
    <ResponsiveContainer width="100%" height={Math.max(140, sorted.length * 36)}>
      <BarChart
        layout="vertical"
        data={sorted}
        margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
      >
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="location" tick={{ fontSize: 11 }} width={72} />
        <Tooltip />
        <Bar dataKey={metric} fill="#8b5cf6" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

---

## Step 13c — `CategoryStatsPanel`

**File:** `src/features/analytics/components/panels/CategoryStatsPanel.tsx`

Slide-in panel that opens when the user taps a category row in the categories section.
Answers: "Where does this category sell best?" and "How fast does it sell?"

The data it needs — `CategoryOverviewItem[]` with per-location breakdown — comes from
the existing `categories` array in the store plus the `ZoneDetail.categories` data
already fetched. However, for the per-location breakdown we need a dedicated query.

**Add one new API call:**

`src/features/analytics/apis/get-category-by-location.api.ts`

```typescript
import { apiClient } from "../../../core/api-client";

export type CategoryLocationRow = {
  location: string;
  itemsSold: number;
  revenue: number;
  avgTimeToSellSeconds: number | null;
};

export async function getCategoryByLocationApi(
  category: string,
  from: string,
  to: string,
): Promise<CategoryLocationRow[]> {
  const encoded = encodeURIComponent(category);
  const res = await apiClient.get<{ data: CategoryLocationRow[] }>(
    `/stats/categories/${encoded}/locations?from=${from}&to=${to}`,
    { requiresAuth: true },
  );
  return res.data;
}
```

> **Backend note for Codex:** This requires a new endpoint
> `GET /stats/categories/:category/locations` in the stats router. The query groups
> `LocationCategoryStatsDaily` by `location` where `itemCategory = category`, summing
> `itemsSold`, `totalRevenue`, `totalTimeToSellSeconds`. Follow the same pattern as
> `getZoneDetail` in `stats.repository.ts`. Add to `stats.controller.ts` and
> `stats.routes.ts`.

**Add `categoryDetail` to the analytics store:**

```typescript
// Add to AnalyticsStore type:
categoryDetail: CategoryLocationRow[] | null;
isLoadingCategoryDetail: boolean;
setCategoryDetail: (data: CategoryLocationRow[] | null) => void;
setLoadingCategoryDetail: (v: boolean) => void;

// Add to initial state:
categoryDetail: null,
isLoadingCategoryDetail: false,

// Add setters:
setCategoryDetail: (data) => set({ categoryDetail: data }),
setLoadingCategoryDetail: (v) => set({ isLoadingCategoryDetail: v }),

// Clear on date range change:
setDateRange: (range) => set({ dateRange: range, selectedZone: null, zoneDetail: null, selectedCategory: null, categoryDetail: null }),
// Clear on category change:
setSelectedCategory: (category) => set({ selectedCategory: category, categoryDetail: null }),
```

**Add `use-category-detail.flow.ts`:**

```typescript
import { useEffect } from "react";
import { useAnalyticsStore } from "../stores/analytics.store";
import { getCategoryByLocationApi } from "../apis/get-category-by-location.api";

export function useCategoryDetailFlow() {
  const store = useAnalyticsStore();

  useEffect(() => {
    if (!store.selectedCategory) return;
    const { from, to } = store.dateRange;
    store.setLoadingCategoryDetail(true);

    getCategoryByLocationApi(store.selectedCategory, from, to)
      .then(store.setCategoryDetail)
      .finally(() => store.setLoadingCategoryDetail(false));
  }, [store.selectedCategory, store.dateRange]);
}
```

**The panel component:**

```tsx
import { useCategoryDetailFlow } from "../../flows/use-category-detail.flow";
import { useAnalyticsStore } from "../../stores/analytics.store";
import { CategoryByLocationChart } from "../charts/CategoryByLocationChart";
import { KpiRow } from "../shared/KpiRow";

export function CategoryStatsPanel() {
  useCategoryDetailFlow();

  const {
    selectedCategory,
    categoryDetail,
    isLoadingCategoryDetail,
    categories,
    setSelectedCategory,
  } = useAnalyticsStore();

  if (!selectedCategory) return null;

  const overview = categories.find((c) => c.category === selectedCategory);

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="text-base font-semibold text-gray-900">{selectedCategory}</h2>
        <button
          className="text-gray-400 hover:text-gray-600 text-xl"
          onClick={() => setSelectedCategory(null)}
        >
          ✕
        </button>
      </div>

      {isLoadingCategoryDetail ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Loading…
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-4 py-4">
          {/* KPIs from the categories overview */}
          {overview && (
            <KpiRow
              itemsSold={overview.itemsSold}
              revenue={overview.totalRevenue}
              avgTimeToSellSeconds={overview.avgTimeToSellSeconds}
            />
          )}

          {/* Best location hint */}
          {overview?.bestLocation && (
            <p className="text-xs text-indigo-700 bg-indigo-50 rounded-xl px-3 py-2">
              Best location: <strong>{overview.bestLocation}</strong>
            </p>
          )}

          {/* Per-location breakdown */}
          {categoryDetail && categoryDetail.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-gray-500 mb-2">
                Performance by location
              </p>
              <CategoryByLocationChart data={categoryDetail} metric="itemsSold" />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Step 13d — `FloorMapLegend`

**File:** `src/features/analytics/components/floor-map/FloorMapLegend.tsx`

A simple row of color swatches explaining the heat scale. Rendered below the canvas.

```tsx
const LEGEND = [
  { color: "#22c55e", label: "High sales" },
  { color: "#84cc16", label: "Good" },
  { color: "#f59e0b", label: "Low" },
  { color: "#ef4444", label: "Minimal" },
  { color: "#94a3b8", label: "No data" },
];

export function FloorMapLegend() {
  return (
    <div className="flex items-center gap-3 flex-wrap mt-1">
      {LEGEND.map((item) => (
        <div key={item.label} className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-xs text-gray-500">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## Step 13e — Empty Canvas State

**File:** Update `FloorMapCanvas.tsx`

When `zones.length === 0`, render a prompt instead of a blank dark rectangle so first-time
admins know what to do:

```tsx
// Add at the top of the return, before the Stage:
if (zones.length === 0) {
  return (
    <div
      style={{ width: stageWidth, height: stageHeight, background: "#1e293b", borderRadius: 12 }}
      className="flex flex-col items-center justify-center gap-2"
    >
      <span className="text-slate-400 text-sm">No zones drawn yet</span>
      <span className="text-slate-500 text-xs">Go to Settings → Store Map to draw your floor plan</span>
    </div>
  );
}
```

---

## Step 14 — Zone Editor (Admin)

The zone editor lets admins draw zones on the canvas. It is a settings page, not part
of the main analytics view.

**File:** `src/features/analytics/flows/use-zone-editor.flow.ts`

The editor works as follows:
1. Admin navigates to Settings → Store Map
2. They see the Konva stage in edit mode (dark canvas, no heat overlay)
3. They can drag existing zones to reposition
4. They can click-and-drag on empty canvas to draw a new zone
5. They can double-tap a zone to rename it
6. When committing a new zone, a small form appears: label input + a **Zone / Corridor** toggle that sets `type`
7. Save sends `POST /zones` or `PATCH /zones/:id`

### Coordinate conversion rule

All mouse/touch events from Konva return **pixel** coordinates. Before sending to the
API, convert to percentages:

```typescript
// Pixel → percentage (to save to API)
const xPct = (xPx / stageWidth) * 100;
const yPct = (yPx / stageHeight) * 100;
const widthPct = (widthPx / stageWidth) * 100;
const heightPct = (heightPx / stageHeight) * 100;
```

When reading from the API and rendering in Konva, convert back:

```typescript
// Percentage → pixel (to render in Konva)
const xPx = (zone.xPct / 100) * stageWidth;
const yPx = (zone.yPct / 100) * stageHeight;
```

This conversion happens **only in the editor flow and in `FloorMapCanvas`** — the store
always holds percentages, matching the API.

### Key Konva events to wire up when `isEditorMode` is true

- `onMouseDown` / `onTouchStart` on the Stage background → begin drawing new zone rect
- `onMouseMove` / `onTouchMove` → update the in-progress rect pixel dimensions
- `onMouseUp` / `onTouchEnd` → commit: convert pixels → percentages, open label input,
  call `POST /zones`
- On each zone `Rect`: set `draggable={true}`, handle `onDragEnd` → convert final pixel
  position → percentages → call `PATCH /zones/:id`

This flow is complex enough to deserve its own implementation session. The key state
needed in `floor-map.store.ts`:

```typescript
// Add to FloorMapStore:
// Draft uses pixels during the draw gesture (converted to pct only on commit)
draftZonePx: { x: number; y: number; width: number; height: number } | null;
setDraftZonePx: (zone: { x: number; y: number; width: number; height: number } | null) => void;
```

---

## Step 15 — Register the Analytics Page in Home Navigation

The analytics page needs to be registered as a page in the home shell. Follow the exact
same pattern as existing pages in `src/features/home/`.

Look at how `ItemScanHistoryPage` or `ScannerPage` is registered in:
- `src/features/home/stores/home-shell.store.ts` — add `analytics` to the page list
- `src/features/home/components/BottomNav.tsx` — add analytics nav item
- `src/features/home/components/PageOutlet.tsx` — render `<AnalyticsPage />` for the analytics route

Use a chart icon (Recharts-agnostic — just use a SVG or emoji placeholder until the
icon library is decided).

---

## Step 16 — Map Bootstrap

When the app or the analytics page boots, load the zone list from the backend:

- `use-floor-map.flow.ts` calls `listZonesApi()` → `GET /zones`
- The response is `StoreZone[]` with percentage coordinates
- These are stored in `floor-map.store.ts` and rendered by `FloorMapCanvas`

There is no map image to fetch. The canvas background is a dark solid color (`#1e293b`)
and the zones are the only visual elements. If the zone list is empty, the canvas
shows an empty dark rectangle and the editor button should be visible so the admin
can start drawing zones.

---

## Additional npm Package

`use-image` is required for Konva image loading:

```bash
npm install use-image
```

No `@types` needed — it ships with TypeScript declarations.

---

## Full Checklist

### Packages
- [ ] `npm install recharts konva react-konva` in `apps/frontend`

### Types & API layer
- [ ] `src/features/analytics/types/analytics.types.ts` created
- [ ] All 10 API files created (6 stats + 4 zones CRUD)
- [ ] `get-category-by-location.api.ts` created (needs matching backend endpoint)

### State
- [ ] `analytics.store.ts` created — includes `selectedCategory`, `categoryDetail`, `zoneComparisonMetric`
- [ ] `floor-map.store.ts` created

### Flows
- [ ] `use-analytics-page.flow.ts` created — loads zones, categories, dimensions, velocity, insights in one shot + WS subscription
- [ ] `use-zone-detail.flow.ts` created
- [ ] `use-category-detail.flow.ts` created
- [ ] `use-floor-map.flow.ts` created

### Components — Floor map
- [ ] `FloorMapCanvas.tsx` created — zone/corridor render split + empty state
- [ ] `FloorMapLegend.tsx` created

### Components — Panels
- [ ] `ZoneStatsPanel.tsx` created
- [ ] `CategoryStatsPanel.tsx` created

### Components — Charts
- [ ] `CategoryBarChart.tsx` created
- [ ] `CategoryByLocationChart.tsx` created
- [ ] `SalesTimelineChart.tsx` created
- [ ] `ZoneComparisonChart.tsx` created
- [ ] `DimensionBucketChart.tsx` created
- [ ] `TimeToSellChart.tsx` created

### Components — Shared
- [ ] `KpiRow.tsx` created
- [ ] `InsightCard.tsx` + `InsightList.tsx` created
- [ ] `DateRangePicker.tsx` created

### Pages & routing
- [ ] `AnalyticsPage.tsx` created — all sections wired
- [ ] Analytics page registered in home shell navigation

### Backend dependency (hand off to backend plan)
- [ ] `GET /stats/categories/:category/locations` endpoint added (needed by `CategoryStatsPanel`)

### Editor (second session)
- [ ] `use-zone-editor.flow.ts` created
- [ ] Zone editor settings page created

### Integration tests
- [ ] Tap zone on canvas → `ZoneStatsPanel` opens with KPIs + charts
- [ ] Tap category row → `CategoryStatsPanel` opens with per-location breakdown
- [ ] Dimension section renders 4 bucket charts
- [ ] Zone comparison metric toggle switches between items/revenue
- [ ] Date range change re-fetches all data
- [ ] Real-time: scan in another tab → analytics overview refreshes via WebSocket
- [ ] Empty canvas: no zones → prompt shown, not blank screen
