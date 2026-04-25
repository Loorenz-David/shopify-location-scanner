# Unified Scanner Remaining Work

## Status

Frontend feature implementation is complete enough to build and integrate, but end-to-end rollout is blocked by backend work.

## Remaining Work

### 1. Backend enriched item search

Implement the backend plan in:

`apps/backend/docs/under_development/UNIFIED_SCANNER_BACKEND_PLAN.md`

Required outcome:

- `GET /shopify/items/by-sku` must return the logistic enrichment expected by the frontend:
  - `id`
  - `isSold`
  - `intention`
  - `fixItem`
  - `isItemFixed`
  - ideally `currentPosition` as planned

### 2. Backend placement auto-derivation

`POST /logistic/placements` must allow sold items with `intention = null` and derive intention from `zoneType` when appropriate.

Required outcome:

- unified scanner logistic placements do not fail solely because intention is missing

### 3. End-to-end contract validation

After backend work lands, validate the following scenarios:

- unknown item barcode falls back to shop flow
- sold item resolves logistic mode
- unsold item resolves shop mode
- fix-check warning appears when expected
- zone mismatch warning appears when expected
- shop placement succeeds and supports next scan
- logistic placement succeeds and shows success overlay
- sold item with no intention can still be placed into a logistic zone

### 4. Frontend cleanup after backend lands

Revisit the frontend contract once the backend response shape is final.

Specific check:

- the current frontend mapper does not consume `currentPosition` yet even though the original frontend plan included it in the unified item shape

If the backend returns `currentPosition`, wire it through the frontend mapper and surface it where useful.

## Exit Criteria

This remaining work is complete when:

- backend enriched search is implemented
- backend placement auto-derivation is implemented
- the unified scanner flow is verified end-to-end
- `apps/frontend/docs/under_development/UNIFIED_SCANNER_PLAN.md` can be safely archived
