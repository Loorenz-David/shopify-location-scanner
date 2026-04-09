# Floor Plan Frontend Implementation Plan

## Overview

This plan wires the new floor plan data into the existing map editor and zone system.

Two concrete things change for the user:
1. **Before drawing zones**, the user sets the real-world floor size in cm (e.g. 1200 cm × 800 cm).
   The canvas then locks its aspect ratio to match those proportions so that the map
   is always a true-to-scale representation of the room shape.
2. **When creating or editing a zone**, the user can enter the real-world width and depth
   of that shelf or area in cm. These are stored alongside the percentage coordinates.

The percentage coordinate system (`xPct`, `yPct`, `widthPct`, `heightPct`) is unchanged.
`widthCm` / `depthCm` on a zone are purely informational real-world measurements, not
derived from the canvas — they are entered manually.

Related backend plan: `apps/backend/docs/under_development/FLOOR_PLAN_BACKEND_PLAN.md`

---

## Existing files to be aware of

| File | Role |
|------|------|
| `src/features/analytics/types/analytics.types.ts` | All domain types |
| `src/features/analytics/stores/floor-map.store.ts` | Zustand store for map state |
| `src/features/analytics/flows/use-floor-map.flow.ts` | Loads zones, manages stage size |
| `src/features/analytics/flows/use-zone-editor.flow.ts` | Zone draw/move/rename/delete logic |
| `src/features/analytics/apis/list-zones.api.ts` | `GET /zones` |
| `src/features/analytics/apis/create-zone.api.ts` | `POST /zones` |
| `src/features/analytics/apis/update-zone.api.ts` | `PATCH /zones/:id` |

---

## Part A — Types

**File:** `src/features/analytics/types/analytics.types.ts`

### A1 — Add `FloorPlan` type

```typescript
export type FloorPlan = {
  id: string;
  name: string;
  widthCm: number;
  depthCm: number;
  sortOrder: number;
};
```

### A2 — Update `StoreZone` type

Add three optional fields:

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
  floorPlanId: string | null;   // ADD
  widthCm: number | null;       // ADD
  depthCm: number | null;       // ADD
};
```

### A3 — Update `CreateStoreZoneInput`

```typescript
export type CreateStoreZoneInput = Omit<StoreZone, "id">;
```

This already inherits the three new fields because `StoreZone` was updated.

### A4 — Update `UpdateStoreZoneInput`

```typescript
export type UpdateStoreZoneInput = Partial<Omit<StoreZone, "id">>;
```

Same — inherits automatically.

---

## Part B — New API Files

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
import type { FloorPlan } from "../types/analytics.types";

export type CreateFloorPlanInput = {
  name: string;
  widthCm: number;
  depthCm: number;
};

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
import type { FloorPlan } from "../types/analytics.types";

export type UpdateFloorPlanInput = Partial<{
  name: string;
  widthCm: number;
  depthCm: number;
}>;

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

## Part C — Store Changes

**File:** `src/features/analytics/stores/floor-map.store.ts`

### C1 — Add floor plan state

Add to the `FloorMapStoreState` interface:

```typescript
currentFloorPlan: FloorPlan | null;
floorPlans: FloorPlan[];
setCurrentFloorPlan: (plan: FloorPlan | null) => void;
setFloorPlans: (plans: FloorPlan[]) => void;
upsertFloorPlan: (plan: FloorPlan) => void;
removeFloorPlan: (id: string) => void;
```

Add to `initialState`:

```typescript
currentFloorPlan: null,
floorPlans: [],
```

Add setters to the store body:

```typescript
setCurrentFloorPlan: (currentFloorPlan) => set({ currentFloorPlan }),
setFloorPlans: (floorPlans) => set({ floorPlans }),
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

Add to `reset`:

```typescript
reset: () => set(initialState),
// initialState already covers currentFloorPlan: null, floorPlans: []
```

### C2 — Add selectors (at the bottom of the file)

```typescript
export const selectCurrentFloorPlan = (state: FloorMapStoreState) =>
  state.currentFloorPlan;
export const selectFloorPlans = (state: FloorMapStoreState) =>
  state.floorPlans;
```

---

## Part D — Update `use-floor-map.flow.ts`

**File:** `src/features/analytics/flows/use-floor-map.flow.ts`

This file currently loads zones and manages stage sizing. Update it to also load
floor plans and use the active floor plan's aspect ratio to size the canvas.

### D1 — Load floor plans on mount

