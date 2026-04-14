# Floor Plan Frontend Implementation Plan

## Feature Summary

Add floor plan boundaries (real-world room size in cm) and zone physical dimensions
(widthCm / depthCm per zone block) to the existing `analytics` feature.

The user will be able to:
1. Set the store room dimensions (width × depth in cm) in the settings page.
   The Konva canvas will lock its aspect ratio to that shape so the map looks like
   the actual room.
2. Optionally enter real-world cm dimensions for each zone block — either at creation
   time or by editing an existing zone later.

Backend plan: `apps/backend/docs/under_development/FLOOR_PLAN_BACKEND_PLAN.md`

---

## Architecture Contract

This plan strictly follows `.github/copilot-instructions.md`:

```
ui/         → calls actions/ and reads selectors from stores/
actions/    → calls controllers/
controllers/ → calls api/ and domain/
flows/      → orchestrates render-linked logic across actions/ + stores/
stores/     → Zustand state; updated only by actions/flows
api/        → HTTP transport only
types/      → all TypeScript contracts
domain/     → pure helpers, no framework dependencies
```

---

## Vertical Slices (MVP first)

**Slice 1 — Types + API wiring** (no UI yet — backend can be tested independently)
- New types in `types/analytics.types.ts`
- Four new files in `api/`
- One new controller in `controllers/`
- Two new actions in `actions/`

**Slice 2 — Store + Flow**
- Floor plan state added to `floor-map.store.ts`
- `use-floor-map.flow.ts` loads floor plans, auto-selects first, resizes stage by ratio

**Slice 3 — Settings page UI**
- Floor boundaries panel in `StoreMapSettingsPage` (non-editor mode)
- Scale indicator on the Konva canvas in `StoreMapSettingsPage`
- Zone list rows show `widthCm × depthCm` when present

**Slice 4 — Zone creation dimensions step**
- New `"dimensions"` editor mode in `StoreMapSettingsPage`
- After shape is confirmed for a new (draft) zone, offer a dimensions step before saving
- "Skip" is always available — dimensions are optional

**Slice 5 — Edit dimensions for existing zones**
- Add "Edit dimensions" to the zone action menu (alongside "Edit name" / "Edit shape")
- Same `"dimensions"` editor panel, but pre-filled and saving via PATCH on existing zone

---

## Module Placement Map

```
types/
  analytics.types.ts            ← add FloorPlan type; add floorPlanId/widthCm/depthCm to StoreZone

api/
  list-floor-plans.api.ts       ← GET /floor-plans
  create-floor-plan.api.ts      ← POST /floor-plans
  update-floor-plan.api.ts      ← PATCH /floor-plans/:id
  delete-floor-plan.api.ts      ← DELETE /floor-plans/:id

controllers/
  floor-plan.controller.ts      ← boundary: api + domain → actions

actions/
  floor-plan.actions.ts         ← loadFloorPlans, saveFloorPlan, removeFloorPlan
  zone-dimensions.actions.ts    ← saveZoneDimensions

domain/
  floor-plan.domain.ts          ← pure helpers: selectActivePlan, computeStageHeight

stores/
  floor-map.store.ts            ← ADD: floorPlans, currentFloorPlan, setters

flows/
  use-floor-map.flow.ts         ← UPDATE: load floor plans, compute aspect-ratio stage height
  use-zone-editor.flow.ts       ← UPDATE: expose saveZoneDimensions

ui/
  StoreMapSettingsPage.tsx      ← UPDATE: floor panel, dimensions editor mode, scale text
```

---

## Consumption Map

```
StoreMapSettingsPage (ui/)
  → floor-plan.actions.ts (actions/)
      → floor-plan.controller.ts (controllers/)
          → list-floor-plans.api.ts / create-floor-plan.api.ts / update-floor-plan.api.ts
  → zone-dimensions.actions.ts (actions/)
      → floor-plan.controller.ts (controllers/)
          → update-zone.api.ts (existing)
  → useFloorMapStore selectors (stores/)
  → useFloorMapFlow (flows/) — for load + stage-size side effects
  → useZoneEditorFlow (flows/) — for saveZoneDimensions

useFloorMapFlow (flows/)
  → floor-plan.actions.ts → floor-plan.controller.ts → api/
  → floor-plan.domain.ts (computeStageHeight)
  → useFloorMapStore.setFloorPlans / setCurrentFloorPlan / setStageSize
```

---

## Part A — Types

**File:** `src/features/analytics/types/analytics.types.ts`

### A1 — Add `FloorPlan`

