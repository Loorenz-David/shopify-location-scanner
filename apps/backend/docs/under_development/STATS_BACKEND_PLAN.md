# Stats & Analytics Backend Implementation Plan

## Goal

Expose the data already captured in `LocationStatsDaily`, `LocationCategoryStatsDaily`,
`ScanHistory`, `ScanHistoryEvent`, and `ScanHistoryPrice` through a clean set of REST
endpoints so the frontend can render the analytics vision. Also add zone management
endpoints for the floor-map feature and fix a gap in `itemsReceived` tracking.

---

## What Already Exists (do not rebuild)

- `LocationStatsDaily` — daily rollups per location: `itemsSold`, `itemsReceived`,
  `totalTimeToSellSeconds`, `totalValuation`
- `LocationCategoryStatsDaily` — daily rollups per location+category: `itemsSold`,
  `totalRevenue`
- `ScanHistory` — per-product record with `itemHeight`, `itemWidth`, `itemDepth`,
  `volume`, `itemCategory`, `isSold`
- `ScanHistoryEvent` — every location transition, `sold_terminal`, `unknown_position`
- `ScanHistoryPrice` — price at each terminal event
- Stats are incremented in `appendSoldTerminalEventWithFallback()` only

---

## Part A — Fix: Track `itemsReceived` in `appendLocationEvent()`

**File:** `src/modules/scanner/repositories/scan-history.repository.ts`

`LocationStatsDaily.itemsReceived` is never incremented. Fix this so every time an item
gets a `location_update` event, the receiving location's daily counter goes up by 1.

Add the following Prisma upsert **inside `appendLocationEvent()`**, after the
`ScanHistoryEvent` is created and within the same transaction block (or after, as a
separate atomic write):

```typescript
import { startOfUtcDay } from "../../../shared/utils/date.js"; // already defined in repository, extract to shared if needed

// After creating the ScanHistoryEvent with type location_update:
await prisma.locationStatsDaily.upsert({
  where: {
    date_location: {
      date: startOfUtcDay(happenedAt),
      location: input.location,
    },
  },
  create: {
    date: startOfUtcDay(happenedAt),
    location: input.location,
    itemsReceived: 1,
    itemsSold: 0,
    totalTimeToSellSeconds: 0,
    totalValuation: 0,
  },
  update: {
    itemsReceived: { increment: 1 },
  },
});
```

`happenedAt` is the event timestamp (`input.happenedAt ?? new Date()`).
`startOfUtcDay` already exists in the repository file — extract it to
`src/shared/utils/date.ts` so it can be shared.

---

## Part B — New Prisma Model: `StoreZone`

**File:** `prisma/schema.prisma`

Add this model at the end of the schema:

```prisma
model StoreZone {
  id        String   @id @default(cuid())
  shopId    String
  label     String
  x         Float
  y         Float
  width     Float
  height    Float
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  shop Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)

  @@index([shopId, sortOrder])
}
```

Also add `storeZones StoreZone[]` to the `Shop` model relation list.

Run migration:

```bash
npx prisma migrate dev --name add_store_zones
npx prisma generate
```

---

## Part C — New Module: `stats`

### Directory Structure

```
src/modules/stats/
  contracts/stats.contract.ts       # Zod query param schemas
  domain/stats.ts                   # TypeScript response types
  repositories/stats.repository.ts  # All DB queries for stats
  queries/
    get-zones-overview.query.ts
    get-zone-detail.query.ts
    get-categories-overview.query.ts
    get-dimensions-stats.query.ts
    get-sales-velocity.query.ts
    get-smart-insights.query.ts
  controllers/stats.controller.ts
  routes/stats.routes.ts
```

---

## Part D — New Module: `zones`

### Directory Structure

```
src/modules/zones/
  contracts/zone.contract.ts
  domain/zone.ts
  repositories/zone.repository.ts
  commands/
    create-zone.command.ts
    update-zone.command.ts
    delete-zone.command.ts
    reorder-zones.command.ts
  queries/
    get-zones.query.ts
  controllers/zones.controller.ts
  routes/zones.routes.ts
```

