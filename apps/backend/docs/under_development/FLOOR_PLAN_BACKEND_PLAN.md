# Floor Plan Backend Implementation Plan

## Overview

This plan adds two things:
1. A **FloorPlan** model — defines the real-world boundaries of a store floor in cm.
   One shop can have multiple floor plans (ground floor, first floor, etc.) but
   initially only one will be used. The architecture must support multiple from day one.
2. **Physical dimensions on StoreZone** — `widthCm` and `depthCm` on each zone
   record the real-world size of that shelf or area in centimetres.

The percentage coordinates (`xPct`, `yPct`, `widthPct`, `heightPct`) on `StoreZone`
remain unchanged. They describe position *within* the floor plan canvas as 0–100 values.
`widthCm` and `depthCm` on a zone are the actual physical size of that rectangle in the
real world — entered manually by staff, not derived from percentages.

### Floor shape

A `FloorPlan` has a `widthCm` × `depthCm` bounding box that defines the coordinate
space for zone percentages. In addition it carries an optional `shape` JSON field — an
ordered array of `{ xCm, yCm }` vertices describing the actual floor outline as a polygon.

- `shape: null` — the floor is a plain rectangle (the bounding box). Backward-compatible default.
- `shape: [...]` — the floor has an irregular outline (L-shape, alcove, etc.). The frontend
  renders this as an SVG `<polygon>` and clips zone rectangles to it.

Vertices are in centimetres relative to the top-left corner `(0, 0)` of the bounding box.
They must form a closed polygon with at least 3 points. The frontend connects the last
vertex back to the first automatically.

No existing endpoints are removed. All changes are additive and backward-compatible.

---

## Part A — Prisma Schema Changes

### A1 — New FloorPlan model

Add to `prisma/schema.prisma`:

```prisma
model FloorPlan {
  id        String      @id @default(cuid())
  shopId    String
  name      String      @default("Ground Floor")
  widthCm   Float       @map("width_cm")
  depthCm   Float       @map("depth_cm")
  shape     Json?       // null = rectangle; otherwise [{xCm, yCm}, ...] polygon vertices
  sortOrder Int         @default(0)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  shop  Shop        @relation(fields: [shopId], references: [id], onDelete: Cascade)
  zones StoreZone[]

  @@index([shopId, sortOrder])
  @@map("floor_plan")
}
```

### A2 — Update Shop model

Add the relation field to the `Shop` model:

```prisma
floorPlans FloorPlan[]
```

The Shop model currently has `storeZones StoreZone[]`. Leave that unchanged.

### A3 — Update StoreZone model

Add three new fields to the existing `StoreZone` model:

```prisma
floorPlanId String?   @map("floor_plan_id")
widthCm     Float?    @map("width_cm")
depthCm     Float?    @map("depth_cm")

floorPlan FloorPlan? @relation(fields: [floorPlanId], references: [id], onDelete: SetNull)
```

All three are nullable for backward compatibility with zones that existed before this
migration. New zones created after this migration should always supply `floorPlanId`.

Also add index:

```prisma
@@index([floorPlanId, sortOrder])
```

### A4 — Migration

Run:

```bash
npx prisma migrate dev --name add_floor_plan_and_zone_dimensions
```

This generates the migration file. Do not hand-write the SQL.

---

## Part B — FloorPlan Module (new)

Create the following files. The module pattern matches the existing `zones` module exactly.

### B1 — `src/modules/floor-plan/domain/floor-plan.ts`

```typescript
export type FloorPlanVertex = {
  xCm: number;
  yCm: number;
};

export type FloorPlan = {
  id: string;
  shopId: string;
  name: string;
  widthCm: number;
  depthCm: number;
  shape: FloorPlanVertex[] | null; // null = plain rectangle
  sortOrder: number;
};
```

### B2 — `src/modules/floor-plan/contracts/floor-plan.contract.ts`