```typescript
export type FloorPlan = {
  id: string;
  name: string;
  widthCm: number;
  depthCm: number;
  sortOrder: number;
};

export type CreateFloorPlanInput = {
  name: string;
  widthCm: number;
  depthCm: number;
};

export type UpdateFloorPlanInput = Partial<CreateFloorPlanInput>;
```

### A2 — Update `StoreZone`

Add three fields. All nullable — backward compatible with zones that existed before.

```typescript
export type StoreZone = {
  id: string;
  label: string;
  type: StoreZoneType;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  sortOrder: number;
  floorPlanId: string | null;   // NEW
  widthCm: number | null;       // NEW
  depthCm: number | null;       // NEW
};
```

`CreateStoreZoneInput` is `Omit<StoreZone, "id">` — it inherits the new fields automatically.
`UpdateStoreZoneInput` is `Partial<Omit<StoreZone, "id">>` — same.

---

## Part B — API Layer (`api/`)

### B1 — `src/features/analytics/apis/list-floor-plans.api.ts`

```typescript
import { apiClient } from "../../../core/api-client";
import type { FloorPlan } from "../types/analytics.types";

export async function listFloorPlansApi(): Promise<FloorPlan[]> {
  const response = await apiClient.get<{ data: FloorPlan[] }>("/floor-plans", {
    requiresAuth: true,
  });
  return response.data;
}
```

### B2 — `src/features/analytics/apis/create-floor-plan.api.ts`

```typescript
import { apiClient } from "../../../core/api-client";
import type { CreateFloorPlanInput, FloorPlan } from "../types/analytics.types";

export async function createFloorPlanApi(
  input: CreateFloorPlanInput,
): Promise<FloorPlan> {
  const response = await apiClient.post<{ data: FloorPlan }>(
    "/floor-plans",
    input,
    { requiresAuth: true },
  );
  return response.data;
}
```

### B3 — `src/features/analytics/apis/update-floor-plan.api.ts`

```typescript
import { apiClient } from "../../../core/api-client";
import type { UpdateFloorPlanInput, FloorPlan } from "../types/analytics.types";

export async function updateFloorPlanApi(
  id: string,
  input: UpdateFloorPlanInput,
): Promise<FloorPlan> {
  const response = await apiClient.patch<{ data: FloorPlan }>(
    `/floor-plans/${id}`,
    input,
    { requiresAuth: true },
  );
  return response.data;
}
```

### B4 — `src/features/analytics/apis/delete-floor-plan.api.ts`

```typescript
import { apiClient } from "../../../core/api-client";

export async function deleteFloorPlanApi(id: string): Promise<void> {
  await apiClient.delete(`/floor-plans/${id}`, { requiresAuth: true });
}
```

---

## Part C — Domain Layer (`domain/`)

**File:** `src/features/analytics/domain/floor-plan.domain.ts`

Pure functions only — no imports from React or any API module.

```typescript
import type { FloorPlan } from "../types/analytics.types";

/**
 * Given the floor plan's real-world ratio and the canvas pixel width,
 * compute what the canvas height should be so it is true-to-scale.
 * Falls back to `fallbackHeight` when no plan is defined or dimensions are zero.
 */
export function computeStageHeight(
  plan: FloorPlan | null | undefined,
  stageWidth: number,
  fallbackHeight: number,
): number {
  if (!plan || plan.widthCm <= 0 || plan.depthCm <= 0 || stageWidth <= 0) {
    return fallbackHeight;
  }
  return Math.round(stageWidth * (plan.depthCm / plan.widthCm));
}

/**
 * Pick the first floor plan in sort order, or null.
 */
export function selectFirstFloorPlan(
  plans: FloorPlan[],
): FloorPlan | null {
  if (plans.length === 0) return null;
  return [...plans].sort((a, b) => a.sortOrder - b.sortOrder)[0];
}
```

---

## Part D — Controller Layer (`controllers/`)

**File:** `src/features/analytics/controllers/floor-plan.controller.ts`

The controller is the boundary that combines the API modules and domain helpers
into the shape that actions need. No React, no JSX, no stores here.

