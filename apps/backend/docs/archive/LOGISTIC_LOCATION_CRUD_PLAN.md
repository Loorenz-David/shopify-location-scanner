# LOGISTIC_LOCATION_CRUD_PLAN

## Purpose

Executable implementation plan for logistic location management endpoints and bootstrap integration.
This is a standalone plan — implement it after **Phase 1** of `LOGISTIC_MANAGEMENT_PLAN.md` (schema migration must exist first).
The module directory structure and domain types are defined in `LOGISTIC_MANAGEMENT_PLAN.md` Phase 4.1–4.4 — treat them as already in place.

---

## Architecture Rules

Follow exactly the same rules as `LOGISTIC_MANAGEMENT_PLAN.md`:
- Repositories: const object with async methods + `toDomain()` mapper
- Contracts: Zod schemas + exported inferred types
- Controllers: const object with async handlers, `req.authUser.shopId` for shop scoping
- Routes: `asyncHandler` on every handler, `authenticateUserMiddleware` + `requireShopLinkMiddleware` already applied at router level
- Errors: `NotFoundError`, `ValidationError` from `src/shared/errors/http-errors.ts`
- Logging: `logger.info` at start of every operation

---

## Endpoints

| Method | Path | Action |
|---|---|---|
| `GET` | `/logistic/get-location` | List locations with optional filters |
| `PUT` | `/logistic/add-location` | Create a new location |
| `PATCH` | `/logistic/update-location/:locationId` | Update an existing location |
| `DELETE` | `/logistic/delete-location/:locationId` | Delete a location |

These replace the placeholder stubs in section 4.12 of `LOGISTIC_MANAGEMENT_PLAN.md`.

---

## Step 1 — Extend `contracts/logistic.contract.ts`

File: `apps/backend/src/modules/logistic/contracts/logistic.contract.ts`

Add these schemas and types. Do not duplicate anything already defined in the file.

```typescript
export const GetLogisticLocationsQuerySchema = z.object({
  q: z.string().trim().min(1).max(120).optional(),
  zoneType: LogisticZoneTypeSchema.optional(),
});

export const CreateLogisticLocationInputSchema = z.object({
  location: z.string().trim().min(1).max(120),
  zoneType: LogisticZoneTypeSchema,
});

export const UpdateLogisticLocationInputSchema = z
  .object({
    location: z.string().trim().min(1).max(120).optional(),
    zoneType: LogisticZoneTypeSchema.optional(),
  })
  .refine((v) => v.location !== undefined || v.zoneType !== undefined, {
    message: "At least one of location or zoneType must be provided",
  });

export type GetLogisticLocationsQuery = z.infer<typeof GetLogisticLocationsQuerySchema>;
export type CreateLogisticLocationInput = z.infer<typeof CreateLogisticLocationInputSchema>;
export type UpdateLogisticLocationInput = z.infer<typeof UpdateLogisticLocationInputSchema>;

// Response DTO — shape returned by all location endpoints and bootstrap
export type LogisticLocationDto = {
  id: string;
  shopId: string;
  location: string;
  zoneType: LogisticZoneType;
  createdAt: Date;
};
```

---

## Step 2 — Implement `repositories/logistic-location.repository.ts`

File: `apps/backend/src/modules/logistic/repositories/logistic-location.repository.ts`