```typescript
import { z } from "zod";

export const FloorPlanVertexSchema = z.object({
  xCm: z.number(),
  yCm: z.number(),
});

export const CreateFloorPlanSchema = z.object({
  name: z.string().trim().min(1).max(100).default("Ground Floor"),
  widthCm: z.number().positive("Width must be greater than 0"),
  depthCm: z.number().positive("Depth must be greater than 0"),
  shape: z.array(FloorPlanVertexSchema).min(3).nullable().optional(), // null or omitted = rectangle
  sortOrder: z.number().int().default(0),
});

export const UpdateFloorPlanSchema = CreateFloorPlanSchema.partial();

export type CreateFloorPlanInput = z.infer<typeof CreateFloorPlanSchema>;
export type UpdateFloorPlanInput = z.infer<typeof UpdateFloorPlanSchema>;
```

### B3 — `src/modules/floor-plan/repositories/floor-plan.repository.ts`

```typescript
import { prisma } from "../../../shared/database/prisma-client.js";
import { NotFoundError } from "../../../shared/errors/http-errors.js";
import type {
  CreateFloorPlanInput,
  UpdateFloorPlanInput,
} from "../contracts/floor-plan.contract.js";
import type { FloorPlan } from "../domain/floor-plan.js";

const toDomain = (record: {
  id: string;
  shopId: string;
  name: string;
  widthCm: number;
  depthCm: number;
  shape: unknown;
  sortOrder: number;
}): FloorPlan => ({
  id: record.id,
  shopId: record.shopId,
  name: record.name,
  widthCm: record.widthCm,
  depthCm: record.depthCm,
  shape: record.shape as FloorPlan["shape"], // Prisma returns Json as unknown; safe cast after Zod validation on write
  sortOrder: record.sortOrder,
});

export const floorPlanRepository = {
  async list(shopId: string): Promise<FloorPlan[]> {
    const rows = await prisma.floorPlan.findMany({
      where: { shopId },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map(toDomain);
  },

  async findById(id: string, shopId: string): Promise<FloorPlan> {
    const row = await prisma.floorPlan.findFirst({ where: { id, shopId } });
    if (!row) throw new NotFoundError("Floor plan not found");
    return toDomain(row);
  },

  async create(shopId: string, data: CreateFloorPlanInput): Promise<FloorPlan> {
    const row = await prisma.floorPlan.create({
      data: { shopId, ...data },
    });
    return toDomain(row);
  },

  async update(id: string, shopId: string, data: UpdateFloorPlanInput): Promise<FloorPlan> {
    const existing = await prisma.floorPlan.findFirst({ where: { id, shopId } });
    if (!existing) throw new NotFoundError("Floor plan not found");

    const updateData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    );

    const updated = await prisma.floorPlan.update({
      where: { id: existing.id },
      data: updateData,
    });
    return toDomain(updated);
  },

  async delete(id: string, shopId: string): Promise<void> {
    const deleted = await prisma.floorPlan.deleteMany({ where: { id, shopId } });
    if (deleted.count === 0) throw new NotFoundError("Floor plan not found");
  },
};
```

### B4 — `src/modules/floor-plan/queries/get-floor-plans.query.ts`

```typescript
import { floorPlanRepository } from "../repositories/floor-plan.repository.js";
import type { FloorPlan } from "../domain/floor-plan.js";

export const getFloorPlansQuery = async (shopId: string): Promise<FloorPlan[]> =>
  floorPlanRepository.list(shopId);
```

### B5 — Commands

**`src/modules/floor-plan/commands/create-floor-plan.command.ts`**

```typescript
import { floorPlanRepository } from "../repositories/floor-plan.repository.js";
import type { CreateFloorPlanInput } from "../contracts/floor-plan.contract.js";
import type { FloorPlan } from "../domain/floor-plan.js";

export const createFloorPlanCommand = async (
  shopId: string,
  input: CreateFloorPlanInput,
): Promise<FloorPlan> => floorPlanRepository.create(shopId, input);
```

