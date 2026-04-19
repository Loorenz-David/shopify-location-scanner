# Store Map Builder — Frontend Implementation Plan

## Overview

This plan transforms `StoreMapSettingsPage` into a professional, multi-floor map builder.
The editor remains Konva-based. No statistics are affected — all floor plan and zone
dimension data is purely visual metadata.

**Five core additions:**

1. **Floor plan management** — Create / select floors. Each floor has `widthCm × depthCm`
   (real-world coordinate space) and an optional `shape` polygon for non-rectangular floors
   (rectangle only in this phase).
2. **Figma-style grid** — Always-on grid overlay in editor mode. The existing pinch-to-zoom
   viewport drives grid scale. Grid density auto-adapts as you zoom. Shapes snap to grid
   intersections.
3. **Floor boundary drawing** — A dedicated sub-mode to draw / resize the floor boundary
   rectangle. Stored in `FloorPlan.shape` as polygon vertices. Rendered faded on the preview.
4. **Real-world cm display** — Zone shape panel X / Y / W / H converted from percentage to cm
   using the floor plan's `widthCm` / `depthCm`. Values ≥ 100 cm shown as metres (`1.2m`).
5. **Zone label autocomplete** — When naming a zone, a filtered suggestion list appears below
   the input, combining Shopify metafield location options and existing map zone labels.

---

## Key Concepts

### Coordinate System

The Konva canvas has a fixed pixel size (`stageWidth × stageHeight`). Zones continue to be
stored as percentage coordinates — **no schema migration**.

The active floor plan provides the real-world scale:

```
1 % of width  = floorWidthCm / 100 cm
1 % of height = floorDepthCm / 100 cm

worldPxPerCmX = stageWidth  / floorWidthCm
worldPxPerCmY = stageHeight / floorDepthCm
```

Zone `widthCm` / `depthCm` are **derived on save** (not entered manually):

```
widthCm = Math.round((widthPct / 100) * floorWidthCm)
depthCm = Math.round((heightPct / 100) * floorDepthCm)
```

The floor boundary (`FloorPlan.shape`) is stored as absolute cm vertices. To render on the
canvas: `xPx = vertex.xCm * worldPxPerCmX`.

### Grid / Zoom System

The existing `interactiveViewportTransform` (`scale`, `offsetX`, `offsetY`) from pinch-to-zoom
drives the grid — exactly as in Figma. As the user zooms in or out:

- `computeGridSpacingCm(scale, stageWidth, floorWidthCm)` picks the nearest "nice" grid step
  (in cm) such that the on-screen pixel spacing between lines stays ~80 px.
- Grid lines are drawn as Konva `Line` elements inside the same viewport `Group` as zones
  (so they pan/zoom together).
- Stroke width is `1 / scale` — lines remain visually 1 px at every zoom level.
- A React overlay `<div>` (not Konva) shows the legend: `■ 2.5m`.

Nice cm grid steps: `[5, 10, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000]`

### Grid Snapping

When a zone handle or floor boundary handle drag ends, snap to the nearest grid intersection
before converting to percentages:

```
gridStepPxX = gridSpacingCm × worldPxPerCmX
snappedX    = Math.round(worldX / gridStepPxX) × gridStepPxX
```

`snapToGridPx(worldPx, gridStepPx)` is the shared utility.

### Floor Boundary

The boundary is the visual outline of the floor. It lives in `FloorPlan.shape` as 4 cm
vertices (rectangle Phase 1). Vertex order: NW → NE → SE → SW.

When the user enters "Edit floor boundary" sub-mode with no existing shape, the draft
defaults to the full floor: `[{0,0}, {widthCm,0}, {widthCm,depthCm}, {0,depthCm}]`.

The boundary is rendered:
- **Preview (non-editor):** faded dashed outline, `opacity=0.2`.
- **Editor, normal mode:** subtle stroke, `opacity=0.4`, no handles, non-interactive.
- **Editor, floor-boundary sub-mode:** bright stroke, 4 corner handles (snap to grid),
  info panel showing W × H in metres.

---

## User Flow

```
Settings page loads
  → useFloorPlansFlow fetches floor plans
  → if none: empty state with "Create your first floor" CTA
  → if some: first floor auto-selected, zones fetched for that floor

User taps [+] (floor create button)
  → modal: name / width m / depth m
  → optimistic create → new floor auto-selected

User taps floor selector
  → setSelectedFloorPlanId → zones re-fetched for new floor

User taps [Edit]
  → enters fullscreen editor for the selected floor
  → grid layer appears
  → floor boundary renders (if shape exists)

User taps [+] FAB (in editor)
  → two sub-options fan out:
      ① Zone block   → beginCreateZone (existing flow)
      ② Floor boundary → beginBoundaryEdit, editor sub-mode "floor-boundary"

In "floor-boundary" sub-mode:
  → zones non-interactive
  → boundary handles active (drag to resize, snap to grid)
  → info panel: W × H in metres, [×] cancel, [✓] save
  → [✓] → PATCH /api/floor-plans/:id { shape: [...] }
  → exits sub-mode, back to normal editor

In zone "rename" sub-mode:
  → typing shows autocomplete suggestions below the input
  → tap suggestion → fills input

In zone "shape" sub-mode:
  → X/Y/W/H displayed in cm (not %)
  → handle drags snap to grid

User taps [Done]
  → exits editor (if boundary sub-mode active with unsaved changes: confirm discard)
```

---

## Part A — Type & Domain Updates

### A1 — `src/features/analytics/types/analytics.types.ts`

Add new floor plan types:

```typescript
export type FloorPlanVertex = {
  xCm: number;
  yCm: number;
};

export type FloorPlan = {
  id: string;
  shopId: string;
  name: string;
  widthCm: number;   // floor bounding box — the coordinate space
  depthCm: number;
  shape: FloorPlanVertex[] | null; // null = plain rectangle; 4 vertices for rectangle phase 1
  sortOrder: number;
};

export type CreateFloorPlanInput = {
  name: string;
  widthCm: number;
  depthCm: number;
  shape?: FloorPlanVertex[] | null;
  sortOrder?: number;
};

export type UpdateFloorPlanInput = Partial<CreateFloorPlanInput>;
```

### A2 — Update `StoreZone` type

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
  floorPlanId: string | null;  // ADD — which floor this zone belongs to
  widthCm: number | null;      // ADD — physical width of the shelf, derived from shape on save
  depthCm: number | null;      // ADD — physical depth of the shelf, derived from shape on save
};
```

Update `CreateStoreZoneInput` and `UpdateStoreZoneInput`:

```typescript
export type CreateStoreZoneInput = Omit<StoreZone, "id">;

export type UpdateStoreZoneInput = Partial<Omit<StoreZone, "id">>;
```

---

## Part B — New APIs

All files in `src/features/analytics/apis/`.

### B1 — `list-floor-plans.api.ts`

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

### B2 — `create-floor-plan.api.ts`

```typescript
import { apiClient } from "../../../core/api-client";
import type { CreateFloorPlanInput, FloorPlan } from "../types/analytics.types";

export async function createFloorPlanApi(input: CreateFloorPlanInput): Promise<FloorPlan> {
  const response = await apiClient.post<{ data: FloorPlan }, CreateFloorPlanInput>(
    "/floor-plans",
    input,
    { requiresAuth: true },
  );
  return response.data;
}
```

### B3 — `update-floor-plan.api.ts`

```typescript
import { apiClient } from "../../../core/api-client";
import type { FloorPlan, UpdateFloorPlanInput } from "../types/analytics.types";