```typescript
import { createFloorPlanApi } from "../apis/create-floor-plan.api";
import { deleteFloorPlanApi } from "../apis/delete-floor-plan.api";
import { listFloorPlansApi } from "../apis/list-floor-plans.api";
import { updateFloorPlanApi } from "../apis/update-floor-plan.api";
import { updateZoneApi } from "../apis/update-zone.api";
import { selectFirstFloorPlan } from "../domain/floor-plan.domain";
import type {
  CreateFloorPlanInput,
  FloorPlan,
  UpdateFloorPlanInput,
} from "../types/analytics.types";

export type LoadFloorPlansResult = {
  plans: FloorPlan[];
  active: FloorPlan | null;
};

export async function loadFloorPlansController(): Promise<LoadFloorPlansResult> {
  const plans = await listFloorPlansApi();
  return {
    plans,
    active: selectFirstFloorPlan(plans),
  };
}

export async function createFloorPlanController(
  input: CreateFloorPlanInput,
): Promise<FloorPlan> {
  return createFloorPlanApi(input);
}

export async function updateFloorPlanController(
  id: string,
  input: UpdateFloorPlanInput,
): Promise<FloorPlan> {
  return updateFloorPlanApi(id, input);
}

export async function deleteFloorPlanController(id: string): Promise<void> {
  return deleteFloorPlanApi(id);
}

export async function saveZoneDimensionsController(
  zoneId: string,
  widthCm: number | null,
  depthCm: number | null,
): Promise<void> {
  await updateZoneApi(zoneId, { widthCm, depthCm });
}
```

---

## Part E — Actions Layer (`actions/`)

Actions are the callable interface for UI and flows. They hold no local state.
They call the controller and commit results to the store.

### E1 — `src/features/analytics/actions/floor-plan.actions.ts`

```typescript
import {
  createFloorPlanController,
  deleteFloorPlanController,
  loadFloorPlansController,
  updateFloorPlanController,
} from "../controllers/floor-plan.controller";
import { useFloorMapStore } from "../stores/floor-map.store";
import type {
  CreateFloorPlanInput,
  UpdateFloorPlanInput,
} from "../types/analytics.types";

export async function loadFloorPlansAction(): Promise<void> {
  const result = await loadFloorPlansController();
  const { setFloorPlans, setCurrentFloorPlan, currentFloorPlan } =
    useFloorMapStore.getState();
  setFloorPlans(result.plans);
  // Only auto-select if nothing is active yet
  if (!currentFloorPlan && result.active) {
    setCurrentFloorPlan(result.active);
  }
}

export async function saveFloorPlanAction(
  input: CreateFloorPlanInput,
  existingId?: string,
): Promise<void> {
  const { upsertFloorPlan, setCurrentFloorPlan } = useFloorMapStore.getState();
  const plan = existingId
    ? await updateFloorPlanController(existingId, input as UpdateFloorPlanInput)
    : await createFloorPlanController(input);
  upsertFloorPlan(plan);
  setCurrentFloorPlan(plan);
}

export async function removeFloorPlanAction(id: string): Promise<void> {
  await deleteFloorPlanController(id);
  useFloorMapStore.getState().removeFloorPlan(id);
}
```

### E2 — `src/features/analytics/actions/zone-dimensions.actions.ts`

```typescript
import { saveZoneDimensionsController } from "../controllers/floor-plan.controller";
import { useFloorMapStore } from "../stores/floor-map.store";

export async function saveZoneDimensionsAction(
  zoneId: string,
  widthCm: number | null,
  depthCm: number | null,
): Promise<void> {
  await saveZoneDimensionsController(zoneId, widthCm, depthCm);
  const { zones, upsertZone } = useFloorMapStore.getState();
  const zone = zones.find((z) => z.id === zoneId);
  if (zone) {
    upsertZone({ ...zone, widthCm, depthCm });
  }
}
```

---

## Part F — Store (`stores/`)

**File:** `src/features/analytics/stores/floor-map.store.ts`

This file already exists. Add the floor plan fields to the existing store.

### F1 — Add to the `FloorMapStoreState` interface

```typescript
// ADD these fields:
floorPlans: FloorPlan[];
currentFloorPlan: FloorPlan | null;
setFloorPlans: (plans: FloorPlan[]) => void;
setCurrentFloorPlan: (plan: FloorPlan | null) => void;
upsertFloorPlan: (plan: FloorPlan) => void;
removeFloorPlan: (id: string) => void;
```

Import `FloorPlan` from `"../types/analytics.types"`.

### F2 — Add to `initialState`

```typescript
floorPlans: [],
currentFloorPlan: null,
```

### F3 — Add to the store body (inside the `create` callback)

```typescript
setFloorPlans: (floorPlans) => set({ floorPlans }),
setCurrentFloorPlan: (currentFloorPlan) => set({ currentFloorPlan }),
upsertFloorPlan: (plan) =>
  set((state) => ({
    floorPlans: state.floorPlans.some((p) => p.id === plan.id)
      ? state.floorPlans.map((p) => (p.id === plan.id ? plan : p))
      : [...state.floorPlans, plan],
  })),
removeFloorPlan: (id) =>
  set((state) => ({
    floorPlans: state.floorPlans.filter((p) => p.id !== id),
    currentFloorPlan:
      state.currentFloorPlan?.id === id ? null : state.currentFloorPlan,
  })),
```