**`src/modules/floor-plan/commands/update-floor-plan.command.ts`**

```typescript
import { floorPlanRepository } from "../repositories/floor-plan.repository.js";
import type { UpdateFloorPlanInput } from "../contracts/floor-plan.contract.js";
import type { FloorPlan } from "../domain/floor-plan.js";

export const updateFloorPlanCommand = async (
  id: string,
  shopId: string,
  input: UpdateFloorPlanInput,
): Promise<FloorPlan> => floorPlanRepository.update(id, shopId, input);
```

**`src/modules/floor-plan/commands/delete-floor-plan.command.ts`**

```typescript
import { floorPlanRepository } from "../repositories/floor-plan.repository.js";

export const deleteFloorPlanCommand = async (
  id: string,
  shopId: string,
): Promise<void> => floorPlanRepository.delete(id, shopId);
```

### B6 — `src/modules/floor-plan/controllers/floor-plan.controller.ts`

```typescript
import type { Request, Response } from "express";
import { asyncHandler } from "../../../shared/http/async-handler.js";
import { ValidationError } from "../../../shared/errors/http-errors.js";
import {
  CreateFloorPlanSchema,
  UpdateFloorPlanSchema,
} from "../contracts/floor-plan.contract.js";
import { getFloorPlansQuery } from "../queries/get-floor-plans.query.js";
import { createFloorPlanCommand } from "../commands/create-floor-plan.command.js";
import { updateFloorPlanCommand } from "../commands/update-floor-plan.command.js";
import { deleteFloorPlanCommand } from "../commands/delete-floor-plan.command.js";

const getRequiredIdParam = (value: unknown): string => {
  if (!value || typeof value !== "string" || !value.trim()) {
    throw new ValidationError("Floor plan id path parameter is required");
  }
  return value.trim();
};

export const listFloorPlansController = asyncHandler(
  async (req: Request, res: Response) => {
    const shopId = req.authUser.shopId as string;
    const data = await getFloorPlansQuery(shopId);
    res.status(200).json({ data });
  },
);

export const createFloorPlanController = asyncHandler(
  async (req: Request, res: Response) => {
    const shopId = req.authUser.shopId as string;
    const body = CreateFloorPlanSchema.parse(req.body);
    const data = await createFloorPlanCommand(shopId, body);
    res.status(201).json({ data });
  },
);

export const updateFloorPlanController = asyncHandler(
  async (req: Request, res: Response) => {
    const shopId = req.authUser.shopId as string;
    const id = getRequiredIdParam(req.params.id);
    const body = UpdateFloorPlanSchema.parse(req.body);
    const data = await updateFloorPlanCommand(id, shopId, body);
    res.status(200).json({ data });
  },
);

export const deleteFloorPlanController = asyncHandler(
  async (req: Request, res: Response) => {
    const shopId = req.authUser.shopId as string;
    const id = getRequiredIdParam(req.params.id);
    await deleteFloorPlanCommand(id, shopId);
    res.status(200).json({ ok: true });
  },
);
```

### B7 — `src/modules/floor-plan/routes/floor-plan.routes.ts`

```typescript
import { Router } from "express";
import { authenticateUserMiddleware } from "../../auth/middleware/authenticate-user.middleware.js";
import { requireShopLinkMiddleware } from "../../auth/middleware/require-shop-link.middleware.js";
import {
  listFloorPlansController,
  createFloorPlanController,
  updateFloorPlanController,
  deleteFloorPlanController,
} from "../controllers/floor-plan.controller.js";

export const floorPlanRouter = Router();

floorPlanRouter.use(authenticateUserMiddleware);
floorPlanRouter.use(requireShopLinkMiddleware);

floorPlanRouter.get("/", listFloorPlansController);
floorPlanRouter.post("/", createFloorPlanController);
floorPlanRouter.patch("/:id", updateFloorPlanController);
floorPlanRouter.delete("/:id", deleteFloorPlanController);
```

