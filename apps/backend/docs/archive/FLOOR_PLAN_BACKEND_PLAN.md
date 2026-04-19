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

export const CreateFloorPlanSchema = z
  .object({
    name: z.string().trim().min(1).max(100).default("Ground Floor"),
    widthCm: z.number().positive("Width must be greater than 0"),
    depthCm: z.number().positive("Depth must be greater than 0"),
    shape: z.array(FloorPlanVertexSchema).min(3).nullable().optional(), // null or omitted = rectangle
    sortOrder: z.number().int().default(0),
  })
  .superRefine((data, ctx) => {
    // Validate that all polygon vertices fall within the bounding box.
    // Only checked on create; the update partial schema does not inherit this
    // refine, so vertex bounds on partial updates are trusted from the frontend.
    if (data.shape) {
      data.shape.forEach((v, i) => {
        if (v.xCm < 0 || v.xCm > data.widthCm) {
          ctx.addIssue({
            code: "custom",
            path: ["shape", i, "xCm"],
            message: `xCm must be between 0 and widthCm (${data.widthCm})`,
          });
        }
        if (v.yCm < 0 || v.yCm > data.depthCm) {
          ctx.addIssue({
            code: "custom",
            path: ["shape", i, "yCm"],
            message: `yCm must be between 0 and depthCm (${data.depthCm})`,
          });
        }
      });
    }
  });

export const UpdateFloorPlanSchema = CreateFloorPlanSchema.innerType().partial();

export type CreateFloorPlanInput = z.infer<typeof CreateFloorPlanSchema>;
export type UpdateFloorPlanInput = z.infer<typeof UpdateFloorPlanSchema>;
```

### B3 — `src/modules/floor-plan/repositories/floor-plan.repository.ts`

> **`onDelete: SetNull` behaviour** — when a floor plan is deleted, all its zones
> have `floorPlanId` set to null by the DB cascade. They are NOT deleted — they
> become "unassigned" zones. The `delete` method below guards against accidental
> deletes by refusing if any zones are still assigned to that floor plan (HTTP 400
> from the controller). If the frontend wants to allow force-delete it can first
> reassign or unlink zones, then delete the plan.

```typescript
import { prisma } from "../../../shared/database/prisma-client.js";
import { NotFoundError, ValidationError } from "../../../shared/errors/http-errors.js";
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

    // Object.fromEntries strips `undefined` fields (omitted in partial update)
    // but preserves `null` fields (e.g. shape: null to clear a polygon).
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
    const existing = await prisma.floorPlan.findFirst({ where: { id, shopId } });
    if (!existing) throw new NotFoundError("Floor plan not found");

    // Guard: refuse if zones are still assigned to prevent silent detach.
    const assignedCount = await prisma.storeZone.count({ where: { floorPlanId: id } });
    if (assignedCount > 0) {
      throw new ValidationError(
        `Cannot delete floor plan — ${assignedCount} zone(s) are still assigned to it. Reassign or remove them first.`,
      );
    }

    await prisma.floorPlan.delete({ where: { id } });
  },
};
```

### B4 — Queries

**`src/modules/floor-plan/queries/get-floor-plans.query.ts`**

```typescript
import { floorPlanRepository } from "../repositories/floor-plan.repository.js";
import type { FloorPlan } from "../domain/floor-plan.js";

export const getFloorPlansQuery = async (shopId: string): Promise<FloorPlan[]> =>
  floorPlanRepository.list(shopId);
```

**`src/modules/floor-plan/queries/get-floor-plan.query.ts`**

```typescript
import { floorPlanRepository } from "../repositories/floor-plan.repository.js";
import type { FloorPlan } from "../domain/floor-plan.js";

export const getFloorPlanQuery = async (id: string, shopId: string): Promise<FloorPlan> =>
  floorPlanRepository.findById(id, shopId);
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
import { getFloorPlanQuery } from "../queries/get-floor-plan.query.js";
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

export const getFloorPlanController = asyncHandler(
  async (req: Request, res: Response) => {
    const shopId = req.authUser.shopId as string;
    const id = getRequiredIdParam(req.params.id);
    const data = await getFloorPlanQuery(id, shopId);
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
floorPlanRouter.get("/:id", getFloorPlanController);
floorPlanRouter.patch("/:id", updateFloorPlanController);
floorPlanRouter.delete("/:id", deleteFloorPlanController);
```

### B8 — Wire into app router

Add to `apps/backend/src/server.ts` alongside line ~135 where `zonesRouter` is registered:

```typescript
import { floorPlanRouter } from "./modules/floor-plan/routes/floor-plan.routes.js";

// Add after the zonesRouter line:
app.use("/api/floor-plans", floorPlanRouter);
```

---

## Part C — Update Zones Module

### C1 — Update `src/modules/zones/domain/zone.ts`

> **Naming note** — `StoreZone.widthCm` / `depthCm` are the **physical size of the
> shelf unit** (entered manually by staff). They are distinct from
> `FloorPlan.widthCm` / `depthCm`, which are the **floor bounding box** that defines
> the percentage coordinate space. Do not confuse them.
>
> Also note: `StoreZone.label` is the link to the stats system. A zone with
> `label: "H1"` maps to all `locationStatsDaily` rows where `location` starts with
> `"H1"` (e.g. `H1`, `H1:2`). Never change `label` without considering the stats impact.

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
  floorPlanId: string | null;   // ADD — which floor plan this zone belongs to
  widthCm: number | null;       // ADD — physical shelf width in cm (NOT floor canvas size)
  depthCm: number | null;       // ADD — physical shelf depth in cm (NOT floor canvas size)
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

## Part D — GET /zones filter by floorPlanId (required for multi-floor stores)

The `list` query in `zone.repository.ts` must support filtering by `floorPlanId`.
Without this, `GET /zones` returns ALL zones across all floor plans. The frontend map
renders one floor at a time, so mixing zones from different floors on one canvas is
incorrect. This filter is required as soon as more than one floor plan exists.

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
| GET | `/api/floor-plans/:id` | Get a single floor plan by id |
| PATCH | `/api/floor-plans/:id` | Update name / dimensions / shape |
| DELETE | `/api/floor-plans/:id` | Delete a floor plan (fails if zones still assigned) |
| GET | `/api/zones?floorPlanId=...` | List zones, filtered by floor plan (required for multi-floor) |
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
- [ ] B4 — Create `get-floor-plans.query.ts` and `get-floor-plan.query.ts` (list + single)
- [ ] B5 — Create three command files (create / update / delete)
- [ ] B6 — Create `src/modules/floor-plan/controllers/floor-plan.controller.ts` (includes `getFloorPlanController`)
- [ ] B7 — Create `src/modules/floor-plan/routes/floor-plan.routes.ts` (includes `GET /:id`)
- [ ] B8 — Register `floorPlanRouter` at `/api/floor-plans` in `apps/backend/src/server.ts`
- [ ] C1 — Update `zone.ts` domain type with three new fields
- [ ] C2 — Update `zone.contract.ts` with optional `floorPlanId`, `widthCm`, `depthCm`
- [ ] C3 — Update `zone.repository.ts` `toDomain` function
- [ ] D — Add `floorPlanId` filter to zone list query and controller (required for multi-floor)
