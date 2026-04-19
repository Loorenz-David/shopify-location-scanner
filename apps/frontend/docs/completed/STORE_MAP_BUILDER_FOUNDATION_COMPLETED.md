# Store Map Builder — Foundation Completed

## Overview

This slice establishes the floor-plan foundation for the new store map builder.
The editor is still mid-migration, but the codebase now supports floor plans as
first-class contracts instead of treating the map as a single flat zone canvas.

The goal of this slice was to land the domain, API, store, and flow contracts
before pushing the heavier Konva editor refactor.

---

## What Was Implemented

### 1. Floor plan contracts

Added floor plan types to
[analytics.types.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend/src/features/analytics/types/analytics.types.ts):

- `FloorPlanVertex`
- `FloorPlan`
- `CreateFloorPlanInput`
- `UpdateFloorPlanInput`

`StoreZone` was also extended with:

- `floorPlanId`
- `widthCm`
- `depthCm`

This keeps the backend contract explicit and allows zones to belong to a floor
while still storing canvas geometry as percentages.

### 2. Floor plan API layer

Added new API clients under `src/features/analytics/apis/`:

- `list-floor-plans.api.ts`
- `create-floor-plan.api.ts`
- `update-floor-plan.api.ts`
- `delete-floor-plan.api.ts`
- `get-floor-plan.api.ts`

Also updated [list-zones.api.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend/src/features/analytics/apis/list-zones.api.ts)
to support `floorPlanId`.

### 3. Floor plan store

Added
[floor-plan.store.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend/src/features/analytics/stores/floor-plan.store.ts)
with:

- `floorPlans`
- `selectedFloorPlanId`
- `setFloorPlans`
- `upsertFloorPlan`
- `removeFloorPlan`
- `setSelectedFloorPlanId`

This is the source of truth for active floor selection.

### 4. Floor-aware flows

Added:

- [use-floor-plans.flow.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend/src/features/analytics/flows/use-floor-plans.flow.ts)
- [use-floor-boundary-editor.flow.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend/src/features/analytics/flows/use-floor-boundary-editor.flow.ts)
- [use-zone-label-suggestions.flow.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend/src/features/analytics/flows/use-zone-label-suggestions.flow.ts)

Updated
[use-floor-map.flow.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend/src/features/analytics/flows/use-floor-map.flow.ts)
so zones can be fetched for the selected floor without breaking the analytics
preview map flow.

Updated
[use-zone-editor.flow.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend/src/features/analytics/flows/use-zone-editor.flow.ts)
so created/saved zones propagate `floorPlanId`, `widthCm`, and `depthCm`.

### 5. Utility layer

Added:

- [cm-format.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend/src/features/analytics/utils/cm-format.ts)
- [grid-utils.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend/src/features/analytics/utils/grid-utils.ts)

These utilities support real-world measurement display and the upcoming
zoom-aware grid/boundary editor work.

### 6. First `StoreMapSettingsPage` migration slice

Updated
[StoreMapSettingsPage.tsx](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend/src/features/analytics/ui/StoreMapSettingsPage.tsx)
with:

- floor selector row
- create-floor modal
- empty state when no floors exist
- zone rename autocomplete suggestions
- cm/metre display in shape metrics when a floor is active
- physical size rendering in the zone list

This gives the page a floor-aware shell before the full editor mode refactor.

---

## Architectural Notes

This slice follows the frontend contracts under `.github`:

- `types/` owns public contracts
- `apis/` owns backend transport
- `stores/` own feature state
- `flows/` own orchestration
- `ui/` consumes prepared state and handlers

The existing `StoreMapSettingsPage` still contains legacy editor workflow logic,
so the page is not yet fully aligned with the target separation. That refactor is
the next phase.

---

## Remaining Work

The remaining plan still includes:

- zoom-aware Konva grid layer
- floor boundary rendering in preview and editor
- dedicated floor-boundary edit sub-mode with handles
- grid snapping for zone shape editing and boundary editing
- stronger floor-aware fullscreen editor UX
- additional cleanup to reduce workflow logic inside `ui/`

---

## Verification

`npm run build` passed after the foundation slice landed.