---

## Part E — Stats Contracts (Zod)

**File:** `src/modules/stats/contracts/stats.contract.ts`

All stats endpoints accept the same date-range query parameters.

```typescript
import { z } from "zod";

export const DateRangeSchema = z.object({
  from: z
    .string()
    .datetime({ offset: true })
    .optional()
    .transform((v) => (v ? new Date(v) : defaultFrom())),
  to: z
    .string()
    .datetime({ offset: true })
    .optional()
    .transform((v) => (v ? new Date(v) : new Date())),
});

function defaultFrom(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d;
}

export type DateRangeInput = z.infer<typeof DateRangeSchema>;
```

---

## Part F — Stats Domain Types

**File:** `src/modules/stats/domain/stats.ts`

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
    date: string; // ISO date string "YYYY-MM-DD"
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
  bucket: string;       // e.g. "0-40"
  label: string;        // e.g. "0–40 cm"
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
  date: string; // "YYYY-MM-DD"
  itemsSold: number;
  revenue: number;
};

export type SmartInsight = {
  type: "positive" | "warning" | "neutral";
  message: string;
};
```

---

## Part G — Stats Repository

**File:** `src/modules/stats/repositories/stats.repository.ts`

This is the most important file. All raw DB queries live here.

### G1 — `getZonesOverview(shopId, from, to)`

Query `LocationStatsDaily` aggregating over the date range, grouped by `location`.

```typescript
import { prisma } from "../../../shared/database/prisma-client.js";
import type { ZoneOverviewItem } from "../domain/stats.js";

