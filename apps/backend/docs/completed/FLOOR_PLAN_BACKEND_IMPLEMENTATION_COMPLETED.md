# Floor Plan Backend Implementation — Completed

## Source Plan

`docs/under_development/FLOOR_PLAN_BACKEND_PLAN.md`

---

## Summary

Implemented the floor-plan backend feature and the additive zone shape/dimension updates. The database schema, migration, new `floor-plan` module, zone extensions, and router wiring are all in place. Prisma migration applied successfully and TypeScript builds clean.

The implementation follows the existing backend layering:

- routes: auth/shop middleware + endpoint registration only
- controllers: request parsing and response mapping only
- commands/queries: use-case orchestration only
- repositories: Prisma access only

---

## What Was Implemented

### 1. Prisma schema and migration

**`prisma/schema.prisma`**

- Added new `FloorPlan` model
- Added `Shop.floorPlans` relation
- Extended `StoreZone` with:
  - `floorPlanId`
  - `widthCm`
  - `depthCm`
- Added `StoreZone -> FloorPlan` relation with `onDelete: SetNull`
- Added required indexes for `FloorPlan` and `StoreZone`

**Migration applied:**

- `prisma/migrations/20260418154717_add_floor_plan_and_zone_dimensions/`

### 2. New `floor-plan` feature module

**Created:**

- `src/modules/floor-plan/domain/floor-plan.ts`
- `src/modules/floor-plan/contracts/floor-plan.contract.ts`
- `src/modules/floor-plan/repositories/floor-plan.repository.ts`
- `src/modules/floor-plan/queries/get-floor-plans.query.ts`
- `src/modules/floor-plan/queries/get-floor-plan.query.ts`
- `src/modules/floor-plan/commands/create-floor-plan.command.ts`
- `src/modules/floor-plan/commands/update-floor-plan.command.ts`
- `src/modules/floor-plan/commands/delete-floor-plan.command.ts`
- `src/modules/floor-plan/controllers/floor-plan.controller.ts`
- `src/modules/floor-plan/routes/floor-plan.routes.ts`

### 3. Floor-plan API surface

Implemented endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/floor-plans` | List floor plans |
| POST | `/floor-plans` | Create floor plan |
| GET | `/floor-plans/:id` | Get one floor plan |
| PATCH | `/floor-plans/:id` | Update floor plan |
| DELETE | `/floor-plans/:id` | Delete floor plan |
| GET | `/api/floor-plans` | API-prefixed mirror |
| POST | `/api/floor-plans` | API-prefixed mirror |
| GET | `/api/floor-plans/:id` | API-prefixed mirror |
| PATCH | `/api/floor-plans/:id` | API-prefixed mirror |
| DELETE | `/api/floor-plans/:id` | API-prefixed mirror |

### 4. Validation and repository behavior

**`floor-plan.contract.ts`**

- Added `FloorPlanVertexSchema`
- Added `CreateFloorPlanSchema`
- Added `UpdateFloorPlanSchema`
- Validates:
  - non-empty name
  - positive `widthCm` / `depthCm`
  - polygon min length `3`
  - polygon vertices stay inside the floor bounding box on create

**`floor-plan.repository.ts`**

- Maps Prisma records into typed domain objects
- Handles nullable JSON `shape` correctly for Prisma writes
- Rejects deleting a floor plan while zones are still assigned
- Throws typed errors:
  - `NotFoundError`
  - `ValidationError`

### 5. Zone module updates

**Updated:**

- `src/modules/zones/domain/zone.ts`
- `src/modules/zones/contracts/zone.contract.ts`
- `src/modules/zones/repositories/zone.repository.ts`
- `src/modules/zones/queries/get-zones.query.ts`
- `src/modules/zones/controllers/zones.controller.ts`

Changes:

- Added `floorPlanId`, `widthCm`, `depthCm` to the zone domain type
- Extended create/update zone payloads with those optional fields
- Updated repository mapping for the new fields
- Added `floorPlanId` filtering to zone listing
- `GET /zones?floorPlanId=...` now returns zones for one floor only

### 6. Server wiring

**`src/server.ts`**

- Registered `floorPlanRouter`
- Mounted both:
  - `/floor-plans`
  - `/api/floor-plans`

---

## Plan Completion Status

- [x] A1 — Add `FloorPlan` model
- [x] A2 — Add `Shop.floorPlans`
- [x] A3 — Add `floorPlanId`, `widthCm`, `depthCm` to `StoreZone`
- [x] A4 — Run migration
- [x] B1 — Floor-plan domain type
- [x] B2 — Floor-plan contracts
- [x] B3 — Floor-plan repository
- [x] B4 — Floor-plan queries
- [x] B5 — Floor-plan commands
- [x] B6 — Floor-plan controller
- [x] B7 — Floor-plan routes
- [x] B8 — Router registration
- [x] C1 — Zone domain update
- [x] C2 — Zone contract update
- [x] C3 — Zone repository mapping update
- [x] D — `floorPlanId` filter on zone listing

---

## Verification

- `npx prisma migrate dev --name add_floor_plan_and_zone_dimensions` — applied successfully
- `npx prisma generate` — successful
- `npm run build` — successful

---

## Remaining Follow-Up

The feature implementation is complete.

One follow-up remains against the backend contract standard:

- No service/controller integration tests were added for the new floor-plan and zone behavior

A separate follow-up plan has been created for that work:

- `docs/under_development/FLOOR_PLAN_BACKEND_TEST_FOLLOW_UP_PLAN.md`