### F4 — Add selectors at the bottom of the file

```typescript
export const selectCurrentFloorPlan = (state: FloorMapStoreState) =>
  state.currentFloorPlan;
export const selectFloorPlans = (state: FloorMapStoreState) =>
  state.floorPlans;
```

---

## Part G — Flow Updates (`flows/`)

### G1 — Update `use-floor-map.flow.ts`

**Full replacement of the existing file:**

```typescript
import { useEffect, type RefObject } from "react";

import { loadFloorPlansAction } from "../actions/floor-plan.actions";
import { listZonesApi } from "../apis/list-zones.api";
import { computeStageHeight } from "../domain/floor-plan.domain";
import {
  selectCurrentFloorPlan,
  useFloorMapStore,
} from "../stores/floor-map.store";

export function useFloorMapFlow(
  containerRef: RefObject<HTMLDivElement | null>,
  resizeKey?: unknown,
) {
  const store = useFloorMapStore();
  const setZones = useFloorMapStore((state) => state.setZones);
  const setStageSize = useFloorMapStore((state) => state.setStageSize);
  const currentFloorPlan = useFloorMapStore(selectCurrentFloorPlan);

  // Load zones and floor plans once on mount
  useEffect(() => {
    let isDisposed = false;

    const load = async () => {
      const [zones] = await Promise.all([
        listZonesApi(),
        loadFloorPlansAction(),   // commits to store internally
      ]);

      if (!isDisposed) {
        setZones(zones);
      }
    };

    void load();
    return () => {
      isDisposed = true;
    };
  }, [setZones]);

  // Recompute stage size when container resizes OR floor plan changes
  useEffect(() => {
    const resizeStage = () => {
      const container = containerRef.current;
      const nextWidth = container?.offsetWidth;
      if (!nextWidth) return;

      // Use floor plan ratio when available; otherwise 0.6 aspect ratio fallback
      const fallbackHeight = Math.max(
        nextWidth * 0.6,
        container?.offsetHeight ?? 0,
      );
      const nextHeight = computeStageHeight(
        currentFloorPlan,
        nextWidth,
        fallbackHeight,
      );

      setStageSize(nextWidth, nextHeight);
    };

    resizeStage();
    window.addEventListener("resize", resizeStage);
    return () => window.removeEventListener("resize", resizeStage);
  }, [containerRef, resizeKey, setStageSize, currentFloorPlan]);

  return store;
}
```

### G2 — Update `use-zone-editor.flow.ts`

Add `saveZoneDimensions` to the returned object. Do not change anything else.

In the existing `useZoneEditorFlow` function body, add:

```typescript
import { saveZoneDimensionsAction } from "../actions/zone-dimensions.actions";

// Inside the hook body, after the existing callbacks:
const saveZoneDimensions = useCallback(
  async (zoneId: string, widthCm: number | null, depthCm: number | null) => {
    await saveZoneDimensionsAction(zoneId, widthCm, depthCm);
  },
  [],
);

// Add to the return object:
return {
  draftZonePx,
  beginDraftZone,
  updateDraftZone,
  commitDraftZone,
  renameZone,
  saveZoneLabel,
  saveZoneShape,
  createZone,
  moveZone,
  removeZoneById,
  normalizeSortOrder,
  saveZoneDimensions,   // NEW
};
```

Also update the `createZone` call inside `commitDraftZone` to include `floorPlanId`:

```typescript
const currentFloorPlan = useFloorMapStore.getState().currentFloorPlan;

const payload: CreateStoreZoneInput = {
  label: label.trim(),
  type,
  xPct: pxToPct(draft.x, stageWidth),
  yPct: pxToPct(draft.y, stageHeight),
  widthPct: pxToPct(draft.width, stageWidth),
  heightPct: pxToPct(draft.height, stageHeight),
  sortOrder: zones.length,
  floorPlanId: currentFloorPlan?.id ?? null,  // NEW
  widthCm: null,                               // NEW (set later in dimensions step)
  depthCm: null,                               // NEW
};
```

---

## Part H — UI Changes (`ui/StoreMapSettingsPage.tsx`)

This is the most involved part. The file already handles four editor modes:
`null → "rename" → "shape" → null`. Extend with:
- A new `"dimensions"` mode (optional step for new zones; editable for existing)
- A floor boundaries panel in the non-editor view
- A scale text overlay on the Konva canvas
- `widthCm × depthCm` shown on each zone row in the zone list