export async function getZonesOverview(
  shopId: string,
  from: Date,
  to: Date,
): Promise<ZoneOverviewItem[]> {
  // LocationStatsDaily has no shopId column — it stores location strings
  // which are shared across the app. We need to scope to a shop.
  // Query strategy: aggregate via ScanHistoryEvent to get only this shop's locations,
  // then cross-reference with LocationStatsDaily for the aggregates.
  //
  // IMPORTANT: LocationStatsDaily is NOT scoped by shopId.
  // See Note below for how to handle this.
  //
  // For now: query LocationStatsDaily for the date range and group by location.
  // Accept that in a multi-tenant SQLite setup, zones with the same label
  // across shops will be mixed. This is a known limitation to address if
  // multiple shops ever have identical location labels.
  //
  // If this is a concern, scope by fetching distinct locations from
  // ScanHistoryEvent for this shopId first, then filter LocationStatsDaily.

  const rows = await prisma.locationStatsDaily.groupBy({
    by: ["location"],
    where: {
      date: { gte: from, lte: to },
    },
    _sum: {
      itemsSold: true,
      itemsReceived: true,
      totalTimeToSellSeconds: true,
      totalValuation: true,
    },
  });

  return rows.map((row) => {
    const sold = row._sum.itemsSold ?? 0;
    const totalSeconds = row._sum.totalTimeToSellSeconds ?? 0;
    return {
      location: row.location,
      itemsSold: sold,
      itemsReceived: row._sum.itemsReceived ?? 0,
      revenue: row._sum.totalValuation ?? 0,
      avgTimeToSellSeconds: sold > 0 ? totalSeconds / sold : null,
    };
  });
}
```

> **Multi-tenancy note on `LocationStatsDaily`:** The table has no `shopId` column.
> This was a design decision when only one shop was expected. If multi-tenant isolation
> is critical, either add a `shopId` column via a new migration, or scope by first
> fetching the shop's known location labels from `ScanHistoryEvent` and filtering.
> Add a Prisma migration to add `shopId` to `LocationStatsDaily` and
> `LocationCategoryStatsDaily` if this becomes a problem.

---

### G2 — `getZoneDetail(location, shopId, from, to)`

```typescript
export async function getZoneDetail(
  location: string,
  from: Date,
  to: Date,
): Promise<{ kpis: ZoneDetail["kpis"]; categories: ZoneDetail["categories"]; dailySeries: ZoneDetail["dailySeries"] }> {
  const [daily, categories] = await Promise.all([
    prisma.locationStatsDaily.findMany({
      where: { location, date: { gte: from, lte: to } },
      orderBy: { date: "asc" },
    }),
    prisma.locationCategoryStatsDaily.groupBy({
      by: ["itemCategory"],
      where: { location, date: { gte: from, lte: to } },
      _sum: { itemsSold: true, totalRevenue: true },
      orderBy: { _sum: { itemsSold: "desc" } },
    }),
  ]);

  const totalSold = daily.reduce((s, r) => s + r.itemsSold, 0);
  const totalReceived = daily.reduce((s, r) => s + r.itemsReceived, 0);
  const totalRevenue = daily.reduce((s, r) => s + r.totalValuation, 0);
  const totalSeconds = daily.reduce((s, r) => s + r.totalTimeToSellSeconds, 0);

  return {
    kpis: {
      itemsSold: totalSold,
      itemsReceived: totalReceived,
      revenue: totalRevenue,
      avgTimeToSellSeconds: totalSold > 0 ? totalSeconds / totalSold : null,
    },
    categories: categories.map((c) => ({
      category: c.itemCategory,
      itemsSold: c._sum.itemsSold ?? 0,
      revenue: c._sum.totalRevenue ?? 0,
    })),
    dailySeries: daily.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      itemsSold: r.itemsSold,
      revenue: r.totalValuation,
    })),
  };
}
```

---

### G3 — `getCategoriesOverview(shopId, from, to)`

Category avg time-to-sell requires querying `ScanHistory` + `ScanHistoryEvent` directly
because `LocationCategoryStatsDaily` does not store time-to-sell data.

```typescript
export async function getCategoriesOverview(
  shopId: string,
  from: Date,
  to: Date,
): Promise<CategoryOverviewItem[]> {
  // Step 1: aggregate sold counts and revenue per category from daily table
  const categoryTotals = await prisma.locationCategoryStatsDaily.groupBy({
    by: ["itemCategory"],
    where: { date: { gte: from, lte: to } },
    _sum: { itemsSold: true, totalRevenue: true },
    orderBy: { _sum: { itemsSold: "desc" } },
  });

  // Step 2: for each category, find avg time to sell via ScanHistory
  // Load items in date range that are sold, with their events
  const soldItems = await prisma.scanHistory.findMany({
    where: {
      shopId,
      isSold: true,
      updatedAt: { gte: from, lte: to },
    },
    select: {
      itemCategory: true,
      events: {
        where: {
          eventType: { in: ["location_update", "unknown_position", "sold_terminal"] },
        },
        orderBy: { happenedAt: "asc" },
        select: { eventType: true, happenedAt: true },
      },
    },
  });

  // Compute avg time per category
  const categoryTimes = new Map<string, { totalSeconds: number; count: number }>();

  for (const item of soldItems) {
    const category = item.itemCategory ?? "unknown";
    const arrivalEvent = item.events.find(
      (e) => e.eventType === "location_update" || e.eventType === "unknown_position",
    );
    const saleEvent = item.events.findLast((e) => e.eventType === "sold_terminal");

    if (arrivalEvent && saleEvent) {
      const seconds =
        (saleEvent.happenedAt.getTime() - arrivalEvent.happenedAt.getTime()) / 1000;
      if (seconds > 0) {
        const existing = categoryTimes.get(category) ?? { totalSeconds: 0, count: 0 };
        categoryTimes.set(category, {
          totalSeconds: existing.totalSeconds + seconds,
          count: existing.count + 1,
        });
      }
    }
  }

  // Step 3: find best location per category
  const bestLocations = await prisma.locationCategoryStatsDaily.groupBy({
    by: ["itemCategory", "location"],
    where: { date: { gte: from, lte: to } },
    _sum: { itemsSold: true },
    orderBy: { _sum: { itemsSold: "desc" } },
  });

  const bestLocationMap = new Map<string, string>();
  for (const row of bestLocations) {
    if (!bestLocationMap.has(row.itemCategory)) {
      bestLocationMap.set(row.itemCategory, row.location);
    }
  }

  return categoryTotals.map((cat) => {
    const times = categoryTimes.get(cat.itemCategory);
    return {
      category: cat.itemCategory,
      itemsSold: cat._sum.itemsSold ?? 0,
      totalRevenue: cat._sum.totalRevenue ?? 0,
      avgTimeToSellSeconds:
        times && times.count > 0 ? times.totalSeconds / times.count : null,
      bestLocation: bestLocationMap.get(cat.itemCategory) ?? null,
    };
  });
}
```

---

### G4 — `getDimensionsStats(shopId, from, to)`

Bucket items by dimension ranges and report sold vs total.

```typescript
type Bucket = { min: number; max: number | null; label: string };