### B8 — Wire into app router

Find the file that registers all routers (likely `src/app.ts` or `src/modules/index.ts`
or similar — look for where `zonesRouter` is used). Add:

```typescript
import { floorPlanRouter } from "./modules/floor-plan/routes/floor-plan.routes.js";

// alongside the other router registrations:
app.use("/api/floor-plans", floorPlanRouter);
```

---

## Part C — Update Zones Module

### C1 — Update `src/modules/zones/domain/zone.ts`

```typescript
export type StoreZoneType = "zone" | "corridor";

export type StoreZone = {
  id: string;
  shopId: string;
  label: string;
  type: StoreZoneType;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  sortOrder: number;
  floorPlanId: string | null;   // ADD
  widthCm: number | null;       // ADD
  depthCm: number | null;       // ADD
};
```

### C2 — Update `src/modules/zones/contracts/zone.contract.ts`

Add optional fields to `CreateZoneSchema`:

```typescript
export const CreateZoneSchema = z.object({
  label: z.string().trim().min(1).max(100),
  type: z.enum(["zone", "corridor"]).default("zone"),
  xPct: z.number().min(0).max(100),
  yPct: z.number().min(0).max(100),
  widthPct: z.number().min(0.1).max(100),
  heightPct: z.number().min(0.1).max(100),
  sortOrder: z.number().int().default(0),
  floorPlanId: z.string().trim().min(1).nullable().optional(),  // ADD
  widthCm: z.number().positive().nullable().optional(),         // ADD
  depthCm: z.number().positive().nullable().optional(),         // ADD
});
```

`UpdateZoneSchema` is derived via `.partial()` so it inherits these automatically.

### C3 — Update `src/modules/zones/repositories/zone.repository.ts`

Update the `toDomain` function to include the new fields:

```typescript
const toDomain = (record: {
  id: string;
  shopId: string;
  label: string;
  type: string;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  sortOrder: number;
  floorPlanId: string | null;   // ADD
  widthCm: number | null;       // ADD
  depthCm: number | null;       // ADD
}): StoreZone => ({
  id: record.id,
  shopId: record.shopId,
  label: record.label,
  type: record.type as StoreZone["type"],
  xPct: record.xPct,
  yPct: record.yPct,
  widthPct: record.widthPct,
  heightPct: record.heightPct,
  sortOrder: record.sortOrder,
  floorPlanId: record.floorPlanId,   // ADD
  widthCm: record.widthCm,           // ADD
  depthCm: record.depthCm,           // ADD
});
```

No other changes to zone.repository.ts. The `list`, `create`, `update`, `delete`,
and `reorder` functions do not need changes because Prisma reads/writes all model
fields automatically.

---

## Part D — GET /zones filter by floorPlanId (optional enhancement)

The `list` query in `zone.repository.ts` can optionally filter by `floorPlanId`.
This enables the frontend to load zones for a specific floor without loading all floors.

Update the `list` method signature:

```typescript
async list(shopId: string, floorPlanId?: string | null): Promise<StoreZone[]> {
  const rows = await prisma.storeZone.findMany({
    where: {
      shopId,
      ...(floorPlanId !== undefined ? { floorPlanId } : {}),
    },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(toDomain);
},
```

Update `src/modules/zones/queries/get-zones.query.ts`:

```typescript
export const getZonesQuery = async (
  shopId: string,
  floorPlanId?: string | null,
) => zoneRepository.list(shopId, floorPlanId);
```

Update `src/modules/zones/controllers/zones.controller.ts` — `listZonesController`:

```typescript
export const listZonesController = asyncHandler(
  async (req: Request, res: Response) => {
    const shopId = req.authUser.shopId as string;
    const floorPlanId =
      typeof req.query.floorPlanId === "string"
        ? req.query.floorPlanId
        : undefined;
    const data = await getZonesQuery(shopId, floorPlanId);
    res.status(200).json({ data });
  },
);
```

---