### H1 — Extend `activeZoneEditorMode` type

Change the type annotation from:
```typescript
const [activeZoneEditorMode, setActiveZoneEditorMode] = useState<
  "menu" | "rename" | "shape" | null
>(null);
```
to:
```typescript
const [activeZoneEditorMode, setActiveZoneEditorMode] = useState<
  "menu" | "rename" | "shape" | "dimensions" | null
>(null);
```

### H2 — Destructure `saveZoneDimensions` from the editor flow

```typescript
const {
  moveZone,
  normalizeSortOrder,
  removeZoneById,
  renameZone,
  saveZoneLabel,
  saveZoneShape,
  createZone,
  saveZoneDimensions,   // ADD
} = useZoneEditorFlow(interactiveViewportTransform);
```

### H3 — Add local dimension draft state

```typescript
const [dimensionsDraft, setDimensionsDraft] = useState<{
  widthCm: string;
  depthCm: string;
}>({ widthCm: "", depthCm: "" });
```

Reset it when `selectedZone` changes (add to the existing effect at line ~126):

```typescript
useEffect(() => {
  setLabelDraft(selectedZone?.label ?? "");
  setActiveZoneEditorMode((current) =>
    selectedZone ? (current ?? "menu") : null,
  );
  setShapeDraft(selectedZone ? { ...selectedZone } : null);
  setDimensionsDraft({               // ADD
    widthCm: selectedZone?.widthCm?.toString() ?? "",
    depthCm: selectedZone?.depthCm?.toString() ?? "",
  });
}, [selectedZone]);
```

### H4 — In the `beginCreateZone` draft, include new fields

```typescript
const draftZone: StoreZone = {
  id: "__draft-zone__",
  label: "",
  type: "zone",
  xPct: Math.min(centerXPct, 100 - defaultWidthPct),
  yPct: Math.min(centerYPct, 100 - defaultHeightPct),
  widthPct: defaultWidthPct,
  heightPct: defaultHeightPct,
  sortOrder: zones.length,
  floorPlanId: currentFloorPlan?.id ?? null,   // ADD
  widthCm: null,                                // ADD
  depthCm: null,                                // ADD
};
```

Read `currentFloorPlan` from the store at the top of `StoreMapSettingsPage`:
```typescript
const currentFloorPlan = useFloorMapStore(selectCurrentFloorPlan);
```

### H5 — After shape is confirmed for a DRAFT zone, go to "dimensions" instead of createZone

Find the `onClick` inside the `shape` panel's confirm button for the `isDraftZone` branch (around line 530):

```typescript
// CURRENT:
if (isDraftZone) {
  await createZone({
    label: shapeDraft.label.trim() || "Zone",
    type: shapeDraft.type,
    xPct: shapeDraft.xPct,
    yPct: shapeDraft.yPct,
    widthPct: shapeDraft.widthPct,
    heightPct: shapeDraft.heightPct,
    sortOrder: zones.length,
  });
  resetShapeEditHistory();
  setShapeDraft(null);
  setSelectedZone(null);
  setActiveZoneEditorMode(null);
  return;
}

// REPLACE WITH:
if (isDraftZone) {
  // Move to dimensions step; createZone will be called from there
  resetShapeEditHistory();
  setActiveZoneEditorMode("dimensions");
  return;
}
```

### H6 — Add the "dimensions" editor panel (fullscreen editor overlay)

Add this block after the `shape` panel block (after line 565, before the `menu` panel):