const HEIGHT_BUCKETS: Bucket[] = [
  { min: 0, max: 40, label: "0–40 cm" },
  { min: 40, max: 80, label: "40–80 cm" },
  { min: 80, max: 120, label: "80–120 cm" },
  { min: 120, max: null, label: "120+ cm" },
];

const WIDTH_BUCKETS: Bucket[] = [
  { min: 0, max: 50, label: "0–50 cm" },
  { min: 50, max: 100, label: "50–100 cm" },
  { min: 100, max: null, label: "100+ cm" },
];

const VOLUME_BUCKETS: Bucket[] = [
  { min: 0, max: 50000, label: "Small" },
  { min: 50000, max: 200000, label: "Medium" },
  { min: 200000, max: null, label: "Large" },
];

function bucketize(
  items: Array<{ value: number | null; isSold: boolean }>,
  buckets: Bucket[],
): DimensionBucket[] {
  return buckets.map((b) => {
    const inBucket = items.filter(
      (item) =>
        item.value !== null &&
        item.value >= b.min &&
        (b.max === null || item.value < b.max),
    );
    return {
      bucket: b.max ? `${b.min}-${b.max}` : `${b.min}+`,
      label: b.label,
      soldCount: inBucket.filter((i) => i.isSold).length,
      totalCount: inBucket.length,
    };
  });
}