```typescript
import { prisma } from "../../../shared/database/prisma-client.js";
import type { LogisticLocationDto, LogisticZoneType } from "../contracts/logistic.contract.js";

const toDomain = (record: {
  id: string;
  shopId: string;
  location: string;
  zoneType: string;
  createdAt: Date;
}): LogisticLocationDto => ({
  id: record.id,
  shopId: record.shopId,
  location: record.location,
  zoneType: record.zoneType as LogisticZoneType,
  createdAt: record.createdAt,
});

const SELECT = {
  id: true,
  shopId: true,
  location: true,
  zoneType: true,
  createdAt: true,
} as const;

export const logisticLocationRepository = {
  async findByShop(input: {
    shopId: string;
    q?: string;
    zoneType?: string;
  }): Promise<LogisticLocationDto[]> {
    const records = await prisma.logisticLocation.findMany({
      where: {
        shopId: input.shopId,
        ...(input.zoneType ? { zoneType: input.zoneType } : {}),
        // SQLite contains = LIKE '%value%', case-insensitive for ASCII by default
        ...(input.q ? { location: { contains: input.q } } : {}),
      },
      orderBy: { location: "asc" },
      select: SELECT,
    });

    return records.map(toDomain);
  },

  async findById(input: {
    id: string;
    shopId: string;
  }): Promise<LogisticLocationDto | null> {
    const record = await prisma.logisticLocation.findFirst({
      where: { id: input.id, shopId: input.shopId },
      select: SELECT,
    });

    return record ? toDomain(record) : null;
  },

  async create(input: {
    shopId: string;
    location: string;
    zoneType: string;
  }): Promise<LogisticLocationDto> {
    const record = await prisma.logisticLocation.create({
      data: {
        shopId: input.shopId,
        location: input.location,
        zoneType: input.zoneType,
      },
      select: SELECT,
    });

    return toDomain(record);
  },

  async update(input: {
    id: string;
    shopId: string;
    location?: string;
    zoneType?: string;
  }): Promise<LogisticLocationDto | null> {
    const existing = await prisma.logisticLocation.findFirst({
      where: { id: input.id, shopId: input.shopId },
    });

    if (!existing) return null;

    const record = await prisma.logisticLocation.update({
      where: { id: input.id },
      data: {
        ...(input.location !== undefined ? { location: input.location } : {}),
        ...(input.zoneType !== undefined ? { zoneType: input.zoneType } : {}),
      },
      select: SELECT,
    });

    return toDomain(record);
  },

  async delete(input: { id: string; shopId: string }): Promise<boolean> {
    const existing = await prisma.logisticLocation.findFirst({
      where: { id: input.id, shopId: input.shopId },
    });

    if (!existing) return false;

    await prisma.logisticLocation.delete({ where: { id: input.id } });
    return true;
  },
};
```

> Repository returns `null` / `false` for not-found cases. The controller converts these to `NotFoundError`. Never throw inside the repository.

---

## Step 3 — Add Query for Bootstrap

File: `apps/backend/src/modules/logistic/queries/get-logistic-locations.query.ts`

A thin wrapper with no HTTP concerns. This is the function the bootstrap system calls.

```typescript
import { logisticLocationRepository } from "../repositories/logistic-location.repository.js";
import type { LogisticLocationDto } from "../contracts/logistic.contract.js";

export const getLogisticLocationsQuery = async (input: {
  shopId: string;
}): Promise<LogisticLocationDto[]> => {
  return logisticLocationRepository.findByShop({ shopId: input.shopId });
};
```

---

## Step 4 — Add Controller Methods to `controllers/logistic.controller.ts`

File: `apps/backend/src/modules/logistic/controllers/logistic.controller.ts`

Add these four handlers to the existing `logisticController` object. All imports come from within the logistic module.

```typescript
listLocations: async (req: Request, res: Response): Promise<void> => {
  const query = GetLogisticLocationsQuerySchema.parse({
    q: req.query.q,
    zoneType: req.query.zoneType,
  });

  const locations = await logisticLocationRepository.findByShop({
    shopId: req.authUser.shopId as string,
    q: query.q,
    zoneType: query.zoneType,
  });

  res.status(200).json({ locations });
},

createLocation: async (req: Request, res: Response): Promise<void> => {
  const input = CreateLogisticLocationInputSchema.parse(req.body);

  const location = await logisticLocationRepository.create({
    shopId: req.authUser.shopId as string,
    location: input.location,
    zoneType: input.zoneType,
  });

  logger.info("Logistic location created", {
    shopId: req.authUser.shopId,
    locationId: location.id,
  });

  res.status(201).json({ location });
},

updateLocation: async (req: Request, res: Response): Promise<void> => {
  const locationId = req.params.locationId;
  if (!locationId) throw new ValidationError("locationId param is required");

  const input = UpdateLogisticLocationInputSchema.parse(req.body);

  const location = await logisticLocationRepository.update({
    id: locationId,
    shopId: req.authUser.shopId as string,
    location: input.location,
    zoneType: input.zoneType,
  });

  if (!location) throw new NotFoundError("Logistic location not found");

  logger.info("Logistic location updated", {
    shopId: req.authUser.shopId,
    locationId,
  });

  res.status(200).json({ location });
},

deleteLocation: async (req: Request, res: Response): Promise<void> => {
  const locationId = req.params.locationId;
  if (!locationId) throw new ValidationError("locationId param is required");

  const deleted = await logisticLocationRepository.delete({
    id: locationId,
    shopId: req.authUser.shopId as string,
  });

  if (!deleted) throw new NotFoundError("Logistic location not found");

  logger.info("Logistic location deleted", {
    shopId: req.authUser.shopId,
    locationId,
  });

  res.status(200).json({ ok: true });
},
```