```tsx
{selectedZone && activeZoneEditorMode === "dimensions" ? (
  <div className="pointer-events-none absolute inset-x-0 top-0 z-30 p-4 pt-16">
    <div className="pointer-events-auto relative mx-auto max-w-[360px]">
      <button
        type="button"
        className="absolute -right-2 -top-2 z-10 grid h-10 w-10 -translate-y-1/3 place-items-center rounded-full border border-white/15 bg-slate-950/92 text-lg font-bold text-white shadow-[0_16px_36px_rgba(15,23,42,0.28)] backdrop-blur-md"
        onClick={() => {
          if (isDraftZone) {
            // Go back to shape editing
            setShapeDraft(selectedZone);
            setActiveZoneEditorMode("shape");
            return;
          }
          setActiveZoneEditorMode(null);
          setSelectedZone(null);
        }}
        aria-label="Cancel dimensions editing"
      >
        <CloseIcon className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="rounded-2xl border border-white/15 bg-slate-950/88 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.32)] backdrop-blur-md">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">
          Physical size (optional)
        </p>
        <p className="m-0 mt-1 text-xs text-slate-400">
          Enter real-world measurements in centimetres.
        </p>

        <div className="mt-3 flex gap-3">
          <label className="flex-1 text-xs text-slate-300">
            Width (cm)
            <input
              type="number"
              inputMode="decimal"
              min={1}
              value={dimensionsDraft.widthCm}
              onChange={(e) =>
                setDimensionsDraft((d) => ({ ...d, widthCm: e.target.value }))
              }
              placeholder="e.g. 240"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/95 px-3 py-2 text-sm text-slate-900 outline-none"
            />
          </label>
          <label className="flex-1 text-xs text-slate-300">
            Depth (cm)
            <input
              type="number"
              inputMode="decimal"
              min={1}
              value={dimensionsDraft.depthCm}
              onChange={(e) =>
                setDimensionsDraft((d) => ({ ...d, depthCm: e.target.value }))
              }
              placeholder="e.g. 60"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/95 px-3 py-2 text-sm text-slate-900 outline-none"
            />
          </label>
        </div>

        <div className="mt-3 flex gap-2">
          {/* Skip — save zone without dimensions */}
          <button
            type="button"
            className="flex-1 rounded-xl border border-white/15 bg-white/10 py-2.5 text-sm font-semibold text-white"
            onClick={async () => {
              if (!selectedZone || !shapeDraft) return;
              if (isDraftZone) {
                await createZone({
                  label: shapeDraft.label.trim() || "Zone",
                  type: shapeDraft.type,
                  xPct: shapeDraft.xPct,
                  yPct: shapeDraft.yPct,
                  widthPct: shapeDraft.widthPct,
                  heightPct: shapeDraft.heightPct,
                  sortOrder: zones.length,
                  floorPlanId: currentFloorPlan?.id ?? null,
                  widthCm: null,
                  depthCm: null,
                });
              }
              setShapeDraft(null);
              setSelectedZone(null);
              setActiveZoneEditorMode(null);
            }}
          >
            Skip
          </button>

          {/* Save with dimensions */}
          <button
            type="button"
            className="flex-1 rounded-xl bg-sky-500 py-2.5 text-sm font-semibold text-white"
            onClick={async () => {
              if (!selectedZone || !shapeDraft) return;
              const widthCm = dimensionsDraft.widthCm
                ? Number(dimensionsDraft.widthCm)
                : null;
              const depthCm = dimensionsDraft.depthCm
                ? Number(dimensionsDraft.depthCm)
                : null;

              if (isDraftZone) {
                const created = await createZone({
                  label: shapeDraft.label.trim() || "Zone",
                  type: shapeDraft.type,
                  xPct: shapeDraft.xPct,
                  yPct: shapeDraft.yPct,
                  widthPct: shapeDraft.widthPct,
                  heightPct: shapeDraft.heightPct,
                  sortOrder: zones.length,
                  floorPlanId: currentFloorPlan?.id ?? null,
                  widthCm,
                  depthCm,
                });
                // createZone already upserts — no extra save needed
                void created;
              } else {
                await saveZoneDimensions(selectedZone.id, widthCm, depthCm);
              }

              setShapeDraft(null);
              setSelectedZone(null);
              setActiveZoneEditorMode(null);
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  </div>
) : null}
```

### H7 — Add "Edit dimensions" to the zone action menu

Find the actions array inside `activeZoneEditorMode === "menu"` (around line 597).
Add a new entry after "Edit shape":

```typescript
{
  id: "edit-dimensions",
  label: selectedZone.widthCm
    ? `Dimensions: ${selectedZone.widthCm} × ${selectedZone.depthCm ?? "?"} cm`
    : "Set physical dimensions",
  onClick: () => {
    setDimensionsDraft({
      widthCm: selectedZone.widthCm?.toString() ?? "",
      depthCm: selectedZone.depthCm?.toString() ?? "",
    });
    setActiveZoneEditorMode("dimensions");
  },
  disabled: false,
},
```

### H8 — Scale indicator on the canvas

Inside `MapEditorStage`, after all zones are rendered, add a `Text` overlay. This
requires passing `currentFloorPlan` as a prop.

First, update the `MapEditorStageProps` interface:

```typescript
currentFloorPlan?: import("../types/analytics.types").FloorPlan | null;
```

Pass it where `MapEditorStage` is used:

```tsx
<MapEditorStage
  ...
  currentFloorPlan={currentFloorPlan}
/>
```

Inside `MapEditorStage`, after the closing `</Group>` and before `</Layer>`:

```tsx
{currentFloorPlan ? (
  <Text
    x={10}
    y={stageHeight - 20}
    text={`${currentFloorPlan.widthCm} cm × ${currentFloorPlan.depthCm} cm`}
    fontSize={10}
    fill="#64748b"
    listening={false}
  />
) : null}
```