export async function getDimensionsStats(
  shopId: string,
  from: Date,
  to: Date,
): Promise<DimensionsStats> {
  const items = await prisma.scanHistory.findMany({
    where: {
      shopId,
      createdAt: { gte: from, lte: to },
    },
    select: {
      isSold: true,
      itemHeight: true,
      itemWidth: true,
      itemDepth: true,
      volume: true,
    },
  });

  return {
    height: bucketize(
      items.map((i) => ({ value: i.itemHeight, isSold: i.isSold })),
      HEIGHT_BUCKETS,
    ),
    width: bucketize(
      items.map((i) => ({ value: i.itemWidth, isSold: i.isSold })),
      WIDTH_BUCKETS,
    ),
    depth: bucketize(
      items.map((i) => ({ value: i.itemDepth, isSold: i.isSold })),
      WIDTH_BUCKETS,
    ),
    volume: bucketize(
      items.map((i) => ({ value: i.volume, isSold: i.isSold })),
      VOLUME_BUCKETS,
    ),
  };
}
```

---

### G5 — `getSalesVelocity(shopId, from, to)`

Daily totals across all locations.

```typescript
export async function getSalesVelocity(
  from: Date,
  to: Date,
): Promise<VelocityPoint[]> {
  const rows = await prisma.locationStatsDaily.groupBy({
    by: ["date"],
    where: { date: { gte: from, lte: to } },
    _sum: { itemsSold: true, totalValuation: true },
    orderBy: { date: "asc" },
  });

  return rows.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    itemsSold: r._sum.itemsSold ?? 0,
    revenue: r._sum.totalValuation ?? 0,
  }));
}
```

---

### G6 — `getSmartInsights(shopId, from, to)`

Computes simple rule-based insight strings. Keep these deterministic and fast.

```typescript
export async function getSmartInsights(
  shopId: string,
  from: Date,
  to: Date,
): Promise<SmartInsight[]> {
  const insights: SmartInsight[] = [];

  const zones = await getZonesOverview(shopId, from, to);
  if (zones.length === 0) return insights;

  const sorted = [...zones].sort((a, b) => b.itemsSold - a.itemsSold);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];

  if (top && top.itemsSold > 0) {
    insights.push({
      type: "positive",
      message: `${top.location} is your best performing zone with ${top.itemsSold} items sold.`,
    });
  }

  if (bottom && bottom.itemsSold === 0 && sorted.length > 1) {
    insights.push({
      type: "warning",
      message: `${bottom.location} had no sales in this period. Consider reorganising.`,
    });
  }

  // Compare top zone avg time to sell vs overall avg
  const totalSold = zones.reduce((s, z) => s + z.itemsSold, 0);
  const totalSeconds = zones.reduce(
    (s, z) => s + (z.avgTimeToSellSeconds ?? 0) * z.itemsSold,
    0,
  );
  const overallAvg = totalSold > 0 ? totalSeconds / totalSold : null;

  if (overallAvg && top.avgTimeToSellSeconds) {
    const pct = ((overallAvg - top.avgTimeToSellSeconds) / overallAvg) * 100;
    if (pct > 20) {
      insights.push({
        type: "positive",
        message: `Items sell ${pct.toFixed(0)}% faster in ${top.location} than average.`,
      });
    }
  }

  return insights;
}
```

---

## Part H — Stats Controller

**File:** `src/modules/stats/controllers/stats.controller.ts`

```typescript
import type { Request, Response } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { DateRangeSchema } from "../contracts/stats.contract.js";
import {
  getZonesOverview,
  getZoneDetail,
  getCategoriesOverview,
  getDimensionsStats,
  getSalesVelocity,
  getSmartInsights,
} from "../repositories/stats.repository.js";

export const getZonesOverviewController = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to } = DateRangeSchema.parse(req.query);
    const shopId = req.authUser!.shopId!;
    const data = await getZonesOverview(shopId, from, to);
    res.json({ data });
  },
);

export const getZoneDetailController = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to } = DateRangeSchema.parse(req.query);
    const location = decodeURIComponent(req.params.location);
    const shopId = req.authUser!.shopId!;
    const data = await getZoneDetail(location, from, to);
    res.json({ data: { location, ...data } });
  },
);

export const getCategoriesController = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to } = DateRangeSchema.parse(req.query);
    const shopId = req.authUser!.shopId!;
    const data = await getCategoriesOverview(shopId, from, to);
    res.json({ data });
  },
);

export const getDimensionsController = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to } = DateRangeSchema.parse(req.query);
    const shopId = req.authUser!.shopId!;
    const data = await getDimensionsStats(shopId, from, to);
    res.json({ data });
  },
);

export const getVelocityController = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to } = DateRangeSchema.parse(req.query);
    const data = await getSalesVelocity(from, to);
    res.json({ data });
  },
);

export const getInsightsController = asyncHandler(
  async (req: Request, res: Response) => {
    const { from, to } = DateRangeSchema.parse(req.query);
    const shopId = req.authUser!.shopId!;
    const data = await getSmartInsights(shopId, from, to);
    res.json({ data });
  },
);
```

---

## Part I — Stats Routes

**File:** `src/modules/stats/routes/stats.routes.ts`

```typescript
import { Router } from "express";
import { authenticateUserMiddleware } from "../../auth/middleware/authenticate-user.middleware.js";
import { requireShopLinkMiddleware } from "../../auth/middleware/require-shop-link.middleware.js";
import {
  getZonesOverviewController,
  getZoneDetailController,
  getCategoriesController,
  getDimensionsController,
  getVelocityController,
  getInsightsController,
} from "../controllers/stats.controller.js";

export const statsRouter = Router();

