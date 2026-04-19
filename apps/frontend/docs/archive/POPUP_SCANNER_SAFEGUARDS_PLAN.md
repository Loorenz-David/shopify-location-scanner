# POPUP SYSTEM & SCANNER PLACEMENT SAFEGUARDS — TWO-PHASE PLAN

## Summary

Two sequential phases:

1. **Phase 1** — Add a generic shell-level popup mechanism (dark backdrop, white container,
   children-driven content) parallel to the existing overlay and full-feature systems. Exposes
   `homeShellActions.popupFeaturePage(pageId)` and `homeShellActions.closePopupPage()`.

2. **Phase 2** — Wire two scanner placement safeguards that use the popup:
   - **2a** (isItemFixed check): after a location is scanned, if the item has `fixItem=true &&
isItemFixed=false` and the scanned zone is NOT `for_fixing`, show a popup asking "Has this
     item been fixed?". Yes → `POST /logistic/item-is-fix` (optimistic update) then proceed with
     placement. No → close popup only.
   - **2b** (zone mismatch): if the item's intention maps to a different zone than the scanned
     location, show a warning popup. Confirm → proceed with placement. Cancel → discard scan.

Both safeguards share the same `pendingPlacementMatch` held in
`scanner-logistic-placement.store.ts`. Check order on every scan: zone mismatch (2b) first, then
isItemFixed (2a), then direct placement.

---

## Feature Location Map

```
Phase 1 — shell popup system
  apps/frontend/src/features/home/
    types/home-shell.types.ts                 ← add PopupPageId type
    stores/home-shell.store.ts                ← add popup state + actions
    controllers/home-shell.controller.ts      ← add openPopup / closePopup controllers
    actions/home-shell.actions.ts             ← add popupFeaturePage / closePopupPage actions
    ui/
      PopupContainer.tsx                      ← new: dark backdrop + white container
      HomeLayout.tsx                          ← add isPopupOpen + popupContent props
    HomeFeature.tsx                           ← wire popup state + PopupHost slot

Phase 2 — scanner safeguards
  apps/frontend/src/features/logistic-locations/
    domain/logistic-locations.domain.ts       ← add zone-intention domain functions

  apps/frontend/src/features/scanner/
    stores/scanner-logistic-placement.store.ts ← add pendingPlacementMatch field

  apps/frontend/src/features/logistic-tasks/
    api/mark-item-fixed.api.ts                ← new: POST /logistic/item-is-fix
    actions/logistic-tasks.actions.ts         ← add markItemFixed + confirmPendingPlacement
                                                 + cancelPendingPlacement

  apps/frontend/src/features/home/
    HomeFeature.tsx                           ← add PlacementPopupHost slot inside popupContent

  apps/frontend/src/features/scanner/ui/
    ScannerLogisticPlacementPage.tsx          ← add guard checks in handleDecode + handleConfirmLocation
    PlacementItemFixedPopup.tsx               ← new popup content component
    PlacementZoneMismatchPopup.tsx            ← new popup content component
```

---

## Phase 1: Shell Popup System

### 1.1 — `types/home-shell.types.ts`

Add the `PopupPageId` type alongside the existing `OverlayPageId`:

```typescript
export type PopupPageId =
  | "placement-item-fixed-check"
  | "placement-zone-mismatch"
  | (string & {});
```

### 1.2 — `stores/home-shell.store.ts`

Add popup fields to `HomeShellStoreState`:

```typescript
interface HomeShellStoreState {
  // ... existing fields ...
  popupPageId: PopupPageId | null;
  isPopupOpen: boolean;
  openPopup: (pageId: PopupPageId) => void;
  closePopup: () => void;
}
```

In `initialState`:

```typescript
popupPageId: null,
isPopupOpen: false,
```

Store actions (inside the `create` call):

```typescript
openPopup: (pageId) => {
  set({ isPopupOpen: true, popupPageId: pageId });
},
closePopup: () => {
  set({ isPopupOpen: false, popupPageId: null });
},
```

Add two selectors at the bottom of the file:

```typescript
export const selectHomeShellIsPopupOpen = (state: HomeShellStoreState) =>
  state.isPopupOpen;
export const selectHomeShellPopupPageId = (state: HomeShellStoreState) =>
  state.popupPageId;
```

### 1.3 — `controllers/home-shell.controller.ts`

Add two controller functions after `closeFullFeaturePageController`:

```typescript
export function openPopupPageController(pageId: PopupPageId): void {
  useHomeShellStore.getState().openPopup(pageId);
}

export function closePopupPageController(): void {
  useHomeShellStore.getState().closePopup();
}
```

Import `PopupPageId` from `home-shell.types`.

### 1.4 — `actions/home-shell.actions.ts`

Import the two new controllers and add the actions:

```typescript
import {
  // ... existing imports ...
  openPopupPageController,
  closePopupPageController,
} from "../controllers/home-shell.controller";

export const homeShellActions = {
  // ... existing actions ...
  popupFeaturePage(pageId: PopupPageId): void {
    openPopupPageController(pageId);
  },
  closePopupPage(): void {
    closePopupPageController();
  },
};
```

Import `PopupPageId` from `home-shell.types`.

### 1.5 — `ui/PopupContainer.tsx` (new file)

```
apps/frontend/src/features/home/ui/PopupContainer.tsx
```

```tsx
import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

interface PopupContainerProps {
  isOpen: boolean;
  children?: ReactNode;
}

export function PopupContainer({ isOpen, children }: PopupContainerProps) {
  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center pb-6 px-4"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          role="dialog"
          aria-modal="true"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {/* Dark backdrop */}
          <motion.div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* White container */}
          <motion.div
            className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-2xl"
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
```

Notes:

- `z-[60]` sits above `FullFeatureOverlayContainer` (`z-50`) so it appears over the scanner page.
- The backdrop click does NOT close the popup (user must choose Yes/No/Confirm/Cancel explicitly).
- Inner white container slides up from the bottom.

### 1.6 — `ui/HomeLayout.tsx`

Add two props and render `PopupContainer`:

```typescript
interface HomeLayoutProps {
  // ... existing props ...
  isPopupOpen: boolean;
  popupContent?: ReactNode;
}

export function HomeLayout({
  // ... existing destructured props ...
  isPopupOpen,
  popupContent,
}: HomeLayoutProps) {
  return (
    <main className="...">
      <PageOutlet ... />
      <BottomNav ... />
      <SlidingOverlayContainer ...>{overlayContent}</SlidingOverlayContainer>
      <FullFeatureOverlayContainer ... />
      <PopupContainer isOpen={isPopupOpen}>
        {popupContent}
      </PopupContainer>
    </main>
  );
}
```

Import `PopupContainer` from `./PopupContainer`.

### 1.7 — `HomeFeature.tsx`

Read popup state and wire `popupContent`:

```typescript
const isPopupOpen = useHomeShellStore(selectHomeShellIsPopupOpen);
const popupPageId = useHomeShellStore(selectHomeShellPopupPageId);
```

Pass to `HomeLayout`:

```typescript
<HomeLayout
  // ... existing props ...
  isPopupOpen={isPopupOpen}
  popupContent={
    <>
      {/* Phase 3 will add PlacementPopupHost here */}
    </>
  }
/>
```

Import `selectHomeShellIsPopupOpen` and `selectHomeShellPopupPageId`.

At this point Phase 1 is complete. The popup opens/closes but renders no content yet — that
comes in Phase 2.

---

## Phase 2: Scanner Placement Safeguards

### 2.1 — Domain: `logistic-locations/domain/logistic-locations.domain.ts`

Add two pure functions at the bottom of the existing file:

```typescript
import type { LogisticIntention } from "../../logistic-tasks/types/logistic-tasks.types";

/**
 * Returns the primary expected zone for a given intention.
 * Returns null if there is no zone restriction (e.g. customer_took_it).
 */
export function getExpectedZoneForIntention(
  intention: LogisticIntention | null,
): LogisticZoneType | null {
  if (!intention) return null;
  const map: Partial<Record<LogisticIntention, LogisticZoneType>> = {
    local_delivery: "for_delivery",
    international_shipping: "for_delivery",
    store_pickup: "for_pickup",
  };
  return map[intention] ?? null;
}

/**
 * Returns true when the scanned zone does not match the item's intention.
 * for_fixing is always allowed regardless of intention.
 */
export function hasPlacementZoneMismatch(
  intention: LogisticIntention | null,
  zoneType: LogisticZoneType,
): boolean {
  if (zoneType === "for_fixing") return false;
  const expected = getExpectedZoneForIntention(intention);
  if (expected === null) return false;
  return zoneType !== expected;
}
```

No imports change in the existing code that uses this file.

### 2.2 — `scanner/stores/scanner-logistic-placement.store.ts`

Add `pendingPlacementMatch` to hold the location that is awaiting popup confirmation:

```typescript
interface ScannerLogisticPlacementStoreState {
  // ... existing fields ...
  pendingPlacementMatch: LogisticLocationRecord | null;
  setPendingPlacementMatch: (match: LogisticLocationRecord | null) => void;
}

// In initialState:
pendingPlacementMatch: null,

// In store actions:
setPendingPlacementMatch: (match) => {
  set({ pendingPlacementMatch: match });
},

// Update reset() to clear it:
reset: () => {
  set(initialState);
},
```

Import `LogisticLocationRecord` from the logistic-locations types.

### 2.3 — `logistic-tasks/api/mark-item-fixed.api.ts` (new file)

```
apps/frontend/src/features/logistic-tasks/api/mark-item-fixed.api.ts
```

```typescript
import { apiClient } from "../../../shared/api/api-client";

export async function markItemFixedApi(input: {
  scanHistoryId: string;
}): Promise<void> {
  await apiClient.post("/logistic/item-is-fix", {
    scanHistoryId: input.scanHistoryId,
  });
}
```

### 2.4 — `logistic-tasks/actions/logistic-tasks.actions.ts`

Add three new actions:

```typescript
import { markItemFixedApi } from "../api/mark-item-fixed.api";
import { useScannerLogisticPlacementStore } from "../../scanner/stores/scanner-logistic-placement.store";
import { homeShellActions } from "../../home/actions/home-shell.actions";

export const logisticTasksActions = {
  // ... existing actions ...

  /**
   * Marks an item as fixed (isItemFixed = true).
   * Optimistically updates the store. On error, rolls back and shows toast.
   * After marking, proceeds with the pending placement if provided.
   */
  async markItemFixed(scanHistoryId: string): Promise<void> {
    // Optimistic update
    const existing = useLogisticTasksStore
      .getState()
      .items.find((i) => i.id === scanHistoryId);
    if (existing) {
      useLogisticTasksStore
        .getState()
        .upsertItem({ ...existing, isItemFixed: true });
    }

    try {
      await markItemFixedApi({ scanHistoryId });
    } catch {
      // Rollback
      if (existing) {
        useLogisticTasksStore.getState().upsertItem(existing);
      }
      useLogisticTasksStore
        .getState()
        .finishWithError("Unable to mark item as fixed. Please try again.");
    }
  },

  /**
   * Confirms the pending placement (after popup confirmation).
   * Proceeds with markPlacement using the stored pendingPlacementMatch.
   * Clears pending state and closes the popup.
   */
  async confirmPendingPlacement(): Promise<void> {
    const { scanHistoryId, pendingPlacementMatch } =
      useScannerLogisticPlacementStore.getState();

    homeShellActions.closePopupPage();
    useScannerLogisticPlacementStore.getState().setPendingPlacementMatch(null);

    if (!scanHistoryId || !pendingPlacementMatch) return;

    const prev = optimisticMarkPlacement(scanHistoryId, pendingPlacementMatch);

    useScannerLogisticPlacementStore
      .getState()
      .setConfirmedLocation(
        pendingPlacementMatch.id,
        pendingPlacementMatch.location,
      );

    try {
      await markPlacementApi({
        scanHistoryId,
        logisticLocationId: pendingPlacementMatch.id,
      });
    } catch {
      if (prev) {
        useLogisticTasksStore.getState().upsertItem(prev);
      }
      useScannerLogisticPlacementStore
        .getState()
        .setConfirmedLocation(null, null);
    }
  },

  /**
   * Cancels the pending placement (user pressed Cancel/No in popup).
   * Clears pending state and closes the popup.
   */
  cancelPendingPlacement(): void {
    homeShellActions.closePopupPage();
    useScannerLogisticPlacementStore.getState().setPendingPlacementMatch(null);
  },
};
```

> Note: `optimisticMarkPlacement` is already imported in this file from
> `../controllers/logistic-tasks-optimistic.controller`. `markPlacementApi` is already imported.

### 2.5 — `scanner/ui/PlacementZoneMismatchPopup.tsx` (new file)

```
apps/frontend/src/features/scanner/ui/PlacementZoneMismatchPopup.tsx
```

Rendered inside `PopupContainer` when `popupPageId === "placement-zone-mismatch"`.
Reads context from `useScannerLogisticPlacementStore` and `useLogisticTasksStore`.