```typescript
import { listZonesApi } from "../apis/list-zones.api";
import { listFloorPlansApi } from "../apis/list-floor-plans.api";
import { useFloorMapStore } from "../stores/floor-map.store";

export function useFloorMapFlow(
  containerRef: RefObject<HTMLDivElement | null>,
  resizeKey?: unknown,
) {
  const store = useFloorMapStore();
  const setZones = useFloorMapStore((state) => state.setZones);
  const setStageSize = useFloorMapStore((state) => state.setStageSize);
  const setFloorPlans = useFloorMapStore((state) => state.setFloorPlans);
  const setCurrentFloorPlan = useFloorMapStore(
    (state) => state.setCurrentFloorPlan,
  );
  const currentFloorPlan = useFloorMapStore((state) => state.currentFloorPlan);

  useEffect(() => {
    let isDisposed = false;

    const load = async () => {
      const [zones, plans] = await Promise.all([
        listZonesApi(),
        listFloorPlansApi(),
      ]);

      if (isDisposed) return;

      setZones(zones);
      setFloorPlans(plans);

      // Auto-select the first floor plan if none is active
      if (plans.length > 0 && !currentFloorPlan) {
        setCurrentFloorPlan(plans[0]);
      }
    };

    void load();
    return () => { isDisposed = true; };
  }, [setZones, setFloorPlans, setCurrentFloorPlan]); // do NOT include currentFloorPlan
```

### D2 — Compute stage height from floor plan aspect ratio

Replace the existing `resizeStage` function with:

```typescript
  useEffect(() => {
    const resizeStage = () => {
      const container = containerRef.current;
      const nextWidth = container?.offsetWidth;
      if (!nextWidth) return;

      // If a floor plan with real dimensions is active, lock aspect ratio
      const plan = useFloorMapStore.getState().currentFloorPlan;
      const nextHeight =
        plan && plan.widthCm > 0
          ? Math.round(nextWidth * (plan.depthCm / plan.widthCm))
          : Math.max(nextWidth * 0.6, container?.offsetHeight ?? 0);

      setStageSize(nextWidth, nextHeight);
    };

    resizeStage();
    window.addEventListener("resize", resizeStage);
    return () => window.removeEventListener("resize", resizeStage);
  }, [containerRef, resizeKey, setStageSize, currentFloorPlan]);
  // currentFloorPlan in deps so stage re-sizes when the plan changes
```

---

## Part E — Update `use-zone-editor.flow.ts`

**File:** `src/features/analytics/flows/use-zone-editor.flow.ts`

### E1 — Pass `widthCm` and `depthCm` when committing a draft zone

The current `commitDraftZone` uses `window.prompt` for label and type. Extend the
same pattern for the two new dimension fields, OR (preferred) replace with a proper
modal form (see Part F).

If using the prompt approach as a stopgap:

```typescript
const commitDraftZone = useCallback(async () => {
  const draft = useFloorMapStore.getState().draftZonePx;
  dragStartRef.current = null;
  setDraftZonePx(null);

  if (!draft || draft.width < 16 || draft.height < 16) return;

  const label = window.prompt("Zone label");
  if (!label?.trim()) return;

  const zoneTypeInput = window.prompt('Zone type: "zone" or "corridor"', "zone");
  const type: StoreZoneType =
    zoneTypeInput?.trim().toLowerCase() === "corridor" ? "corridor" : "zone";

  const widthCmRaw = window.prompt("Physical width in cm (optional, press Enter to skip)");
  const depthCmRaw = window.prompt("Physical depth in cm (optional, press Enter to skip)");

  const widthCm = widthCmRaw && !isNaN(Number(widthCmRaw))
    ? Number(widthCmRaw)
    : null;
  const depthCm = depthCmRaw && !isNaN(Number(depthCmRaw))
    ? Number(depthCmRaw)
    : null;

  const currentFloorPlan = useFloorMapStore.getState().currentFloorPlan;

  const payload: CreateStoreZoneInput = {
    label: label.trim(),
    type,
    xPct: pxToPct(draft.x, stageWidth),
    yPct: pxToPct(draft.y, stageHeight),
    widthPct: pxToPct(draft.width, stageWidth),
    heightPct: pxToPct(draft.height, stageHeight),
    sortOrder: zones.length,
    floorPlanId: currentFloorPlan?.id ?? null,
    widthCm,
    depthCm,
  };

  const createdZone = await createZoneApi(payload);
  upsertZone(createdZone);
}, [setDraftZonePx, stageHeight, stageWidth, upsertZone, zones.length]);
```