statsRouter.use(authenticateUserMiddleware);
statsRouter.use(requireShopLinkMiddleware);

statsRouter.get("/zones", getZonesOverviewController);
statsRouter.get("/zones/:location", getZoneDetailController);
statsRouter.get("/categories", getCategoriesController);
statsRouter.get("/dimensions", getDimensionsController);
statsRouter.get("/velocity", getVelocityController);
statsRouter.get("/insights", getInsightsController);
```

Register in `server.ts`:

```typescript
import { statsRouter } from "./modules/stats/routes/stats.routes.js";

app.use("/stats", statsRouter);
app.use("/api/stats", statsRouter);
```

---

## Part J — Zone Management

### Zone Domain

**File:** `src/modules/zones/domain/zone.ts`

```typescript
export type StoreZone = {
  id: string;
  shopId: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  sortOrder: number;
};
```

### Zone Contract

**File:** `src/modules/zones/contracts/zone.contract.ts`

```typescript
import { z } from "zod";

export const CreateZoneSchema = z.object({
  label: z.string().min(1).max(100),
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
  sortOrder: z.number().int().default(0),
});

export const UpdateZoneSchema = CreateZoneSchema.partial();

export const ReorderZonesSchema = z.object({
  zones: z.array(
    z.object({
      id: z.string(),
      sortOrder: z.number().int(),
    }),
  ),
});
```

### Zone Repository

**File:** `src/modules/zones/repositories/zone.repository.ts`

```typescript
import { prisma } from "../../../shared/database/prisma-client.js";