```tsx
import { useScannerLogisticPlacementStore } from "../stores/scanner-logistic-placement.store";
import { useLogisticTasksStore } from "../../logistic-tasks/stores/logistic-tasks.store";
import { logisticTasksActions } from "../../logistic-tasks/actions/logistic-tasks.actions";
import { LOGISTIC_INTENTION_LABELS } from "../../logistic-tasks/domain/logistic-tasks.domain";
import { LOGISTIC_ZONE_TYPE_LABELS } from "../../logistic-locations/domain/logistic-locations.domain";

export function PlacementZoneMismatchPopup() {
  const scanHistoryId = useScannerLogisticPlacementStore(
    (s) => s.scanHistoryId,
  );
  const pendingMatch = useScannerLogisticPlacementStore(
    (s) => s.pendingPlacementMatch,
  );
  const item = useLogisticTasksStore(
    (s) => s.items.find((i) => i.id === scanHistoryId) ?? null,
  );

  if (!item || !pendingMatch) return null;

  const intentionLabel = item.intention
    ? LOGISTIC_INTENTION_LABELS[item.intention]
    : "Unknown intention";
  const zoneLabel = LOGISTIC_ZONE_TYPE_LABELS[pendingMatch.zoneType];

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <p className="text-base font-bold text-slate-900">Wrong zone?</p>
        <p className="text-sm text-slate-600">
          This item is marked as{" "}
          <span className="font-semibold text-slate-800">{intentionLabel}</span>{" "}
          but you scanned a{" "}
          <span className="font-semibold text-slate-800">{zoneLabel}</span>{" "}
          location.
        </p>
        <p className="text-sm text-slate-500">
          Do you want to place it here anyway?
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white active:bg-slate-800"
          onClick={() => void logisticTasksActions.confirmPendingPlacement()}
        >
          Confirm — Place Here
        </button>
        <button
          type="button"
          className="w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 active:bg-slate-200"
          onClick={() => logisticTasksActions.cancelPendingPlacement()}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
```

### 2.6 — `scanner/ui/PlacementItemFixedPopup.tsx` (new file)

```
apps/frontend/src/features/scanner/ui/PlacementItemFixedPopup.tsx
```

Rendered inside `PopupContainer` when `popupPageId === "placement-item-fixed-check"`.

```tsx
import { useScannerLogisticPlacementStore } from "../stores/scanner-logistic-placement.store";
import { logisticTasksActions } from "../../logistic-tasks/actions/logistic-tasks.actions";

export function PlacementItemFixedPopup() {
  const scanHistoryId = useScannerLogisticPlacementStore(
    (s) => s.scanHistoryId,
  );

  if (!scanHistoryId) return null;

  const handleYes = async () => {
    await logisticTasksActions.markItemFixed(scanHistoryId);
    await logisticTasksActions.confirmPendingPlacement();
  };

  const handleNo = async () => {
    await logisticTasksActions.confirmPendingPlacement();
  };

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex flex-col gap-1">
        <p className="text-base font-bold text-slate-900">
          Has this item been fixed?
        </p>
        <p className="text-sm text-slate-500">
          This item was marked as requiring a fix. Let us know before placing
          it.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white active:bg-emerald-700"
          onClick={() => void handleYes()}
        >
          Yes — Mark as Fixed & Place
        </button>
        <button
          type="button"
          className="w-full rounded-xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 active:bg-slate-200"
          onClick={() => void handleNo()}
        >
          No — Place Without Fixing
        </button>
      </div>
    </div>
  );
}
```

### 2.7 — `HomeFeature.tsx` — wire popup content

Import the two popup components and render them inside the `popupContent` slot:

```typescript
import { PlacementItemFixedPopup } from "../scanner/ui/PlacementItemFixedPopup";
import { PlacementZoneMismatchPopup } from "../scanner/ui/PlacementZoneMismatchPopup";
```

In the JSX, update `popupContent`:

```tsx
popupContent={
  <>
    {popupPageId === "placement-item-fixed-check" && <PlacementItemFixedPopup />}
    {popupPageId === "placement-zone-mismatch" && <PlacementZoneMismatchPopup />}
  </>
}
```

### 2.8 — `scanner/ui/ScannerLogisticPlacementPage.tsx` — add guards

**Import additions:**

```typescript
import { hasPlacementZoneMismatch } from "../../logistic-locations/domain/logistic-locations.domain";
import { useLogisticTasksStore } from "../../logistic-tasks/stores/logistic-tasks.store";
import { homeShellActions } from "../../home/actions/home-shell.actions";
```

**Inside the component**, read the current task item:

```typescript
const item = useLogisticTasksStore(
  (s) => s.items.find((i) => i.id === scanHistoryId) ?? null,
);
```

**Replace `handleConfirmLocation`** with a guarded version:

```typescript
const handleConfirmLocation = (match: LogisticLocationRecord) => {
  if (!scanHistoryId) return;

  useScannerLogisticPlacementStore.getState().setWarning(null);

  // --- Phase 3b: Zone mismatch guard ---
  if (item && hasPlacementZoneMismatch(item.intention, match.zoneType)) {
    useScannerLogisticPlacementStore.getState().setPendingPlacementMatch(match);
    homeShellActions.popupFeaturePage("placement-zone-mismatch");
    return;
  }

  // --- Phase 3a: isItemFixed guard ---
  if (
    item &&
    item.fixItem === true &&
    item.isItemFixed === false &&
    match.zoneType !== "for_fixing"
  ) {
    useScannerLogisticPlacementStore.getState().setPendingPlacementMatch(match);
    homeShellActions.popupFeaturePage("placement-item-fixed-check");
    return;
  }

  // No guards triggered — place immediately
  useScannerLogisticPlacementStore
    .getState()
    .setConfirmedLocation(match.id, match.location);
  void logisticTasksActions.markPlacement(scanHistoryId, match.id);
};
```

`handleDecode` is unchanged — it calls `handleConfirmLocation(match)` after lookup, so it
automatically benefits from the guards.

---

## Data / State Lifecycle

```
Scan event arrives in ScannerLogisticPlacementPage
  → handleDecode(value)
  → findLocationByValue(locations, value)
  → if no match: setWarning (unchanged)

  → handleConfirmLocation(match)
  → [2b] hasPlacementZoneMismatch(item.intention, match.zoneType)?
      YES → setPendingPlacementMatch(match)
           → homeShellActions.popupFeaturePage("placement-zone-mismatch")
           → PopupContainer animates open over scanner
           → PlacementZoneMismatchPopup renders (reads store for context)
           → User clicks "Confirm":
               → logisticTasksActions.confirmPendingPlacement()
               → closePopupPage()
               → clearPendingMatch
               → optimisticMarkPlacement() → setConfirmedLocation()
               → POST /logistic/placements
           → User clicks "Cancel":
               → logisticTasksActions.cancelPendingPlacement()
               → closePopupPage()
               → clearPendingMatch
               → scanner resumes (no state change)

  → [2a] fixItem=true && isItemFixed=false && zone !== for_fixing?
      YES → setPendingPlacementMatch(match)
           → homeShellActions.popupFeaturePage("placement-item-fixed-check")
           → PlacementItemFixedPopup renders
           → User clicks "Yes (mark fixed & place)":
               → logisticTasksActions.markItemFixed(scanHistoryId)
               → optimistic: store.upsertItem({ ...item, isItemFixed: true })
               → POST /logistic/item-is-fix
               → logisticTasksActions.confirmPendingPlacement()
               → placement proceeds
           → User clicks "No (place without fixing)":
               → logisticTasksActions.confirmPendingPlacement()
               → placement proceeds (isItemFixed stays false)

  → No guards triggered:
      → setConfirmedLocation(match.id, match.location)
      → markPlacement(scanHistoryId, match.id) [existing path, unchanged]
```

---

## Risk Register

| Risk                                                                       | Mitigation                                                                                              |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Both guards trigger for the same scan                                      | Checked in order: 3b first, 3a second. Each returns early, so only one popup ever opens per scan.       |
| `item` is null in ScannerLogisticPlacementPage (not in store)              | If `item` is null, all guards are skipped and placement proceeds directly — safe default.               |
| `pendingPlacementMatch` is stale if user closes scanner without responding | `useScannerLogisticPlacementStore.reset()` is called by `closePlacementScanner` — clears pending match. |
| `markItemFixed` API fails after optimistic update                          | Optimistic rollback restores `isItemFixed: false` in store + `finishWithError` shows error message.     |
| `confirmPendingPlacement` called when `pendingPlacementMatch` is null      | Guard at top of action: returns early if null — no crash.                                               |
| Popup `z-index` conflicts with scanner camera layer                        | `PopupContainer` uses `z-[60]`, above `FullFeatureOverlayContainer` at `z-50`.                          |
| Phase 3 popup uses `popupPageId` but it is null                            | Both popup components guard with `if (!scanHistoryId) return null` — renders nothing safely.            |
