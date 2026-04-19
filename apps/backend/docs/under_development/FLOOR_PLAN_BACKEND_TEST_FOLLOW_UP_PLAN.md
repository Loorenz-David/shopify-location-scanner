# Floor Plan Backend Test Follow-Up Plan

## Why this follow-up exists

The floor-plan backend implementation is complete and migrated, but the change set did not add backend tests. That is the remaining gap versus the backend contract expectations.

This follow-up is intentionally narrow: add coverage for the new behavior without redesigning the implementation.

---

## Goals

Add tests for:

1. Floor-plan request validation
2. Floor-plan CRUD happy paths
3. Floor-plan delete guard when zones are still assigned
4. Zone create/update support for `floorPlanId`, `widthCm`, `depthCm`
5. Zone list filtering by `floorPlanId`
6. Error mapping for not-found and validation failures

---

## Proposed Coverage

### 1. Controller / route integration coverage

Add integration-style tests for:

- `POST /api/floor-plans`
  - accepts rectangular floor
  - accepts polygon floor
  - rejects invalid polygon points outside bounds
- `GET /api/floor-plans`
  - returns shop-scoped floor plans ordered by `sortOrder`
- `GET /api/floor-plans/:id`
  - returns one floor plan
  - returns 404 for unknown id
- `PATCH /api/floor-plans/:id`
  - updates scalar fields
  - clears `shape` with `null`
- `DELETE /api/floor-plans/:id`
  - succeeds when no zones are assigned
  - returns 400 when assigned zones still exist

### 2. Zone endpoint regression coverage

Add integration-style tests for:

- `POST /api/zones`
  - accepts `floorPlanId`, `widthCm`, `depthCm`
- `PATCH /api/zones/:id`
  - updates physical dimensions
- `GET /api/zones?floorPlanId=...`
  - returns only zones for the requested floor plan
- `GET /api/zones`
  - preserves backward-compatible unfiltered behavior

### 3. Repository-level coverage where useful

If repository tests exist or are added for this area, cover:

- floor-plan delete guard behavior
- zone repository filtering behavior for `floorPlanId`

---

## Exit Criteria

- Floor-plan endpoints covered by integration-style tests
- Zone filter/dimension additions covered by integration-style tests
- Validation and error mapping exercised
- Test suite passes locally