export async function updateFloorPlanApi(
  id: string,
  input: UpdateFloorPlanInput,
): Promise<FloorPlan> {
  const response = await apiClient.patch<{ data: FloorPlan }, UpdateFloorPlanInput>(
    `/floor-plans/${id}`,
    input,
    { requiresAuth: true },
  );
  return response.data;
}
```

### B4 — `delete-floor-plan.api.ts`

> **Phase 1 note** — No delete UI is built in this plan. This file is created so the API
> layer is complete, but it has no caller yet. Add a comment in the file body:
> `// No UI in Phase 1 — wired up in a future floor management screen.`

```typescript
import { apiClient } from "../../../core/api-client";

// No UI in Phase 1 — wired up in a future floor management screen.
export async function deleteFloorPlanApi(id: string): Promise<void> {
  await apiClient.delete(`/floor-plans/${id}`, { requiresAuth: true });
}
```

### B5 — `get-floor-plan.api.ts`

> **Phase 1 note** — This file is created for completeness (the backend exposes the
> endpoint) but has no caller in this plan. `useFloorPlansFlow` loads all plans via
> `listFloorPlansApi`. Do not call this file from anywhere in Phase 1 — add a comment:
> `// No caller in Phase 1 — available for future single-plan detail screens.`

```typescript
import { apiClient } from "../../../core/api-client";
import type { FloorPlan } from "../types/analytics.types";

// No caller in Phase 1 — available for future single-plan detail screens.
export async function getFloorPlanApi(id: string): Promise<FloorPlan> {
  const response = await apiClient.get<{ data: FloorPlan }>(`/floor-plans/${id}`, {
    requiresAuth: true,
  });
  return response.data;
}
```

### B6 — Update `list-zones.api.ts`

```typescript
export async function listZonesApi(params?: { floorPlanId?: string }): Promise<StoreZone[]> {
  const query = params?.floorPlanId
    ? `?floorPlanId=${encodeURIComponent(params.floorPlanId)}`
    : "";
  const response = await apiClient.get<{ data: StoreZone[] }>(`/zones${query}`, {
    requiresAuth: true,
  });
  return response.data;
}
```

---

## Part C — Store Changes

### C1 — New `src/features/analytics/stores/floor-plan.store.ts`

```typescript
import { create } from "zustand";
import type { FloorPlan } from "../types/analytics.types";

interface FloorPlanStoreState {
  floorPlans: FloorPlan[];
  selectedFloorPlanId: string | null;
  setFloorPlans: (plans: FloorPlan[]) => void;
  upsertFloorPlan: (plan: FloorPlan) => void;
  removeFloorPlan: (id: string) => void;
  setSelectedFloorPlanId: (id: string | null) => void;
}

export const useFloorPlanStore = create<FloorPlanStoreState>((set) => ({
  floorPlans: [],
  selectedFloorPlanId: null,
  setFloorPlans: (floorPlans) => set({ floorPlans }),
  upsertFloorPlan: (plan) =>
    set((state) => ({
      floorPlans: state.floorPlans.some((p) => p.id === plan.id)
        ? state.floorPlans.map((p) => (p.id === plan.id ? plan : p))
        : [...state.floorPlans, plan].sort((a, b) => a.sortOrder - b.sortOrder),
    })),
  removeFloorPlan: (id) =>
    set((state) => ({ floorPlans: state.floorPlans.filter((p) => p.id !== id) })),
  setSelectedFloorPlanId: (selectedFloorPlanId) => set({ selectedFloorPlanId }),
}));

export const selectFloorPlans = (state: FloorPlanStoreState) => state.floorPlans;
export const selectSelectedFloorPlanId = (state: FloorPlanStoreState) =>
  state.selectedFloorPlanId;
export const selectActiveFloorPlan = (state: FloorPlanStoreState) =>
  state.floorPlans.find((p) => p.id === state.selectedFloorPlanId) ?? null;
```

### C2 — Update `src/features/analytics/stores/floor-map.store.ts`

Add two new state fields and their setters:

```typescript
// Add to FloorMapStoreState interface:
isFloorBoundaryEditMode: boolean;
floorBoundaryDraft: import("../types/analytics.types").FloorPlanVertex[] | null;
setFloorBoundaryEditMode: (value: boolean) => void;
setFloorBoundaryDraft: (
  vertices: import("../types/analytics.types").FloorPlanVertex[] | null,
) => void;

// Add to initialState:
isFloorBoundaryEditMode: false,
floorBoundaryDraft: null,

// Add to create():
setFloorBoundaryEditMode: (isFloorBoundaryEditMode) => set({ isFloorBoundaryEditMode }),
setFloorBoundaryDraft: (floorBoundaryDraft) => set({ floorBoundaryDraft }),
```

Add selectors:

```typescript
export const selectFloorBoundaryEditMode = (s: FloorMapStoreState) =>
  s.isFloorBoundaryEditMode;
export const selectFloorBoundaryDraft = (s: FloorMapStoreState) => s.floorBoundaryDraft;
```

---

## Part D — New and Updated Flows

### D1 — New `src/features/analytics/flows/use-floor-plans.flow.ts`

Responsibilities:
- Fetches all floor plans on mount, stores in `floorPlanStore`.
- Auto-selects the first floor if none is selected.
- Exposes `createFloorPlan` with optimistic update (temp `id: "__draft-floor__"` until API
  resolves, then replaces with real record).

```typescript
export function useFloorPlansFlow() {
  const { setFloorPlans, upsertFloorPlan, selectedFloorPlanId, setSelectedFloorPlanId } =
    useFloorPlanStore();

  useEffect(() => {
    listFloorPlansApi().then((plans) => {
      setFloorPlans(plans);
      // Read from the store directly instead of using the closure value of
      // selectedFloorPlanId — the effect runs once on mount so the closure
      // always captures the initial null, even if another caller has already
      // set a selection by the time the fetch resolves (stale closure fix #13).
      const currentSelected = useFloorPlanStore.getState().selectedFloorPlanId;
      if (!currentSelected && plans.length > 0) {
        setSelectedFloorPlanId(plans[0].id);
      }
    });
  }, []);

  const createFloorPlan = useCallback(
    async (input: CreateFloorPlanInput) => {
      const tempPlan: FloorPlan = {
        id: "__draft-floor__",
        shopId: "",
        ...input,
        shape: null,
        sortOrder: input.sortOrder ?? 0,
      };
      upsertFloorPlan(tempPlan);
      setSelectedFloorPlanId("__draft-floor__");

      const created = await createFloorPlanApi(input);
      // Remove temp, add real
      useFloorPlanStore.getState().removeFloorPlan("__draft-floor__");
      upsertFloorPlan(created);
      setSelectedFloorPlanId(created.id);
    },
    [upsertFloorPlan, setSelectedFloorPlanId],
  );

  return { createFloorPlan };
}
```

### D2 — Update `src/features/analytics/flows/use-floor-map.flow.ts`

Re-fetch zones when `selectedFloorPlanId` changes.