## Endpoint Summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/floor-plans` | List all floor plans for the shop |
| POST | `/api/floor-plans` | Create a floor plan |
| PATCH | `/api/floor-plans/:id` | Update name / dimensions |
| DELETE | `/api/floor-plans/:id` | Delete a floor plan |
| GET | `/api/zones?floorPlanId=...` | List zones, optionally filtered by floor |
| POST | `/api/zones` | Create zone — now accepts `floorPlanId`, `widthCm`, `depthCm` |
| PATCH | `/api/zones/:id` | Update zone — now accepts `widthCm`, `depthCm` |

---

## Request / Response shapes

### `POST /api/floor-plans`

**Rectangular floor (shape omitted or null):**
```json
{
  "name": "Ground Floor",
  "widthCm": 1200,
  "depthCm": 800
}
```

**Irregular floor (L-shape example):**
```json
{
  "name": "Ground Floor",
  "widthCm": 1200,
  "depthCm": 800,
  "shape": [
    { "xCm": 0,    "yCm": 0   },
    { "xCm": 1200, "yCm": 0   },
    { "xCm": 1200, "yCm": 400 },
    { "xCm": 600,  "yCm": 400 },
    { "xCm": 600,  "yCm": 800 },
    { "xCm": 0,    "yCm": 800 }
  ]
}
```

Response `201`:
```json
{
  "data": {
    "id": "cuid...",
    "shopId": "cuid...",
    "name": "Ground Floor",
    "widthCm": 1200,
    "depthCm": 800,
    "shape": [
      { "xCm": 0,    "yCm": 0   },
      { "xCm": 1200, "yCm": 0   },
      { "xCm": 1200, "yCm": 400 },
      { "xCm": 600,  "yCm": 400 },
      { "xCm": 600,  "yCm": 800 },
      { "xCm": 0,    "yCm": 800 }
    ],
    "sortOrder": 0
  }
}
```

`shape` is always present in the response — `null` for rectangular floors, vertex array for irregular ones.

### `POST /api/zones` (updated shape)

Request body:
```json
{
  "label": "Shelf A",
  "type": "zone",
  "xPct": 10,
  "yPct": 20,
  "widthPct": 25,
  "heightPct": 15,
  "sortOrder": 0,
  "floorPlanId": "cuid...",
  "widthCm": 240,
  "depthCm": 60
}
```

Response `201` — same shape as input plus `id`.

---

## Checklist

- [ ] A1 — Add `FloorPlan` model to schema.prisma (including `shape Json?`)
- [ ] A2 — Add `floorPlans FloorPlan[]` to `Shop` model
- [ ] A3 — Add `floorPlanId`, `widthCm`, `depthCm` to `StoreZone` model
- [ ] A4 — Run migration: `add_floor_plan_and_zone_dimensions`
- [ ] B1 — Create `src/modules/floor-plan/domain/floor-plan.ts` (includes `FloorPlanVertex` type)
- [ ] B2 — Create `src/modules/floor-plan/contracts/floor-plan.contract.ts` (includes `FloorPlanVertexSchema`)
- [ ] B3 — Create `src/modules/floor-plan/repositories/floor-plan.repository.ts`
- [ ] B4 — Create `src/modules/floor-plan/queries/get-floor-plans.query.ts`
- [ ] B5 — Create three command files (create / update / delete)
- [ ] B6 — Create `src/modules/floor-plan/controllers/floor-plan.controller.ts`
- [ ] B7 — Create `src/modules/floor-plan/routes/floor-plan.routes.ts`
- [ ] B8 — Register `floorPlanRouter` at `/api/floor-plans` in app router
- [ ] C1 — Update `zone.ts` domain type with three new fields
- [ ] C2 — Update `zone.contract.ts` with optional `floorPlanId`, `widthCm`, `depthCm`
- [ ] C3 — Update `zone.repository.ts` `toDomain` function
- [ ] D — Optional: add `floorPlanId` filter to zone list query and controller