### H9 — Floor boundaries panel (non-editor settings view)

Add a new `FloorBoundariesPanel` component at the bottom of `StoreMapSettingsPage.tsx`
(alongside `EditableZone`, `ShapeHandles`, etc.).

```tsx
import { useState } from "react";
import { saveFloorPlanAction } from "../actions/floor-plan.actions";
import type { FloorPlan } from "../types/analytics.types";

interface FloorBoundariesPanelProps {
  currentFloorPlan: FloorPlan | null;
}

function FloorBoundariesPanel({ currentFloorPlan }: FloorBoundariesPanelProps) {
  const [isEditing, setIsEditing] = useState(!currentFloorPlan);
  const [nameDraft, setNameDraft] = useState(
    currentFloorPlan?.name ?? "Ground Floor",
  );
  const [widthDraft, setWidthDraft] = useState(
    currentFloorPlan?.widthCm?.toString() ?? "",
  );
  const [depthDraft, setDepthDraft] = useState(
    currentFloorPlan?.depthCm?.toString() ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const w = Number(widthDraft);
    const d = Number(depthDraft);
    if (!w || w <= 0 || !d || d <= 0) {
      setError("Width and depth must be greater than 0.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveFloorPlanAction(
        { name: nameDraft.trim() || "Ground Floor", widthCm: w, depthCm: d },
        currentFloorPlan?.id,
      );
      setIsEditing(false);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-900/10 bg-white/90 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.08)]">
      <div className="mb-3 flex items-center justify-between">
        <p className="m-0 text-sm font-semibold text-slate-900">
          Floor boundaries
        </p>
        {currentFloorPlan && !isEditing ? (
          <button
            type="button"
            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
            onClick={() => setIsEditing(true)}
          >
            Edit
          </button>
        ) : null}
      </div>

      {!isEditing && currentFloorPlan ? (
        <div className="flex flex-col gap-1">
          <p className="m-0 text-sm font-medium text-slate-700">
            {currentFloorPlan.name}
          </p>
          <p className="m-0 text-xs text-slate-500">
            {currentFloorPlan.widthCm} cm wide ×{" "}
            {currentFloorPlan.depthCm} cm deep
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {!currentFloorPlan ? (
            <p className="m-0 text-sm text-slate-500">
              Set the real-world size of your store floor. The map canvas will
              match these proportions so it looks like your actual room.
            </p>
          ) : null}

          <label className="text-xs font-medium text-slate-700">
            Floor name
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Ground Floor"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400"
            />
          </label>

          <div className="flex gap-3">
            <label className="flex-1 text-xs font-medium text-slate-700">
              Width (cm)
              <input
                type="number"
                inputMode="decimal"
                min={1}
                value={widthDraft}
                onChange={(e) => setWidthDraft(e.target.value)}
                placeholder="e.g. 1200"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400"
              />
            </label>
            <label className="flex-1 text-xs font-medium text-slate-700">
              Depth (cm)
              <input
                type="number"
                inputMode="decimal"
                min={1}
                value={depthDraft}
                onChange={(e) => setDepthDraft(e.target.value)}
                placeholder="e.g. 800"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-400"
              />
            </label>
          </div>

          {error ? (
            <p className="m-0 text-xs text-rose-600">{error}</p>
          ) : null}

          <div className="flex gap-2">
            {currentFloorPlan ? (
              <button
                type="button"
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
            ) : null}
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="flex-1 rounded-xl bg-sky-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save floor dimensions"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### H10 — Place `FloorBoundariesPanel` in the settings page body

In the non-editor JSX, add it between the preview map and the zone list:

```tsx
{/* Floor boundaries */}
<FloorBoundariesPanel currentFloorPlan={currentFloorPlan} />

{/* Zone list */}
<div className="rounded-2xl border ...">
  ...
</div>
```

### H11 — Show dimensions in the zone list rows

In the zone list `map`, update the sub-line under the zone label:

```tsx
<p className="m-0 mt-1 text-xs text-slate-500">
  {zone.type} · {zone.xPct.toFixed(1)}%, {zone.yPct.toFixed(1)}%
  {zone.widthCm ? ` · ${zone.widthCm} × ${zone.depthCm ?? "?"} cm` : ""}