### E2 — Add `saveZoneDimensions` method

Add a new method to the returned object from `useZoneEditorFlow`:

```typescript
const saveZoneDimensions = useCallback(
  async (
    zone: StoreZone,
    widthCm: number | null,
    depthCm: number | null,
  ) => {
    await updateZoneApi(zone.id, { widthCm, depthCm });
    upsertZone({ ...zone, widthCm, depthCm });
  },
  [upsertZone],
);

// Add to the return object:
return {
  ...,
  saveZoneDimensions,
};
```

---

## Part F — New UI Components

### F1 — `FloorPlanSettingsPanel`

**File:** `src/features/analytics/components/FloorPlanSettingsPanel.tsx`

This panel is shown in the editor when the user wants to set or change floor dimensions.
It renders:
- A form with `name`, `widthCm`, `depthCm` number inputs
- A "Save" button that calls `createFloorPlanApi` (if no plan exists) or
  `updateFloorPlanApi` (if one is already active)
- Current floor plan info displayed above the form

```tsx
import { useState } from "react";
import { createFloorPlanApi } from "../apis/create-floor-plan.api";
import { updateFloorPlanApi } from "../apis/update-floor-plan.api";
import { useFloorMapStore } from "../stores/floor-map.store";

export function FloorPlanSettingsPanel() {
  const currentFloorPlan = useFloorMapStore((s) => s.currentFloorPlan);
  const upsertFloorPlan = useFloorMapStore((s) => s.upsertFloorPlan);
  const setCurrentFloorPlan = useFloorMapStore((s) => s.setCurrentFloorPlan);

  const [name, setName] = useState(currentFloorPlan?.name ?? "Ground Floor");
  const [widthCm, setWidthCm] = useState(
    currentFloorPlan?.widthCm?.toString() ?? "",
  );
  const [depthCm, setDepthCm] = useState(
    currentFloorPlan?.depthCm?.toString() ?? "",
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const w = Number(widthCm);
    const d = Number(depthCm);
    if (!w || !d || w <= 0 || d <= 0) return;

    setSaving(true);
    try {
      if (currentFloorPlan) {
        const updated = await updateFloorPlanApi(currentFloorPlan.id, {
          name,
          widthCm: w,
          depthCm: d,
        });
        upsertFloorPlan(updated);
        setCurrentFloorPlan(updated);
      } else {
        const created = await createFloorPlanApi({
          name,
          widthCm: w,
          depthCm: d,
        });
        upsertFloorPlan(created);
        setCurrentFloorPlan(created);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Floor dimensions
      </p>

      {currentFloorPlan && (
        <p className="text-xs text-gray-400">
          Current: {currentFloorPlan.widthCm} cm × {currentFloorPlan.depthCm} cm
        </p>
      )}

      <div className="space-y-2">
        <label className="block text-xs text-gray-600">
          Floor name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            placeholder="Ground Floor"
          />
        </label>

        <div className="flex gap-2">
          <label className="flex-1 block text-xs text-gray-600">
            Width (cm)
            <input
              type="number"
              min={1}
              value={widthCm}
              onChange={(e) => setWidthCm(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="e.g. 1200"
            />
          </label>
          <label className="flex-1 block text-xs text-gray-600">
            Depth (cm)
            <input
              type="number"
              min={1}
              value={depthCm}
              onChange={(e) => setDepthCm(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              placeholder="e.g. 800"
            />
          </label>
        </div>
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save floor dimensions"}
      </button>
    </div>
  );
}
```

### F2 — `ZoneDimensionsForm`

**File:** `src/features/analytics/components/ZoneDimensionsForm.tsx`

A small inline form shown in the zone detail/edit panel to set physical dimensions
on an existing zone. It is used inside the zone editor sidebar or popup.

```tsx
import { useState } from "react";
import type { StoreZone } from "../types/analytics.types";

type Props = {
  zone: StoreZone;
  onSave: (widthCm: number | null, depthCm: number | null) => Promise<void>;
};

export function ZoneDimensionsForm({ zone, onSave }: Props) {
  const [widthCm, setWidthCm] = useState(zone.widthCm?.toString() ?? "");
  const [depthCm, setDepthCm] = useState(zone.depthCm?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const w = widthCm ? Number(widthCm) : null;
    const d = depthCm ? Number(depthCm) : null;
    setSaving(true);
    try {
      await onSave(w, d);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-gray-500">Physical size</p>
      <div className="flex gap-2">
        <label className="flex-1 text-xs text-gray-600">
          Width (cm)
          <input
            type="number"
            min={1}
            value={widthCm}
            onChange={(e) => setWidthCm(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            placeholder="e.g. 240"
          />
        </label>
        <label className="flex-1 text-xs text-gray-600">
          Depth (cm)
          <input
            type="number"
            min={1}
            value={depthCm}
            onChange={(e) => setDepthCm(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
            placeholder="e.g. 60"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save size"}
      </button>
    </div>
  );
}
```