---

## Step 5 — Update `routes/logistic.routes.ts`

File: `apps/backend/src/modules/logistic/routes/logistic.routes.ts`

Replace the placeholder location route stubs from `LOGISTIC_MANAGEMENT_PLAN.md` section 4.12 with:

```typescript
logisticRouter.get(
  "/get-location",
  asyncHandler(logisticController.listLocations),
);

logisticRouter.put(
  "/add-location",
  asyncHandler(logisticController.createLocation),
);

logisticRouter.patch(
  "/update-location/:locationId",
  asyncHandler(logisticController.updateLocation),
);

logisticRouter.delete(
  "/delete-location/:locationId",
  asyncHandler(logisticController.deleteLocation),
);
```

---

## Step 6 — Bootstrap Integration

### 6.1 Update `apps/backend/src/modules/bootstrap/contracts/bootstrap.contract.ts`

```typescript
import type { ShopifyMetafieldOptionsDto } from "../../shopify/contracts/shopify.contract.js";
import type { LogisticLocationDto } from "../../logistic/contracts/logistic.contract.js";

export type BootstrapPayload = {
  shopify: {
    metafields: ShopifyMetafieldOptionsDto;
  };
  logisticLocations: LogisticLocationDto[];
};
```

### 6.2 Update `apps/backend/src/modules/bootstrap/queries/build-bootstrap-payload.query.ts`

Fetch both in parallel — do not use sequential `await`.

```typescript
import type { BootstrapPayload } from "../contracts/bootstrap.contract.js";
import { getMetafieldOptionsQuery } from "../../shopify/queries/get-metafield-options.query.js";
import { getLogisticLocationsQuery } from "../../logistic/queries/get-logistic-locations.query.js";

export const buildBootstrapPayloadQuery = async (input: {
  shopId: string;
}): Promise<BootstrapPayload> => {
  const [metafields, logisticLocations] = await Promise.all([
    getMetafieldOptionsQuery({ shopId: input.shopId }),
    getLogisticLocationsQuery({ shopId: input.shopId }),
  ]);

  return {
    shopify: { metafields },
    logisticLocations,
  };
};
```

---

## Validation Checklist

- [ ] `GET /api/logistic/get-location` returns all locations for the authenticated shop
- [ ] `GET /api/logistic/get-location?q=shelf` returns only locations whose `location` contains "shelf" (case-insensitive)
- [ ] `GET /api/logistic/get-location?zoneType=for_delivery` filters by zone type
- [ ] Both `q` and `zoneType` can be combined in one request
- [ ] `PUT /api/logistic/add-location` with valid `{ location, zoneType }` returns `201` with `{ location: { id, shopId, location, zoneType, createdAt } }`
- [ ] `PUT /api/logistic/add-location` with invalid `zoneType` returns `400` validation error
- [ ] `PATCH /api/logistic/update-location/:locationId` with `{ location }` only updates `location`, leaves `zoneType` unchanged
- [ ] `PATCH /api/logistic/update-location/:locationId` with empty body `{}` returns `400` validation error
- [ ] `PATCH /api/logistic/update-location/:locationId` using a locationId from a different shop returns `404`
- [ ] `DELETE /api/logistic/delete-location/:locationId` returns `200 { ok: true }`
- [ ] `DELETE /api/logistic/delete-location/:locationId` on unknown id returns `404`
- [ ] `GET /api/bootstrap/payload` includes `logisticLocations` array with correct shape
- [ ] Bootstrap `logisticLocations` matches the shape returned by `GET /api/logistic/get-location`
- [ ] Bootstrap fetches metafields and logistic locations in parallel (no sequential await)