</p>
```

---

## Part I — `createZone` return value

The existing `createZone` in `use-zone-editor.flow.ts` already returns the created
zone. However the flow's `commitDraftZone` path currently ignores that return value.
The `createZone` action must now accept the full `CreateStoreZoneInput` including
`floorPlanId`, `widthCm`, `depthCm`. Confirm the `createZoneApi` payload in
`src/features/analytics/apis/create-zone.api.ts` passes the full body — no
filtering should strip the new optional fields.

---

## Data / State Lifecycle

```
mount
  useFloorMapFlow loads zones + floor plans in parallel
  → setZones(zones)
  → setFloorPlans(plans) + setCurrentFloorPlan(plans[0])
  → useEffect [currentFloorPlan] triggers resizeStage
  → setStageSize(width, computeStageHeight(plan, width, fallback))

user taps "Set floor dimensions" / "Edit"
  → FloorBoundariesPanel local form state
  → saveFloorPlanAction(input, existingId?)
      → updateFloorPlanController / createFloorPlanController
      → upsertFloorPlan(plan) + setCurrentFloorPlan(plan)
  → [currentFloorPlan] dep triggers resizeStage → canvas re-sizes

user creates zone (rename → shape → ✓ → dimensions → Save)
  → createZone({ ...shape, floorPlanId, widthCm, depthCm })
      → createZoneApi → upsertZone(zone)
  → panel closes

user edits existing zone dimensions
  → menu → "Set physical dimensions"
  → activeZoneEditorMode = "dimensions"
  → user enters values → Save
  → saveZoneDimensions(id, widthCm, depthCm)
      → saveZoneDimensionsAction → PATCH /zones/:id
      → upsertZone({ ...zone, widthCm, depthCm })
```

---

## UX States Required

| Surface | Loading | Empty | Error | Success |
|---------|---------|-------|-------|---------|
| Floor boundaries panel | — | "Set real-world size" prompt | Inline error message | Shows name + dimensions |
| Dimensions editor (zone) | `saving` disables button | — | — | Panel closes |
| Zone list row | — | No zones message (existing) | — | Shows `widthCm × depthCm` inline |

---

## Checklist

### Part A — Types
- [ ] A1 — Add `FloorPlan`, `CreateFloorPlanInput`, `UpdateFloorPlanInput` to `analytics.types.ts`
- [ ] A2 — Add `floorPlanId`, `widthCm`, `depthCm` to `StoreZone`

### Part B — API
- [ ] B1 — `list-floor-plans.api.ts`
- [ ] B2 — `create-floor-plan.api.ts`
- [ ] B3 — `update-floor-plan.api.ts`
- [ ] B4 — `delete-floor-plan.api.ts`

### Part C — Domain
- [ ] C — `domain/floor-plan.domain.ts` with `computeStageHeight` and `selectFirstFloorPlan`

### Part D — Controller
- [ ] D — `controllers/floor-plan.controller.ts`

### Part E — Actions
- [ ] E1 — `actions/floor-plan.actions.ts`
- [ ] E2 — `actions/zone-dimensions.actions.ts`

### Part F — Store
- [ ] F1 — Add floor plan fields to `FloorMapStoreState` interface
- [ ] F2 — Add to `initialState`
- [ ] F3 — Add setters to store body
- [ ] F4 — Add `selectCurrentFloorPlan`, `selectFloorPlans` selectors

### Part G — Flows
- [ ] G1 — Replace `use-floor-map.flow.ts` with version that loads floor plans + uses `computeStageHeight`
- [ ] G2 — Add `saveZoneDimensions` to `use-zone-editor.flow.ts`; pass `floorPlanId` in `commitDraftZone`

### Part H — UI (StoreMapSettingsPage.tsx)
- [ ] H1 — Extend `activeZoneEditorMode` type to include `"dimensions"`
- [ ] H2 — Destructure `saveZoneDimensions` from editor flow
- [ ] H3 — Add `dimensionsDraft` local state; reset on `selectedZone` change
- [ ] H4 — Add `floorPlanId`, `widthCm: null`, `depthCm: null` to `beginCreateZone` draft
- [ ] H5 — After shape confirm for draft zone, go to `"dimensions"` instead of calling `createZone`
- [ ] H6 — Add `"dimensions"` editor panel overlay (with Skip + Save buttons)
- [ ] H7 — Add "Edit dimensions" / "Set physical dimensions" to zone action menu
- [ ] H8 — Add `currentFloorPlan` prop to `MapEditorStage`; render scale `Text` overlay
- [ ] H9 — Add `FloorBoundariesPanel` component at bottom of file
- [ ] H10 — Place `FloorBoundariesPanel` in settings page body between preview and zone list
- [ ] H11 — Show `widthCm × depthCm` in zone list rows when present

### Part I — Verify
- [ ] I — Confirm `create-zone.api.ts` passes full body (no field stripping)