> **Double-fetch guard (fix #4)** — On mount, `selectedFloorPlanId` is `null` while
> `useFloorPlansFlow` is still loading. Without a guard, the effect would fire immediately
> with no filter (returning all zones), then fire again once the first floor auto-selects.
> Guard by also reading `floorPlans` length: only fetch when either a specific floor is
> selected, or floor plans have definitively loaded and returned empty (so the empty-state
> is shown). Skip the fetch while `floorPlans.length === 0 && selectedFloorPlanId === null`.

```typescript
export function useFloorMapFlow(containerRef, resizeKey?) {
  const setZones = useFloorMapStore((state) => state.setZones);
  const setStageSize = useFloorMapStore((state) => state.setStageSize);
  const selectedFloorPlanId = useFloorPlanStore(selectSelectedFloorPlanId);
  const floorPlans = useFloorPlanStore(selectFloorPlans);

  useEffect(() => {
    // Skip until a floor is selected (prevents a wasteful all-zones fetch on mount
    // that gets immediately replaced once useFloorPlansFlow auto-selects the first floor).
    if (!selectedFloorPlanId) return;

    let disposed = false;
    listZonesApi({ floorPlanId: selectedFloorPlanId }).then((zones) => {
      if (!disposed) setZones(zones);
    });
    return () => { disposed = true; };
  }, [selectedFloorPlanId, setZones]);

  // ... resize observer unchanged
}
```

### D3 — New `src/features/analytics/flows/use-floor-boundary-editor.flow.ts`

```typescript
export function useFloorBoundaryEditorFlow() {
  const activeFloorPlan = useFloorPlanStore(selectActiveFloorPlan);
  const { setFloorBoundaryDraft, setFloorBoundaryEditMode } = useFloorMapStore();
  const { upsertFloorPlan } = useFloorPlanStore();

  // Build the default full-floor rectangle (in cm vertices)
  const buildDefaultVertices = useCallback((): FloorPlanVertex[] => {
    if (!activeFloorPlan) return [];
    const { widthCm, depthCm } = activeFloorPlan;
    return [
      { xCm: 0, yCm: 0 },
      { xCm: widthCm, yCm: 0 },
      { xCm: widthCm, yCm: depthCm },
      { xCm: 0, yCm: depthCm },
    ];
  }, [activeFloorPlan]);

  const beginBoundaryEdit = useCallback(() => {
    const initial = activeFloorPlan?.shape ?? buildDefaultVertices();
    setFloorBoundaryDraft(initial);
    setFloorBoundaryEditMode(true);
  }, [activeFloorPlan, buildDefaultVertices, setFloorBoundaryDraft, setFloorBoundaryEditMode]);

  const cancelBoundaryEdit = useCallback(() => {
    setFloorBoundaryDraft(null);
    setFloorBoundaryEditMode(false);
  }, [setFloorBoundaryDraft, setFloorBoundaryEditMode]);

  const saveBoundary = useCallback(
    async (draftVertices: FloorPlanVertex[]) => {
      if (!activeFloorPlan) return;
      // Optimistic
      upsertFloorPlan({ ...activeFloorPlan, shape: draftVertices });
      setFloorBoundaryDraft(null);
      setFloorBoundaryEditMode(false);
      // Persist
      const updated = await updateFloorPlanApi(activeFloorPlan.id, {
        shape: draftVertices,
      });
      upsertFloorPlan(updated);
    },
    [activeFloorPlan, upsertFloorPlan, setFloorBoundaryDraft, setFloorBoundaryEditMode],
  );

  return { beginBoundaryEdit, cancelBoundaryEdit, saveBoundary };
}
```

### D4 — Update `src/features/analytics/flows/use-zone-editor.flow.ts`

Update `createZone`, `saveZoneShape`, and `moveZone` to derive / pass `widthCm` / `depthCm`
and to snap zone moves to the grid.

> **Zone move snap (fix #1)** — The existing `moveZone` receives `(zone, xPx, yPx)` from
> `onDragEnd` and converts directly to percentages. It must snap the raw pixel position
> before the conversion. `gridStepPxX` / `gridStepPxY` are read from `useFloorMapStore`
> (or passed in as arguments) alongside the floor plan dimensions.

```typescript
const createZone = useCallback(
  async (input: CreateStoreZoneInput) => {
    const fp = useFloorPlanStore.getState().floorPlans.find(
      (p) => p.id === useFloorPlanStore.getState().selectedFloorPlanId,
    );
    const payload: CreateStoreZoneInput = {
      ...input,
      floorPlanId: fp?.id ?? null,
      widthCm: fp ? Math.round((input.widthPct / 100) * fp.widthCm) : null,
      depthCm: fp ? Math.round((input.heightPct / 100) * fp.depthCm) : null,
    };
    const created = await createZoneApi(payload);
    upsertZone(created);
    return created;
  },
  [upsertZone],
);

const saveZoneShape = useCallback(
  async (zone: StoreZone, shape: Pick<StoreZone, "xPct" | "yPct" | "widthPct" | "heightPct">) => {
    const fp = useFloorPlanStore.getState().floorPlans.find(
      (p) => p.id === useFloorPlanStore.getState().selectedFloorPlanId,
    );
    const patch = {
      ...shape,
      widthCm: fp ? Math.round((shape.widthPct / 100) * fp.widthCm) : zone.widthCm,
      depthCm: fp ? Math.round((shape.heightPct / 100) * fp.depthCm) : zone.depthCm,
    };
    await updateZoneApi(zone.id, patch);
    upsertZone({ ...zone, ...patch });
  },
  [upsertZone],
);

// moveZone — snap to grid before converting to percentage (fix #1)
const moveZone = useCallback(
  async (zone: StoreZone, xPx: number, yPx: number) => {
    const fp = useFloorPlanStore.getState().floorPlans.find(
      (p) => p.id === useFloorPlanStore.getState().selectedFloorPlanId,
    );
    const { stageWidth, stageHeight } = useFloorMapStore.getState();

    // Snap to grid if a floor plan with known dimensions is active.
    // Use the CURRENT viewport scale so the snap matches the visual grid the user sees.
    let snappedX = xPx;
    let snappedY = yPx;
    if (fp) {
      // Read from store via getState() to avoid stale closure (moveZone is a
      // useCallback with [upsertZone] deps — it does not re-create on scale change).
      const viewportScale =
        useFloorMapStore.getState().interactiveViewportTransform?.scale ?? 1;
      const spacingCm = computeGridSpacingCm(viewportScale, stageWidth, fp.widthCm);
      snappedX = snapToGridPx(xPx, gridStepPx(spacingCm, stageWidth, fp.widthCm));
      snappedY = snapToGridPx(yPx, gridStepPx(spacingCm, stageHeight, fp.depthCm));
    }

    const nextZone: StoreZone = {
      ...zone,
      xPct: pxToPct(snappedX, stageWidth),
      yPct: pxToPct(snappedY, stageHeight),
    };
    await updateZoneApi(zone.id, { xPct: nextZone.xPct, yPct: nextZone.yPct });
    upsertZone(nextZone);
  },
  [upsertZone],
);
```

> **Note on viewport scale in `moveZone`** (fix #14): `onDragEnd` delivers the zone
> position in world-pixel space (inside the viewport `Group`). The grid step is also
> in world pixels (`gridStepPx`). However, to snap to the VISUAL grid — the one the
> user actually sees — `computeGridSpacingCm` must receive the **current viewport scale**.
>
> Example: floor 1200 cm wide, stageWidth 390 px, viewport scale = 3.
> - At `scale=1`: `targetCm = 80 / (1 × 0.325) = 246 cm` → 250 cm grid → gridStepPx ≈ 81 px.
> - At `scale=3`: `targetCm = 80 / (3 × 0.325) = 82 cm` → 100 cm grid → gridStepPx ≈ 33 px.
>
> Without the viewport scale, the zone snaps to the coarsest 250 cm step while the user
> sees 100 cm grid lines — the zone consistently lands between grid lines on mobile.
> Use `useFloorMapStore.getState().interactiveViewportTransform?.scale ?? 1` inside
> `moveZone` (`.getState()` avoids a stale closure since the callback is not re-created
> on every scale change).

### D5 — New `src/features/analytics/flows/use-zone-label-suggestions.flow.ts`

Fetches once (module-level cache), combines and dedupes:

```typescript
let cachedSuggestions: string[] | null = null;

async function loadSuggestions(): Promise<string[]> {
  if (cachedSuggestions) return cachedSuggestions;

  const [metafieldOptions, mapZones] = await Promise.all([
    getLocationOptionsApi(),       // string[] of metafield option values
    listZonesApi(),                // StoreZone[] — all zones (no floorPlanId filter)
  ]);

  const labels = new Set<string>([
    ...metafieldOptions,
    ...mapZones.map((z) => z.label).filter(Boolean),
  ]);

  cachedSuggestions = [...labels].sort();
  return cachedSuggestions;
}

export function useZoneLabelSuggestions(input: string): string[] {
  const [all, setAll] = useState<string[]>([]);

  useEffect(() => {
    loadSuggestions().then(setAll);
  }, []);

  return useMemo(() => {
    const query = input.trim().toLowerCase();
    if (!query) return all.slice(0, 8);
    return all.filter((s) => s.toLowerCase().includes(query)).slice(0, 8);
  }, [all, input]);
}
```

---

## Part E — Utility Modules

### E1 — `src/features/analytics/utils/cm-format.ts`

```typescript
/**
 * Formats a centimetre value for display.
 * < 100 cm → "45cm"
 * ≥ 100 cm → "1.2m"
 */
export function formatCm(cm: number): string {
  if (cm >= 100) return `${(cm / 100).toFixed(1)}m`;
  return `${Math.round(cm)}cm`;
}
```

### E2 — `src/features/analytics/utils/grid-utils.ts`

```typescript
const NICE_CM_STEPS = [5, 10, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];

/**
 * Picks the "nicest" grid spacing in cm so that grid lines appear
 * approximately targetPixelSpacing pixels apart on screen.
 */
export function computeGridSpacingCm(
  viewportScale: number,
  stageWidthPx: number,
  floorWidthCm: number,
  targetPixelSpacing = 80,
): number {
  const pxPerCm = stageWidthPx / floorWidthCm;
  // desired cm distance at current zoom that would give targetPixelSpacing screen px
  const targetCm = targetPixelSpacing / (viewportScale * pxPerCm);

  return NICE_CM_STEPS.reduce((best, step) =>
    Math.abs(Math.log(step / targetCm)) < Math.abs(Math.log(best / targetCm))
      ? step
      : best,
  );
}

/**
 * Snaps a world-pixel position to the nearest grid line.
 */
export function snapToGridPx(worldPx: number, gridStepPx: number): number {
  if (gridStepPx <= 0) return worldPx;
  return Math.round(worldPx / gridStepPx) * gridStepPx;
}

/**
 * Grid step in world pixels for a given grid spacing in cm and axis scale.
 */
export function gridStepPx(
  gridSpacingCm: number,
  stageAxisPx: number,
  floorAxisCm: number,
): number {
  return gridSpacingCm * (stageAxisPx / floorAxisCm);
}

/**
 * Converts a FloorPlanVertex array (cm) to world-pixel coordinates.
 */
export function cmVerticesToWorldPx(
  vertices: Array<{ xCm: number; yCm: number }>,
  stageWidth: number,
  stageHeight: number,
  floorWidthCm: number,
  floorDepthCm: number,
): Array<{ xPx: number; yPx: number }> {
  const scaleX = stageWidth / floorWidthCm;
  const scaleY = stageHeight / floorDepthCm;
  return vertices.map((v) => ({ xPx: v.xCm * scaleX, yPx: v.yCm * scaleY }));
}

/**
 * Converts a world-pixel position back to cm.
 */
export function worldPxToCm(
  xPx: number,
  yPx: number,
  stageWidth: number,
  stageHeight: number,
  floorWidthCm: number,
  floorDepthCm: number,
): { xCm: number; yCm: number } {
  return {
    xCm: Math.round((xPx / stageWidth) * floorWidthCm),
    yCm: Math.round((yPx / stageHeight) * floorDepthCm),
  };
}
```

---

## Part F — Konva Components (inside `StoreMapSettingsPage.tsx`)

### F1 — `GridLayer` component

A Konva `<Layer>` rendered as the **first** child of `<Stage>` (below zones). Only rendered
when `isEditorMode` is true and an active floor plan exists.

```typescript
interface GridLayerProps {
  stageWidth: number;
  stageHeight: number;
  // Decomposed primitives — NOT the full viewportTransform object.
  // Passing the object would create a new reference on every pan frame and
  // bypass React.memo even when only unrelated parent state changed (fix #15).
  viewportScale: number;
  viewportOffsetX: number;
  viewportOffsetY: number;
  floorWidthCm: number;
  floorDepthCm: number;
  gridSpacingCm: number; // computed in parent, shared with legend (fix #5)
}
```

> **Performance — single canvas draw call (fix #10)** — Drawing individual Konva `<Line>`
> elements creates one React node per line. At `gridSpacingCm = 5` on a 1200 × 800 cm
> floor, that is 400+ nodes; every pan/pinch triggers a full re-render of all of them,
> causing visible lag on low-end Android devices.
>
> Instead, use a **single Konva `<Shape>` with a custom `sceneFunc`** that draws all grid
> lines in one canvas pass:

```typescript
// React.memo: each pan frame delivers new primitive values but React.memo still
// short-circuits if none of them changed (e.g. stageWidth / floorWidthCm / gridSpacingCm
// stay the same between frames). Without memo, any parent state update (selected zone,
// editor mode toggle, etc.) would cause a full GridLayer re-render on mobile.
const GridLayer = React.memo(function GridLayer({
  stageWidth, stageHeight,
  viewportScale, viewportOffsetX, viewportOffsetY,
  floorWidthCm, floorDepthCm, gridSpacingCm,
}: GridLayerProps) {
  const scale   = viewportScale;
  const offsetX = viewportOffsetX;
  const offsetY = viewportOffsetY;
  const stepPxX = gridStepPx(gridSpacingCm, stageWidth, floorWidthCm);
  const stepPxY = gridStepPx(gridSpacingCm, stageHeight, floorDepthCm);

  // Visible world rect
  const worldLeft   = (0           - offsetX) / scale;
  const worldRight  = (stageWidth  - offsetX) / scale;
  const worldTop    = (0           - offsetY) / scale;
  const worldBottom = (stageHeight - offsetY) / scale;

  const sceneFunc = (ctx: CanvasRenderingContext2D) => {
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1 / scale; // visually constant 1 px

    const firstCol = Math.floor(worldLeft  / stepPxX) - 1;
    const lastCol  = Math.ceil (worldRight / stepPxX) + 1;
    const firstRow = Math.floor(worldTop   / stepPxY) - 1;
    const lastRow  = Math.ceil (worldBottom/ stepPxY) + 1;

    ctx.beginPath();
    for (let c = firstCol; c <= lastCol; c++) {
      const x = c * stepPxX;
      ctx.moveTo(x, worldTop    - stepPxY);
      ctx.lineTo(x, worldBottom + stepPxY);
    }
    for (let r = firstRow; r <= lastRow; r++) {
      const y = r * stepPxY;
      ctx.moveTo(worldLeft  - stepPxX, y);
      ctx.lineTo(worldRight + stepPxX, y);
    }
    ctx.stroke();
    ctx.restore();
  };

  return (
    <Layer listening={false}>
      <Shape sceneFunc={sceneFunc} width={stageWidth} height={stageHeight} />
    </Layer>
  );
});
```

This draws every grid line in a single canvas path — one `stroke()` call regardless of
zoom level or floor size.

### F2 — Grid legend (React overlay)

A `<div>` positioned `absolute bottom-20 left-4 z-20` over the canvas. Only visible in
editor mode with an active floor plan.

> **Shared `gridSpacingCm` (fix #5)** — Both `GridLayer` and this legend need the same
> value. Compute it **once** in `StoreMapSettingsPage` using `useMemo`, then pass it as a
> prop to `MapEditorStage` (which forwards it to `GridLayer`) and read it directly in the
> legend `<div>`. Never compute it independently in two places.

```typescript
// In StoreMapSettingsPage, before the JSX:
const gridSpacingCm = useMemo(() => {
  if (!activeFloorPlan || !interactiveViewportTransform) return 100;
  return computeGridSpacingCm(
    interactiveViewportTransform.scale,
    stageWidth,
    activeFloorPlan.widthCm,
  );
  // Depend on .scale (primitive), NOT the full transform object.
  // The transform object is a new reference on every pan frame; depending on
  // the object would recompute gridSpacingCm 60×/sec even when scale is unchanged
  // (fix #16). Only the scale value determines which nice step is chosen.
}, [activeFloorPlan, interactiveViewportTransform?.scale, stageWidth]);
```

```tsx
{isEditorMode && activeFloorPlan ? (
  <div className="pointer-events-none absolute bottom-20 left-4 z-20">
    <div className="rounded-lg border border-white/15 bg-slate-950/70 px-2 py-1 backdrop-blur">
      <p className="m-0 text-[10px] font-medium text-slate-300">
        ■ {formatCm(gridSpacingCm)}
      </p>
    </div>
  </div>
) : null}
```

### F3 — `FloorBoundaryShape` component

Rendered inside the zones `<Group>` (same viewport transform), **before** zone rectangles
so it renders behind them.

> **cm ↔ px conversion ownership (fix #2)** — The store (`floorBoundaryDraft`) holds
> `FloorPlanVertex[]` in **cm**. `FloorBoundaryShape` receives `vertices` in **world
> pixels**. The conversion must happen in `StoreMapSettingsPage` (or `MapEditorStage`),
> not inside this component:
>
> - **Before passing in**: `cmVerticesToWorldPx(floorBoundaryDraft, stageWidth, stageHeight, fp.widthCm, fp.depthCm)`
> - **Inside `onDraftChange`** (before calling `setFloorBoundaryDraft`): convert each
>   `{xPx, yPx}` back to `{xCm, yCm}` using `worldPxToCm(xPx, yPx, ...)`.
>
> `FloorBoundaryShape` is purely world-pixel — it never touches cm directly.

> **Pan lock wiring (fix #17)** — `FloorBoundaryShape.onHandleActiveChange` reports
> when a corner handle starts/stops being dragged. This must be wired to the same
> `isShapeHandleActive` state that `ShapeHandles` already uses to disable
> `useMapTouchControlsFlow` pan. In `MapEditorStage`, pass:
> ```typescript
> onHandleActiveChange={(active) => setIsShapeHandleActive(active)}
> ```
> Without this, dragging a boundary corner on mobile simultaneously pans the viewport.

> **Ref for intermediate drag state (fix #18)** — Each pointer-move event during a
> corner handle drag calls `onDraftChange` → parent converts px→cm → `setFloorBoundaryDraft`.
> Zustand notifies ALL subscribers on every write (~60×/sec on mobile). This causes the
> entire editor tree to re-render at 60 fps while the user drags a handle.
>
> Fix: inside `FloorBoundaryShape`, store the in-progress vertices in a `useRef`, NOT
> in state. Only call `onDraftChange` in the handle's `onDragEnd` (not `onDragMove`).
> The `<Rect>` visual can read directly from the ref during the drag via a separate
> `useState` that's updated only in `onDragMove` for the visual, keeping Zustand out of
> the hot path. Alternatively: call `onDraftChange` only on `onDragEnd` and derive the
> visual rect from local component state during the drag.
>
> Simplified pattern:
> ```typescript
> // Inside FloorBoundaryShape
> const draftRef = useRef(vertices); // world px, updated on every pointer move
> const [localVertices, setLocalVertices] = useState(vertices); // drives visual
>
> // onDragMove: update ref + local state (local state re-renders only this component)
> // onDragEnd:  call onDraftChange(draftRef.current) → triggers Zustand write once
> ```

Props:
```typescript
interface FloorBoundaryShapeProps {
  // Vertices already converted to world pixels by the parent
  vertices: Array<{ xPx: number; yPx: number }>;
  isEditMode: boolean;
  isPreview: boolean; // true = on settings page preview (not editor)
  scale: number;      // current viewport scale, for strokeWidth correction
  onDraftChange?: (vertices: Array<{ xPx: number; yPx: number }>) => void;
  onHandleActiveChange?: (active: boolean) => void; // wire to isShapeHandleActive (fix #17)
  onInteractionStart?: () => void;
  gridStepPxX: number;
  gridStepPxY: number;
}
```

For a rectangle, derive `x, y, width, height` from NW + SE vertices:
```
const x      = vertices[0].xPx
const y      = vertices[0].yPx
const width  = vertices[1].xPx - vertices[0].xPx
const height = vertices[3].yPx - vertices[0].yPx
```

Rendering:
- **Preview / non-edit**: `<Rect>` with `stroke="#64748b"` `opacity={0.2}` `dash={[8,6]}`
  `fill="transparent"` `strokeWidth={2/scale}` `listening={false}`.
- **Editor, not edit mode**: `<Rect>` with `stroke="#94a3b8"` `opacity={0.4}`
  `strokeWidth={2/scale}` `listening={false}`.
- **Editor, edit mode**: same rect with `opacity={0.7}` `stroke="#e2e8f0"`, plus 4 corner
  drag handles (same structure as `ShapeHandles` but calling `snapToGridPx` on drag move).

Corner handle drag logic (mirrors `ShapeHandles`):
- NW handle: adjusts `x`, `y`, `width`, `height` (clamp min size 24 px).
- NE handle: adjusts `y`, `width`, `height`.
- SW handle: adjusts `x`, `width`, `height`.
- SE handle: adjusts `width`, `height`.
- On each drag position, snap `nextHandleCenterX/Y` to grid before computing new rect.
- `onDraftChange` receives updated 4 vertices in world px.

### F4 — Update `ShapeHandles` and `EditableZone` for grid snapping and boundary lock

**`ShapeHandles` grid snap:**

Add props `gridStepPxX: number` and `gridStepPxY: number`. In `onDragMove`, before
computing `nextHandleCenterX/Y`, apply:

```typescript
const snappedX = snapToGridPx(event.target.x() + handleSize / 2, gridStepPxX);
const snappedY = snapToGridPx(event.target.y() + handleSize / 2, gridStepPxY);
```

When no active floor plan exists, pass `gridStepPxX=0` / `gridStepPxY=0`. `snapToGridPx`
returns the original value unchanged when `gridStepPx <= 0`.

**`EditableZone` — `isLocked` prop (fix #3):**

> The current `EditableZone` has **two independent drag systems**: the Konva `draggable`
> prop AND a custom long-press `onTouchStart`/`onTouchMove`/`onTouchEnd` implementation.
> Setting `draggable={false}` only disables the first one. In floor boundary edit mode,
> both must be disabled.

Add an `isLocked: boolean` prop to `EditableZone`. When `isLocked` is true:
- `draggable={false}`
- `onClick={undefined}`, `onTap={undefined}`
- `onTouchStart={undefined}`, `onTouchMove={undefined}`, `onTouchEnd={undefined}`
  (also clears the `longPressTimeoutRef` if set)

Pass `isLocked={isFloorBoundaryEditMode}` from `MapEditorStage` to every `EditableZone`.

### F5 — Floor boundary info panel

Rendered in the editor when `activeZoneEditorMode === "floor-boundary"`, at the same
position as the zone shape panel (`absolute inset-x-0 top-0 z-30 p-4 pt-16`).

```tsx
<div className="pointer-events-auto relative mx-auto max-w-[320px]">
  {/* × cancel button (top-right) */}
  <div className="flex items-start gap-2 rounded-2xl border border-white/15 bg-slate-950/88 px-3 py-3 pr-4 ...">
    <div className="min-w-0 flex-1 text-white">
      <p className="... uppercase tracking-wide text-slate-300">Floor Boundary</p>
      <div className="mt-1 flex gap-4 text-sm tabular-nums text-slate-100">
        <span>W {formatCm(boundaryWidthCm)}</span>
        <span>H {formatCm(boundaryDepthCm)}</span>
      </div>
    </div>
    {/* ✓ save button */}
  </div>
</div>
```

`boundaryWidthCm` and `boundaryDepthCm` are derived from the current draft vertices in the
same way as `worldPxToCm`.

---

## Part G — Floor Plan Selector Card

Replaces the current "Zones" list card at the bottom of `StoreMapSettingsPage`.

### G1 — Empty state (no floor plans)

```tsx
<div className="rounded-2xl border border-slate-900/10 bg-white/90 p-6 shadow-...">
  <p className="m-0 text-sm font-semibold text-slate-900">Floor Plans</p>
  <div className="mt-4 flex flex-col items-center gap-3 py-2">
    <p className="text-sm text-slate-500 text-center">
      No floors yet. Create your first floor to start placing zones.
    </p>
    <button
      type="button"
      onClick={() => setIsFloorCreateModalOpen(true)}
      className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm"
    >
      + Create your first floor
    </button>
  </div>
</div>
```

When no floor plans exist, the preview map and the "Edit" button are both hidden (no floor
to edit). Only the empty state + "Create your first floor" CTA is shown.

### G2 — Floor selector (floor plans exist)

> **Edit button guard (fix #11)** — The "Edit" button on the preview map card must be
> disabled (or hidden) when `activeFloorPlan` is null. This can happen briefly during
> the initial load before floor plans resolve, or if the selected floor plan id no longer
> matches any loaded plan. Guard: `disabled={!activeFloorPlan}` on the Edit button.

```tsx
<div className="rounded-2xl border border-slate-900/10 bg-white/90 p-3 shadow-...">
  <div className="mb-3 flex items-center justify-between">
    <p className="m-0 text-sm font-semibold text-slate-900">Floor</p>
    <button
      type="button"
      onClick={() => setIsFloorCreateModalOpen(true)}
      aria-label="Add floor"
      className="grid h-8 w-8 place-items-center rounded-full border border-slate-200 text-xl font-light text-slate-600"
    >
      +
    </button>
  </div>

  <select
    value={selectedFloorPlanId ?? ""}
    onChange={(e) => setSelectedFloorPlanId(e.target.value)}
    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900"
  >
    {floorPlans.map((fp) => (
      <option key={fp.id} value={fp.id}>
        {fp.name}
      </option>
    ))}
  </select>

  {activeFloorPlan ? (
    <p className="mt-2 m-0 text-xs text-slate-400">
      {formatCm(activeFloorPlan.widthCm)} × {formatCm(activeFloorPlan.depthCm)}
      {" · "}
      {zones.length} zone{zones.length !== 1 ? "s" : ""}
    </p>
  ) : null}
</div>
```

### G3 — Create floor modal

Local component `FloorCreateModal` (or inline state in `StoreMapSettingsPage`).

State: `nameDraft: string`, `widthMDraft: string`, `depthMDraft: string`.

User inputs dimensions in **metres** (e.g. "12" for 12 m = 1200 cm). Stored as cm.

```tsx
<div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm">
  <div className="w-full max-w-[520px] rounded-t-3xl bg-white p-6 shadow-2xl">
    <p className="m-0 text-lg font-bold text-slate-900">New Floor</p>

    {/* Name */}
    <label className="mt-4 block text-xs font-semibold uppercase text-slate-400">Name</label>
    <input type="text" value={nameDraft} onChange={...} placeholder="Ground Floor" className="..." />

    {/* Width */}
    <label className="mt-3 block text-xs font-semibold uppercase text-slate-400">Width</label>
    <div className="flex items-center gap-2">
      <input type="number" min="0.5" step="0.5" value={widthMDraft} onChange={...} className="flex-1 ..." />
      <span className="text-sm text-slate-500">m</span>
    </div>

    {/* Depth */}
    <label className="mt-3 block text-xs font-semibold uppercase text-slate-400">Depth</label>
    <div className="flex items-center gap-2">
      <input type="number" min="0.5" step="0.5" value={depthMDraft} onChange={...} className="flex-1 ..." />
      <span className="text-sm text-slate-500">m</span>
    </div>

    <div className="mt-6 flex gap-3">
      <button type="button" onClick={onCancel} className="flex-1 rounded-2xl border ...">Cancel</button>
      {/* Fix #12 — validate before enabling Create */}
      <button
        type="button"
        disabled={
          !nameDraft.trim() ||
          isNaN(parseFloat(widthMDraft))  || parseFloat(widthMDraft)  <= 0 ||
          isNaN(parseFloat(depthMDraft))  || parseFloat(depthMDraft)  <= 0
        }
        onClick={() => {
          const widthCm = Math.round(parseFloat(widthMDraft) * 100);
          const depthCm = Math.round(parseFloat(depthMDraft) * 100);
          // Guard: backend rejects width/depth < 1 cm
          if (widthCm < 1 || depthCm < 1) return;
          createFloorPlan({
            name: nameDraft.trim() || "Ground Floor",
            widthCm,
            depthCm,
            sortOrder: floorPlans.length,
          });
          onClose();
        }}
        className="flex-1 rounded-2xl bg-sky-500 text-white ..."
      >
        Create
      </button>
    </div>
  </div>
</div>
```

---

## Part H — Zone Label Autocomplete

### H1 — Hook: `useZoneLabelSuggestions` (Part D5 above)

### H2 — Autocomplete dropdown in rename panel

Inside the `activeZoneEditorMode === "rename"` panel, after the input row:

```tsx
{suggestions.length > 0 ? (
  <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-white/95">
    {suggestions.map((s) => (
      <button
        key={s}
        type="button"
        onMouseDown={(e) => e.preventDefault()} // keep input focused
        onClick={() => setLabelDraft(s)}
        className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 last:border-0 hover:bg-slate-100"
      >
        {s}
      </button>
    ))}
  </div>
) : null}
```

`suggestions = useZoneLabelSuggestions(labelDraft)`.

The `onMouseDown` `preventDefault` prevents the text input from losing focus when tapping
a suggestion on iOS — the `onClick` then fires and sets the draft.

---

## Part I — `StoreMapSettingsPage` Overhaul Summary

### I1 — New state

```typescript
const [isFloorCreateModalOpen, setIsFloorCreateModalOpen] = useState(false);
const activeFloorPlan = useFloorPlanStore(selectActiveFloorPlan);
const floorPlans = useFloorPlanStore(selectFloorPlans);
const { createFloorPlan } = useFloorPlansFlow();
const { beginBoundaryEdit, cancelBoundaryEdit, saveBoundary } = useFloorBoundaryEditorFlow();
const isFloorBoundaryEditMode = useFloorMapStore(selectFloorBoundaryEditMode);
const floorBoundaryDraft = useFloorMapStore(selectFloorBoundaryDraft);
```

### I2 — `activeZoneEditorMode` extended

```typescript
const [activeZoneEditorMode, setActiveZoneEditorMode] = useState<
  "menu" | "rename" | "shape" | "floor-boundary" | null
>(null);
```

### I3 — + FAB: second sub-button

The second button fans out alongside the existing zone-block button. Uses a floor-boundary
icon (square outline with corner dots — SVG inline).

```tsx
<button
  aria-label="Edit floor boundary"
  className={`pointer-events-auto absolute bottom-[4.2rem] right-[8.0rem] flex h-12 w-12 ... ${
    isCreateMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
  }`}
  onClick={() => {
    setIsCreateMenuOpen(false);
    beginBoundaryEdit();
    setActiveZoneEditorMode("floor-boundary");
  }}
>
  {/* Floor boundary icon */}
  <FloorBoundaryIcon />
</button>
```

Disable this button when `activeFloorPlan` is null (no floor selected).

> **`beginCreateZone` initial snap (fix #7)** — The existing `beginCreateZone` function
> computes a draft zone centered on the visible viewport area. With grid snap enabled, the
> initial `centerXPct` / `centerYPct` must also snap so the new zone lands on a grid
> intersection from the start. After computing the center in world pixels, apply
> `snapToGridPx` to both axes using the current `gridStepPxX` / `gridStepPxY` before
> converting to percent. Otherwise the first zone appears off-grid and the user must
> re-drag it to align.

### I4 — `MapEditorStage` updated props

```typescript
activeFloorPlan?: FloorPlan | null;
isFloorBoundaryEditMode?: boolean;
floorBoundaryVerticesPx?: Array<{ xPx: number; yPx: number }> | null;
onBoundaryDraftChange?: (vertices: Array<{ xPx: number; yPx: number }>) => void;
onBoundaryHandleActiveChange?: (active: boolean) => void;
gridSpacingCm?: number;
```

Inside `MapEditorStage`:
1. `GridLayer` is the **first** child of `<Stage>` — before the zones `Layer`.
   Pass decomposed primitive props, not the transform object (fix #15):
   ```tsx
   <GridLayer
     stageWidth={stageWidth}
     stageHeight={stageHeight}
     viewportScale={viewportTransform.scale}
     viewportOffsetX={viewportTransform.offsetX}
     viewportOffsetY={viewportTransform.offsetY}
     floorWidthCm={activeFloorPlan.widthCm}
     floorDepthCm={activeFloorPlan.depthCm}
     gridSpacingCm={gridSpacingCm}
   />
   ```
2. Inside the zones `<Group>`, `FloorBoundaryShape` is rendered **before** zone rectangles.
3. When `isFloorBoundaryEditMode`: every `EditableZone` receives `isLocked={true}` (disables
   both `draggable` and the long-press touch handlers — see F4).
4. `gridStepPxX` / `gridStepPxY` passed to both `ShapeHandles` and `FloorBoundaryShape`.
5. Wire boundary handle pan lock (fix #17) — `MapEditorStage` holds `isShapeHandleActive`
   state that pauses `useMapTouchControlsFlow`. Pass it to both `ShapeHandles` AND
   `FloorBoundaryShape`:
   ```tsx
   <FloorBoundaryShape
     ...
     onHandleActiveChange={(active) => setIsShapeHandleActive(active)}
   />
   ```
   This ensures the viewport does not pan while the user drags a boundary corner handle.

> **Boundary draft cm ↔ px conversion sites (fix #2)** — `StoreMapSettingsPage` owns
> these two conversions; `MapEditorStage` and `FloorBoundaryShape` never touch cm:
>
> ```typescript
> // 1. cm → px before passing to MapEditorStage:
> const floorBoundaryVerticesPx = useMemo(() =>
>   activeFloorPlan && floorBoundaryDraft
>     ? cmVerticesToWorldPx(floorBoundaryDraft, stageWidth, stageHeight,
>                           activeFloorPlan.widthCm, activeFloorPlan.depthCm)
>     : null,
>   [activeFloorPlan, floorBoundaryDraft, stageWidth, stageHeight],
> );
>
> // 2. px → cm inside onBoundaryDraftChange before updating the store:
> const handleBoundaryDraftChange = useCallback(
>   (verticesPx: Array<{ xPx: number; yPx: number }>) => {
>     if (!activeFloorPlan) return;
>     const verticesCm = verticesPx.map(({ xPx, yPx }) =>
>       worldPxToCm(xPx, yPx, stageWidth, stageHeight,
>                   activeFloorPlan.widthCm, activeFloorPlan.depthCm),
>     );
>     setFloorBoundaryDraft(verticesCm);
>   },
>   [activeFloorPlan, stageWidth, stageHeight, setFloorBoundaryDraft],
> );
> ```

### I5 — Preview map floor boundary

Pass `activeFloorPlan` to the non-editor `MapEditorStage`. If `activeFloorPlan.shape` is set,
convert vertices to world px and render `FloorBoundaryShape` with `isPreview={true}`.

### I6 — Zone shape panel: cm values

Replace `formatShapeMetric(value)` calls:

```typescript
function formatZoneShapeValue(
  pct: number,
  axis: "x" | "y",
  floorPlan: FloorPlan | null,
): string {
  if (!floorPlan) return `${(Math.round(pct * 10) / 10).toFixed(1)}%`;
  const cm = (pct / 100) * (axis === "x" ? floorPlan.widthCm : floorPlan.depthCm);
  return formatCm(cm);
}
```

X and W use `axis="x"` (floor widthCm); Y and H use `axis="y"` (floor depthCm).

### I7 — `buildEditorViewportTransform` update

> **Priority order (fix #6)** — The original plan said "fit to floor boundary if shape
> exists". This is worse UX for a shop that has a large floor plan but zones clustered in
> one corner — the user would open the editor and see tiny zones requiring a manual zoom.
>
> Correct priority:
> 1. **Zones exist** → fit to zone bounds (existing behaviour, unchanged).
> 2. **No zones, shape exists** → fit to floor boundary bounds (new floor, user about to
>    draw zones, sensible to see the boundary).
> 3. **No zones, no shape, floor plan exists** → scale=1, centered (blank canvas, grid
>    visible, user sees the full coordinate space).
> 4. **No floor plan** → existing fallback (scale=1, no offset).

The function signature gains three new parameters (fix #19):

```typescript
function buildEditorViewportTransform(
  zones: StoreZone[],
  stageWidth: number,
  stageHeight: number,
  shape?: FloorPlanVertex[] | null,   // ADD — floor boundary vertices (cm)
  floorWidthCm?: number,              // ADD — needed to convert shape vertices to world px
  floorDepthCm?: number,              // ADD
): EditorViewportTransform | null
```

> **Why `floorWidthCm`/`floorDepthCm` are required for the shape branch**: the body calls
> `cmVerticesToWorldPx(shape, stageWidth, stageHeight, floorWidthCm, floorDepthCm)` — without
> these two parameters, the call would fail or produce incorrect pixel bounds. They must be
> passed alongside `shape` whenever the shape branch is exercised.

Logic:
```typescript
if (zones.length > 0) {
  // existing zone-bounds fit — unchanged
}
if (shape && shape.length >= 4 && floorWidthCm && floorDepthCm) {
  // fit to boundary vertices (converted to world px)
  const pxVertices = cmVerticesToWorldPx(shape, stageWidth, stageHeight, floorWidthCm, floorDepthCm);
  // derive bounds from pxVertices, same padding/scale math as zone fit
}
// fallback: scale=1, offset=0
return { scale: 1, offsetX: 0, offsetY: 0 };
```

### I8 — Reset on floor change / editor exit

In the `useEffect` that reacts to `!isEditorMode`:
- Add `setFloorBoundaryEditMode(false)` and `setFloorBoundaryDraft(null)` alongside
  existing resets.

When `Done` is tapped while `isFloorBoundaryEditMode` is active: confirm discard of
boundary changes before exiting (same pattern as zone shape discard).

### I9 — Settings page layout

Top-level structure after changes:

```
<header>           — unchanged (Back arrow + title)
<hint card>        — unchanged ("Tap edit to pan...")
<preview map>      — hidden when no floorPlans; shows floor boundary faded
<floor selector>   — replaces "Zones" card; shows empty state or selector + floor info
<floor create modal> — conditional overlay
<editor overlay>   — unchanged structure, extended with grid + boundary + second FAB
```

---

## File Checklist

### Types & APIs
- [ ] A1 — Add `FloorPlan`, `FloorPlanVertex`, `CreateFloorPlanInput`, `UpdateFloorPlanInput` to `analytics.types.ts`
- [ ] A2 — Update `StoreZone`, `CreateStoreZoneInput`, `UpdateStoreZoneInput` in `analytics.types.ts`
- [ ] B1 — `apis/list-floor-plans.api.ts`
- [ ] B2 — `apis/create-floor-plan.api.ts`
- [ ] B3 — `apis/update-floor-plan.api.ts`
- [ ] B4 — `apis/delete-floor-plan.api.ts`
- [ ] B5 — `apis/get-floor-plan.api.ts`
- [ ] B6 — Update `apis/list-zones.api.ts` (add `floorPlanId` param)

### Stores
- [ ] C1 — `stores/floor-plan.store.ts` (new)
- [ ] C2 — Update `stores/floor-map.store.ts` (add boundary edit state)

### Flows
- [ ] D1 — `flows/use-floor-plans.flow.ts` (new — fetch, create with optimistic update; stale closure fix #13)
- [ ] D2 — Update `flows/use-floor-map.flow.ts` (filter by selectedFloorPlanId; skip fetch when null — fix #4)
- [ ] D3 — `flows/use-floor-boundary-editor.flow.ts` (new — begin/cancel/save boundary)
- [ ] D4 — Update `flows/use-zone-editor.flow.ts` (widthCm/depthCm/floorPlanId + moveZone grid snap with viewport scale — fix #1, fix #14)
- [ ] D5 — `flows/use-zone-label-suggestions.flow.ts` (new — combined autocomplete)

### Utilities
- [ ] E1 — `utils/cm-format.ts` (new — `formatCm`)
- [ ] E2 — `utils/grid-utils.ts` (new — `computeGridSpacingCm`, `snapToGridPx`, `gridStepPx`, coordinate converters)

### Konva Components (in `StoreMapSettingsPage.tsx` or extracted)
- [ ] F1 — `GridLayer` using single-pass `sceneFunc` canvas draw; `React.memo` + primitive props (performance — fix #10, fix #15)
- [ ] F2 — Grid legend React overlay `<div>` (reads `gridSpacingCm` computed in parent with `.scale` dep — fix #5, fix #16)
- [ ] F3 — `FloorBoundaryShape` (world-px only; ref-based drag state; pan lock wiring — fix #2, fix #17, fix #18)
- [ ] F4 — Update `ShapeHandles` (grid snap) + `EditableZone` `isLocked` prop (long-press lock — fix #3)
- [ ] F5 — Floor boundary info panel (W × H display + × / ✓ controls)

### UI
- [ ] G1 — Floor selector empty state (hides Edit button and preview map — fix #11)
- [ ] G2 — Floor selector with floor plans (Edit button guarded by `disabled={!activeFloorPlan}` — fix #11)
- [ ] G3 — Create floor modal with `isNaN` + `> 0` validation (fix #12)
- [ ] H2 — Autocomplete dropdown in rename panel

### `StoreMapSettingsPage` Wiring
- [ ] I1 — New store selectors + flow hooks added to page
- [ ] I2 — `activeZoneEditorMode` extended with `"floor-boundary"`
- [ ] I3 — Second sub-button in + FAB; `beginCreateZone` snaps initial position (fix #7)
- [ ] I4 — `MapEditorStage` props + cm↔px boundary conversion + GridLayer primitive props + pan lock wiring (fix #2, fix #15, fix #17)
- [ ] I5 — Preview map passes floor boundary to `MapEditorStage`
- [ ] I6 — `formatZoneShapeValue` replaces `formatShapeMetric` in shape panel
- [ ] I7 — `buildEditorViewportTransform`: zones-first fit priority; complete signature with `floorWidthCm`/`floorDepthCm` (fix #6, fix #19)
- [ ] I8 — Editor exit cleanup (boundary draft reset)
- [ ] I9 — Settings page layout: zones card replaced, preview/Edit hidden when no floors (fix #11)

### Dead code (Phase 1 — no callers)
- [ ] B4 — `apis/delete-floor-plan.api.ts` — created, no UI yet (fix #9: add comment)
- [ ] B5 — `apis/get-floor-plan.api.ts` — created, no caller yet (fix #8: add comment)

---

## Known Constraints

- **Zone percentages stay as-is**: no DB migration. All cm values are display-only or
  derived on save. The % ↔ cm conversion is always `pct / 100 × floorAxisCm`.
- **Rectangle boundary only (Phase 1)**: `FloorPlan.shape` will hold exactly 4 vertices in
  NW → NE → SE → SW order. Complex polygon support is not in scope.
- **No floor deletion UI in this plan**: the delete API exists on the backend but no delete
  button is added here. Add in a future settings/management screen.
- **Unassigned zones**: zones created before floor plans existed have `floorPlanId: null`.
  They are not shown when a floor is selected. They are orphaned — no migration UI in this plan.
- **`cachedSuggestions` module-level cache**: refreshes only on page reload. Suitable for
  a settings screen accessed occasionally. If real-time refresh is needed later, add a
  `refetch` call on editor open.