### F3 — Scale indicator on the canvas

**File:** wherever `FloorMapCanvas` is rendered (find the file that uses `react-konva`
and renders `<Stage>` and the zone rectangles).

When a floor plan is active, render a small text overlay in the bottom-left corner
of the Konva stage showing the real-world scale:

```tsx
// Inside the Konva Layer, after rendering zones:
{currentFloorPlan && (
  <Text
    x={8}
    y={stageHeight - 20}
    text={`${currentFloorPlan.widthCm} cm × ${currentFloorPlan.depthCm} cm`}
    fontSize={11}
    fill="#94a3b8"
  />
)}
```

Import `Text` from `"react-konva"` and read `currentFloorPlan` from the floor map store.

### F4 — Where to place `FloorPlanSettingsPanel` and `ZoneDimensionsForm`

- `FloorPlanSettingsPanel` — add it inside the zone editor page/screen, in the
  sidebar or top settings area. It should be visible whenever `isEditorMode` is true.
  Suggested placement: above the zone list or in a collapsible "Floor settings" section.

- `ZoneDimensionsForm` — add it inside the existing zone detail popup or edit panel
  (wherever `renameZone` or `saveZoneLabel` is triggered). Wire the `onSave` prop to
  `saveZoneDimensions` from `useZoneEditorFlow`.

---

## Part G — `FloorMapCanvas` aspect ratio

**File:** wherever `FloorMapCanvas` is rendered.

The canvas `<Stage>` height is now controlled by the floor plan ratio (set in
`use-floor-map.flow.ts` Part D2). No change needed in the canvas component itself
as long as it reads `stageWidth` and `stageHeight` from `useFloorMapStore`. Those
values are already used to size the `<Stage>`. Confirm the canvas does this:

```tsx
const stageWidth = useFloorMapStore((s) => s.stageWidth);
const stageHeight = useFloorMapStore((s) => s.stageHeight);

// ...
<Stage width={stageWidth} height={stageHeight}>
```

If the canvas uses hardcoded dimensions anywhere, replace them with store values.

---

## Checklist

### Types
- [ ] A1 — Add `FloorPlan` type to `analytics.types.ts`
- [ ] A2 — Add `floorPlanId`, `widthCm`, `depthCm` to `StoreZone` type
- [ ] A3/A4 — `CreateStoreZoneInput` and `UpdateStoreZoneInput` inherit automatically (verify)

### API files
- [ ] B1 — Create `list-floor-plans.api.ts`
- [ ] B2 — Create `create-floor-plan.api.ts`
- [ ] B3 — Create `update-floor-plan.api.ts`
- [ ] B4 — Create `delete-floor-plan.api.ts`

### Store
- [ ] C1 — Add `currentFloorPlan`, `floorPlans`, setters to `floor-map.store.ts`
- [ ] C2 — Add `selectCurrentFloorPlan`, `selectFloorPlans` selectors

### Flows
- [ ] D1 — Load floor plans in `use-floor-map.flow.ts`, auto-select first plan
- [ ] D2 — Replace hardcoded aspect ratio with floor plan ratio in stage sizing
- [ ] E1 — Update `commitDraftZone` to include `floorPlanId`, `widthCm`, `depthCm`
- [ ] E2 — Add `saveZoneDimensions` to `use-zone-editor.flow.ts`

### Components
- [ ] F1 — Create `FloorPlanSettingsPanel.tsx`
- [ ] F2 — Create `ZoneDimensionsForm.tsx`
- [ ] F3 — Add scale indicator text overlay to `FloorMapCanvas`
- [ ] F4 — Place `FloorPlanSettingsPanel` in editor view (visible when `isEditorMode`)
- [ ] F4 — Place `ZoneDimensionsForm` inside zone edit panel, wired to `saveZoneDimensions`
- [ ] G — Confirm `<Stage>` uses `stageWidth`/`stageHeight` from store (not hardcoded)
