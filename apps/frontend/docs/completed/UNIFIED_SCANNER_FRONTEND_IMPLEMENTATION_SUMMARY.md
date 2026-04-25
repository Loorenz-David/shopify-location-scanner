# Unified Scanner Frontend Implementation Summary

## Status

Complete.

The frontend implementation described in `apps/frontend/docs/under_development/UNIFIED_SCANNER_PLAN.md` is now implemented and the backend dependency it relied on has also been added in the backend codebase. The original frontend plan can be archived.

## What Was Implemented

### New feature module

A new feature was added at:

`apps/frontend/src/features/unified-scanner/`

This module includes:

- `UnifiedScannerFeature.tsx`
- `types/unified-scanner.types.ts`
- `api/search-unified-items.api.ts`
- domain rules for item mode and location warnings
- `stores/unified-scanner.store.ts`
- `actions/unified-scanner.actions.ts`
- item, location, and placement controllers
- `flows/use-unified-scanner-camera.flow.ts`
- context + provider
- full scanner UI, manual input panels, and popup components

### Scanner architecture implemented

The unified scanner now supports:

- item-first flow
- mode resolution between `shop` and `logistic`
- location scanning and manual location selection
- warning sequencing for:
  - fix-check
  - zone-mismatch
- shop placement via `linkItemPositionsApi`
- logistic placement via `markPlacementApi`
- logistic optimistic updates through the existing logistic tasks store
- local manual input overlays instead of home-shell overlay registration

### Shared scanner reuse implemented

The implementation reuses existing scanner and logistics building blocks instead of duplicating them, including:

- `ScannerGuideOverlay`
- `FrozenFrameCanvas`
- `DecodedTextPanel`
- `ScannerActionsOverlay`
- `attachDecodeSession`
- `useCameraPrewarm`
- existing location option and logistic location stores
- existing placement APIs and optimistic update helpers

### Home shell integration implemented

The app shell was updated so that:

- the BottomNav center scanner target is now `unified-scanner`
- the legacy `scanner` feature remains registered but is no longer the BottomNav target
- unified scanner popup pages were registered:
  - `unified-scanner-fix-check`
  - `unified-scanner-zone-mismatch`

### Camera session integration implemented

`apps/frontend/src/features/scanner/domain/camera-session.manager.ts` was updated additively to register:

- `unified-scanner` session id
- `unified-scanner-qr-reader` region id

### Camera prewarm updated

The item scan history flow now prewarms `unified-scanner` instead of `main-scanner` so the new BottomNav scanner opens warm.

This was done in:

`apps/frontend/src/features/item-scan-history/flows/use-item-scan-history.flow.ts`

## Verification Completed

The frontend build passes:

`npm --prefix apps/frontend run build`

## Backend Contract Now Present

The backend now provides the expected contract:

- enriched `GET /shopify/items/by-sku` results through `searchUnifiedItemsQuery`
- `findBySkuOrBarcode` ScanHistory-first lookup
- `ZONE_TYPE_DEFAULT_INTENTION`
- logistic placement with intention auto-derivation in `markLogisticPlacementCommand`

The frontend mapper was also updated to consume `currentPosition` from the enriched search response.

## Follow-Up

The implementation is complete from the plan perspective. The remaining work, if any, is normal QA and rollout validation rather than missing planned feature scope.