export async function listZones(shopId: string) {
  return prisma.storeZone.findMany({
    where: { shopId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function createZone(shopId: string, data: {
  label: string; x: number; y: number; width: number; height: number; sortOrder: number;
}) {
  return prisma.storeZone.create({ data: { ...data, shopId } });
}

export async function updateZone(id: string, shopId: string, data: Partial<{
  label: string; x: number; y: number; width: number; height: number; sortOrder: number;
}>) {
  return prisma.storeZone.updateMany({
    where: { id, shopId },
    data,
  });
}

export async function deleteZone(id: string, shopId: string) {
  return prisma.storeZone.deleteMany({ where: { id, shopId } });
}

export async function reorderZones(shopId: string, updates: Array<{ id: string; sortOrder: number }>) {
  return prisma.$transaction(
    updates.map((u) =>
      prisma.storeZone.updateMany({
        where: { id: u.id, shopId },
        data: { sortOrder: u.sortOrder },
      }),
    ),
  );
}
```

### Zone Controller

**File:** `src/modules/zones/controllers/zones.controller.ts`

```typescript
import type { Request, Response } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import {
  CreateZoneSchema,
  UpdateZoneSchema,
  ReorderZonesSchema,
} from "../contracts/zone.contract.js";
import {
  listZones,
  createZone,
  updateZone,
  deleteZone,
  reorderZones,
} from "../repositories/zone.repository.js";

export const listZonesController = asyncHandler(async (req: Request, res: Response) => {
  const shopId = req.authUser!.shopId!;
  const data = await listZones(shopId);
  res.json({ data });
});

export const createZoneController = asyncHandler(async (req: Request, res: Response) => {
  const shopId = req.authUser!.shopId!;
  const body = CreateZoneSchema.parse(req.body);
  const zone = await createZone(shopId, body);
  res.status(201).json({ data: zone });
});

export const updateZoneController = asyncHandler(async (req: Request, res: Response) => {
  const shopId = req.authUser!.shopId!;
  const body = UpdateZoneSchema.parse(req.body);
  await updateZone(req.params.id, shopId, body);
  res.json({ ok: true });
});

export const deleteZoneController = asyncHandler(async (req: Request, res: Response) => {
  const shopId = req.authUser!.shopId!;
  await deleteZone(req.params.id, shopId);
  res.json({ ok: true });
});

export const reorderZonesController = asyncHandler(async (req: Request, res: Response) => {
  const shopId = req.authUser!.shopId!;
  const body = ReorderZonesSchema.parse(req.body);
  await reorderZones(shopId, body.zones);
  res.json({ ok: true });
});
```

### Zone Routes

**File:** `src/modules/zones/routes/zones.routes.ts`

```typescript
import { Router } from "express";
import { authenticateUserMiddleware } from "../../auth/middleware/authenticate-user.middleware.js";
import { requireShopLinkMiddleware } from "../../auth/middleware/require-shop-link.middleware.js";
import {
  listZonesController,
  createZoneController,
  updateZoneController,
  deleteZoneController,
  reorderZonesController,
} from "../controllers/zones.controller.js";

export const zonesRouter = Router();

zonesRouter.use(authenticateUserMiddleware);
zonesRouter.use(requireShopLinkMiddleware);

zonesRouter.get("/", listZonesController);
zonesRouter.post("/", createZoneController);
zonesRouter.patch("/:id", updateZoneController);
zonesRouter.delete("/:id", deleteZoneController);
zonesRouter.put("/reorder", reorderZonesController);
```

Register in `server.ts`:

```typescript
import { zonesRouter } from "./modules/zones/routes/zones.routes.js";

app.use("/zones", zonesRouter);
app.use("/api/zones", zonesRouter);
```

---

## Part K — Map Image Strategy

The store map image is a static PNG/JPG provided by the shop admin. There are two options:

**Option A (recommended for now):** Store as a URL in `ShopSettings` or in the frontend
as a bundled asset. Keep it simple — admin uploads via a settings endpoint, URL is stored
in a `shopSettings` JSON column or a dedicated `ShopConfig` model.

**Option B:** Store in S3/Cloudflare R2 and save the URL. Out of scope for this plan.

For the initial implementation, add a `mapImageUrl` field to the `Shop` model:

```prisma
// In schema.prisma — add to model Shop:
mapImageUrl String?
```

Expose a `PATCH /zones/map-image` endpoint (body: `{ url: string }`) that updates
`Shop.mapImageUrl`. The frontend reads this URL from the bootstrap payload or a
`GET /zones/map-image` endpoint.

Run migration: `npx prisma migrate dev --name add_map_image_url`

---

## Full API Endpoint Reference

### Stats

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/stats/zones` | auth + shop | All locations ranked with KPIs |
| GET | `/stats/zones/:location` | auth + shop | Single location detail + categories + daily series |
| GET | `/stats/categories` | auth + shop | All categories: sold, revenue, avg time to sell, best location |
| GET | `/stats/dimensions` | auth + shop | Height/width/depth/volume bucket performance |
| GET | `/stats/velocity` | auth + shop | Daily sales totals (items sold + revenue) over date range |
| GET | `/stats/insights` | auth + shop | Computed smart insight messages |

All accept `?from=ISO8601&to=ISO8601` query params. Default: last 30 days.

### Zones

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/zones` | auth + shop | List all zones for shop |
| POST | `/zones` | auth + shop | Create a zone |
| PATCH | `/zones/:id` | auth + shop | Update zone label/position |
| DELETE | `/zones/:id` | auth + shop | Delete zone |
| PUT | `/zones/reorder` | auth + shop | Bulk update sort order |

---

## Checklist

- [ ] Extract `startOfUtcDay` from `scan-history.repository.ts` to `src/shared/utils/date.ts`
- [ ] Add `itemsReceived` increment to `appendLocationEvent()` in `scan-history.repository.ts`
- [ ] Add `StoreZone` model to `prisma/schema.prisma`
- [ ] Add `mapImageUrl` to `Shop` model in `prisma/schema.prisma`
- [ ] Run `npx prisma migrate dev` and `npx prisma generate`
- [ ] Create `src/modules/stats/` with all files
- [ ] Create `src/modules/zones/` with all files
- [ ] Register `statsRouter` and `zonesRouter` in `server.ts`
- [ ] Manual test all 6 stats endpoints with `curl` or Postman
- [ ] Manual test all 5 zone endpoints
