# Unified Scanner Feature — Implementation Plan

**Status:** READY FOR CODEX  
**Location:** `apps/frontend/src/features/unified-scanner/`  
**Scope:** New feature. The existing `scanner/` and `logistic-tasks/` placement scanner are left untouched, with one additive exception: `camera-session.manager.ts` gains a new session entry (see §existing-file-change).

---

## 1. Goal

A single scanner launched from the BottomNav that handles both shop-location linking and logistic placement:

1. User scans (or searches) an item → enriched Shopify SKU endpoint → mode resolved from item data.
2. Location step activates in the correct mode (shop or logistic).
3. Warning rules evaluated before placement is confirmed.
4. Correct placement API called per mode.
5. Post-placement UX mirrors each existing scanner's own behaviour.

---

## 2. Architecture Principles

- **SRP per file**: one use-case, one rule, one domain concept per file.
- **Dependency direction**: `ui → controllers / flows → domain / api → types`. No upward deps.
- **Three explicit extension points** — add a new entry with zero changes to existing files:
  1. **Item classification rules** (`domain/item-mode-rules/`) — determine `LocationScannerMode` from the item.
  2. **Location scanner modes** — each mode resolves locations from a different store + calls a different placement API.
  3. **Location warning rules** (`domain/warning-rules/`) — ordered checks run before confirming placement.
- **Isolation**: owns its own Zustand store, actions, and popup page IDs. Reads shared stores (logistic-locations, location-options) as read-only.
- **Single item API**: both barcode scan and manual search use the same endpoint and the same response mapper — no shape divergence.
- **Local manual input panels**: manual input overlays are managed by local state in `UnifiedScannerPage` (same pattern as the logistic scanner) — no home shell overlay registration required.
- **No duplication**: reuses existing domain functions, API callers, and UI atoms by importing — does not copy them.

---

## 3. Existing File Change — `camera-session.manager.ts` §existing-file-change

This is the **only modification** to an existing file. It is strictly additive and non-breaking.

In `apps/frontend/src/features/scanner/domain/camera-session.manager.ts`, add `"unified-scanner"` to:

```typescript
// 1. The CameraSessionId union type
export type CameraSessionId = "main-scanner" | "logistic-placement" | "unified-scanner";

// 2. The CAMERA_REGION_IDS record
export const CAMERA_REGION_IDS: Record<CameraSessionId, string> = {
  "main-scanner": "scanner-qr-reader",
  "logistic-placement": "logistic-placement-qr-reader",
  "unified-scanner": "unified-scanner-qr-reader",
};

// 3. The SESSION_IDS array
const SESSION_IDS: CameraSessionId[] = ["main-scanner", "logistic-placement", "unified-scanner"];

// 4. The sessions record initialiser
const sessions: Record<CameraSessionId, CameraSession> = {
  "main-scanner": makeSession("main-scanner"),
  "logistic-placement": makeSession("logistic-placement"),
  "unified-scanner": makeSession("unified-scanner"),
};
```

No other changes to this file.

---

## 4. Directory Structure

```
apps/frontend/src/features/unified-scanner/
│
├── UnifiedScannerFeature.tsx
│
├── types/
│   └── unified-scanner.types.ts
│
├── api/
│   └── search-unified-items.api.ts      ← enriched /shopify/items/by-sku (barcode scan + manual search)
│
├── domain/
│   ├── item-mode.domain.ts              ← resolveLocationScannerMode(item) → mode
│   ├── item-mode-rules/
│   │   └── sold-item.rule.ts            ← item.isSold → "logistic"
│   ├── resolve-location.domain.ts       ← mode-aware barcode → ResolvedLocation
│   ├── warning-rules.domain.ts          ← evaluateLocationWarnings(item, location) → sorted []
│   └── warning-rules/
│       ├── fix-check.rule.ts            ← priority 1
│       └── zone-mismatch.rule.ts        ← priority 2
│
├── stores/
│   └── unified-scanner.store.ts
│
├── actions/
│   └── unified-scanner.actions.ts
│
├── controllers/
│   ├── item.controller.ts               ← lookupItemByValueController + applyItemController
│   ├── location.controller.ts           ← applyLocationByValueController + applyResolvedLocationController
│   └── placement.controller.ts          ← mode-aware API call + optimistic update
│
├── flows/
│   └── use-unified-scanner-camera.flow.ts   ← new implementation using attachDecodeSession
│
├── providers/
│   └── UnifiedScannerProvider.tsx
│
├── context/
│   ├── unified-scanner-context.ts
│   └── unified-scanner.context.tsx
│
└── ui/
    ├── UnifiedScannerPage.tsx                ← main container + slide motion + camera region div
    ├── UnifiedItemScanPage.tsx               ← item step (no camera div)
    ├── UnifiedLocationScanPage.tsx           ← location step (no camera div)
    ├── UnifiedItemManualInputPanel.tsx        ← debounced search via searchUnifiedItemsApi
    ├── UnifiedLocationManualInputPanel.tsx    ← mode-aware: shop options or logistic locations
    ├── UnifiedLogisticSuccessState.tsx        ← placed overlay for logistic mode
    ├── UnifiedFixCheckPopup.tsx               ← popup page "unified-scanner-fix-check"
    └── UnifiedZoneMismatchPopup.tsx           ← popup page "unified-scanner-zone-mismatch"
```

**Import from existing features (do not copy):**

| What | From |
|---|---|
| `ScannerGuideOverlay` | `scanner/ui/ScannerGuideOverlay` |
| `FrozenFrameCanvas` | `scanner/ui/FrozenFrameCanvas` |
| `DecodedTextPanel` | `scanner/ui/DecodedTextPanel` |
| `ScannerActionsOverlay` | `scanner/ui/ScannerActionsOverlay` |
| `CAMERA_REGION_IDS`, `attachDecodeSession` | `scanner/domain/camera-session.manager` |
| `useCameraPrewarm` | `scanner/flows/use-camera-prewarm` |
| `getScannerGuideRect`, `SCANNER_GUIDE_DEFAULT_ROI_PADDING_PX` | `scanner/domain/scanner-guide.domain` |
| `buildItemFromScannedValue` | `scanner/domain/scanner-decoder.domain` |
| `saveScannerOnScanAskSetting`, `loadScannerOnScanAskSetting` | `scanner/domain/scanner-settings.domain` |
| `hasPlacementZoneMismatch` | `logistic-locations/domain/logistic-locations.domain` |
| `filterLogisticLocations`, `findLocationByValue` | `logistic-locations/domain/logistic-locations.domain` |
| `markPlacementApi` | `logistic-tasks/api/mark-placement.api` |
| `markItemFixedApi` | `logistic-tasks/api/mark-item-fixed.api` |
| `optimisticMarkPlacement` | `logistic-tasks/controllers/logistic-tasks-optimistic.controller` |
| `useLogisticTasksStore` | `logistic-tasks/stores/logistic-tasks.store` |
| `linkItemPositionsApi` | `scanner/api/link-item-positions.api` |
| `itemScanHistoryActions` | `item-scan-history/actions/item-scan-history.actions` |
| `bootstrapLocationOptionsController` | `scanner/controllers/scanner.controller` |
| `useLogisticLocationsStore` | `logistic-locations/stores/logistic-locations.store` |
| `useLocationOptionsStore` | `scanner/stores/location-options.store` |
| `normalizeShopifyImageUrl` | `shopify/domain/shopify-image.domain` |
| `apiClient` | `core/api-client` |

---

## 5. Types (`types/unified-scanner.types.ts`)

```typescript
import type { ScannerItemIdType, ScannerLens } from "../scanner/types/scanner.types";
import type { LogisticIntention, LogisticZoneType } from "../logistic-tasks/types/logistic-tasks.types";

// ── Extension point 1: add new modes to this union ─────────────────────────
export type LocationScannerMode = "shop" | "logistic";

// ── Unified scanner item (built from enriched Shopify SKU response) ─────────
export interface UnifiedScannerItem {
  id: string;                       // scan history ID; "" when backend cannot resolve one
  idType: ScannerItemIdType;
  itemId: string;                   // Shopify product ID; raw scanned value for fallback items
  sku: string;
  imageUrl?: string;
  title?: string;
  currentPosition?: string;
  // logistic fields returned by the enriched endpoint:
  isSold: boolean;
  intention: LogisticIntention | null;
  fixItem: boolean;
  isItemFixed: boolean;
}

// ── Resolved location (discriminated by mode) ───────────────────────────────
export type ResolvedLocation =
  | { mode: "shop";     code: string; label: string }
  | { mode: "logistic"; id: string;   location: string; zoneType: LogisticZoneType };

// ── Warning system ──────────────────────────────────────────────────────────
// Extension point 3: add new warning types to this union
export type LocationWarningType = "fix-check" | "zone-mismatch";

// Maps warning type to popup page ID. Defined here so controllers stay clean.
export const UNIFIED_SCANNER_POPUP_IDS: Record<LocationWarningType, string> = {
  "fix-check": "unified-scanner-fix-check",
  "zone-mismatch": "unified-scanner-zone-mismatch",
};

export interface LocationWarning {
  type: LocationWarningType;
  priority: number;    // 1 = fix-check (shown first), 2 = zone-mismatch
}

export interface LocationWarningRule {
  type: LocationWarningType;
  priority: number;
  evaluate(item: UnifiedScannerItem, location: ResolvedLocation): boolean;
}

// Extension point 1 contract
export interface ItemModeRule {
  evaluate(item: UnifiedScannerItem): LocationScannerMode | null;
}

// ── Phase state machine ─────────────────────────────────────────────────────
export type UnifiedScannerPhase =
  | "scanning-item"
  | "item-confirmed"       // item decoded, onScanAsk=true: waiting for user tap to advance
  | "scanning-location"
  | "warning-pending"      // location decoded, warning popup is open
  | "placing"
  | "placed"
  | "error";

// ── Store state ─────────────────────────────────────────────────────────────
export interface UnifiedScannerStoreState {
  phase: UnifiedScannerPhase;
  selectedItem: UnifiedScannerItem | null;
  locationMode: LocationScannerMode | null;
  selectedLocation: ResolvedLocation | null;
  pendingLocation: ResolvedLocation | null;    // held during warning popup flow
  pendingWarnings: LocationWarning[];          // remaining warnings after activeWarning
  activeWarning: LocationWarning | null;
  requiresZoneMismatchAfterFixCheck: boolean;
  frozenFrameAt: string | null;
  isLookingUpItem: boolean;
  itemLookupError: string | null;
  locationWarningBanner: string | null;        // "Location X not recognised"
  lastPlacementError: string | null;
  canScanNext: boolean;                        // shop mode: true when placement starts
  flashEnabled: boolean;
  availableLenses: ScannerLens[];
  selectedLensId: string | null;
  onScanAsk: boolean;
}

// ── Context value (unified-scanner-context.ts) ──────────────────────────────
// This is the full interface that UnifiedScannerProvider assembles and
// UnifiedScannerPage + step pages consume. Codex must implement this exactly.
export interface UnifiedScannerPageContextValue {
  // Camera flow
  isCameraReady: boolean;
  cameraError: string | null;
  itemFrozenFrame: ScannerFrozenFrame | null;
  itemDecodedText: string | null;
  locationFrozenFrame: ScannerFrozenFrame | null;
  locationDecodedText: string | null;
  // Store
  phase: UnifiedScannerPhase;
  scannerStep: "item" | "location";       // derived from phase in provider
  selectedItem: UnifiedScannerItem | null;
  locationMode: LocationScannerMode | null;
  selectedLocation: ResolvedLocation | null;
  isLookingUpItem: boolean;
  itemLookupError: string | null;
  locationWarningBanner: string | null;
  lastPlacementError: string | null;
  canScanNext: boolean;
  flashEnabled: boolean;
  availableLenses: ScannerLens[];
  selectedLensId: string | null;
  onScanAsk: boolean;
  // Handlers (wired in provider; some combine store action + camera flow call)
  onBack: () => void;
  onToggleFlash: () => void;
  onSelectLens: (lensId: string) => void;
  onGoToLocationStep: () => void;         // phase "item-confirmed" → "scanning-location"
  onClearItemScan: () => void;            // clears item decoded state in camera flow
  onClearLocationScan: () => void;        // clears location decoded state in camera flow
  onScanNext: () => void;                 // shop mode: resetScannerVisualCycle() + store.resetCycle()
  onDismissItemError: () => void;
  onDismissLocationWarning: () => void;
  onDismissPlacementError: () => void;
  onToggleOnScanAsk: () => void;
}

// ── API DTO (owned by this feature; backend enriches /shopify/items/by-sku) ─
export interface UnifiedItemSearchResult {
  productId: string;
  imageUrl: string | null;    // null when item has no image; normalizeShopifyImageUrl handles null
  sku: string;
  title?: string;
  // logistic fields added by backend:
  id: string;                       // scan history ID ("" if no history record exists)
  isSold: boolean;
  intention: LogisticIntention | null;
  fixItem: boolean;
  isItemFixed: boolean;
  currentPosition: string | null;   // ScanHistory.latestLocation; null for Shopify fallback items
}

export interface UnifiedItemSearchResponse {
  items: UnifiedItemSearchResult[];
  count: number;
}
```

---

## 6. API Layer

### `api/search-unified-items.api.ts`

Single API file used by **both** barcode scan and manual search. Calls the same enriched Shopify SKU endpoint:

```
GET /shopify/items/by-sku?sku={query}
```

Uses `UnifiedItemSearchResponse` DTO (defined in types above). Maps each `UnifiedItemSearchResult` → `UnifiedScannerItem`:

- `result.productId` → `itemId`
- `"product_id"` → `idType`
- `result.id` → `id` (scan history ID)
- `result.sku` → `sku`
- `normalizeShopifyImageUrl(result.imageUrl, { width: 120, height: 120 })` → `imageUrl`
- `result.title` → `title`
- `result.currentPosition` → `currentPosition`
- `result.isSold`, `result.intention`, `result.fixItem`, `result.isItemFixed` → direct

```typescript
export async function searchUnifiedItemsApi(query: string): Promise<UnifiedScannerItem[]> {
  if (!query.trim()) return [];
  try {
    const params = new URLSearchParams({ sku: query.trim() });
    const response = await apiClient.get<UnifiedItemSearchResponse>(
      `/shopify/items/by-sku?${params.toString()}`,
      { requiresAuth: true },
    );
    return response.items.map(mapToUnifiedScannerItem);
  } catch {
    return [];
  }
}
```

`mapToUnifiedScannerItem` is a private pure function in the same file.

---

## 7. Domain Layer

### `domain/item-mode.domain.ts`

```typescript
// Extension point 1 registry — add new rules by appending here only.
const ITEM_MODE_RULES: ItemModeRule[] = [
  soldItemRule,
];

export function resolveLocationScannerMode(item: UnifiedScannerItem): LocationScannerMode {
  for (const rule of ITEM_MODE_RULES) {
    const mode = rule.evaluate(item);
    if (mode !== null) return mode;
  }
  return "shop"; // default
}
```

### `domain/item-mode-rules/sold-item.rule.ts`

```typescript
export const soldItemRule: ItemModeRule = {
  evaluate: (item) => item.isSold ? "logistic" : null,
};
```

### `domain/resolve-location.domain.ts`

```typescript
// Shop mode: match by value (exact) against location options label or value field.
export function resolveShopLocation(
  code: string,
  options: ScannerLocationOption[],
): ResolvedLocation | null

// Logistic mode: delegates to existing findLocationByValue(), maps LogisticLocationRecord → ResolvedLocation.
export function resolveLogisticLocation(
  value: string,
  locations: LogisticLocationRecord[],
): ResolvedLocation | null

// Dispatcher called by location.controller:
export function resolveLocation(
  value: string,
  mode: LocationScannerMode,
  shopOptions: ScannerLocationOption[],
  logisticLocations: LogisticLocationRecord[],
): ResolvedLocation | null
```

### `domain/warning-rules.domain.ts`

```typescript
// Extension point 3 registry — add new rules by appending here only.
const LOCATION_WARNING_RULES: LocationWarningRule[] = [
  fixCheckRule,       // priority 1
  zoneMismatchRule,   // priority 2
];

export function evaluateLocationWarnings(
  item: UnifiedScannerItem,
  location: ResolvedLocation,
): LocationWarning[] {
  return LOCATION_WARNING_RULES
    .filter(rule => rule.evaluate(item, location))
    .map(rule => ({ type: rule.type, priority: rule.priority }))
    .sort((a, b) => a.priority - b.priority);
}
```

### `domain/warning-rules/fix-check.rule.ts`

```typescript
export const fixCheckRule: LocationWarningRule = {
  type: "fix-check",
  priority: 1,
  evaluate(item, location) {
    if (location.mode !== "logistic") return false;
    return item.fixItem && !item.isItemFixed && location.zoneType !== "for_fixing";
  },
};
```

### `domain/warning-rules/zone-mismatch.rule.ts`

```typescript
export const zoneMismatchRule: LocationWarningRule = {
  type: "zone-mismatch",
  priority: 2,
  evaluate(item, location) {
    if (location.mode !== "logistic") return false;
    if (!item.intention) return false; // no intention → backend resolves; skip check
    return hasPlacementZoneMismatch(item.intention, location.zoneType, item.fixItem);
  },
};
```

---

## 8. Store (`stores/unified-scanner.store.ts`)

Standard Zustand store with individual setters for each state field, plus these composite actions:

```typescript
// Clears active warning and exposes next pending one.
// Called from actions after the user responds to the current popup.
advanceWarning(): void {
  const [next = null, ...rest] = state.pendingWarnings;
  set({ activeWarning: next, pendingWarnings: rest });
}

// Full reset to scanning-item. Called on unmount and on "Scan Next" (shop mode).
resetCycle(): void {
  set({
    phase: "scanning-item",
    selectedItem: null,
    locationMode: null,
    selectedLocation: null,
    pendingLocation: null,
    pendingWarnings: [],
    activeWarning: null,
    requiresZoneMismatchAfterFixCheck: false,
    frozenFrameAt: null,
    isLookingUpItem: false,
    itemLookupError: null,
    locationWarningBanner: null,
    lastPlacementError: null,
    canScanNext: false,
  });
}
```

`onScanAsk` persisted via `saveScannerOnScanAskSetting()` on change; loaded via `loadScannerOnScanAskSetting()` on store init.

---

## 9. Controllers

Controllers are split into explicit, named exports for barcode-scan and manual-select paths. This eliminates "run from step N" ambiguity.

---

### `controllers/item.controller.ts`

#### `lookupItemByValueController(value: string): Promise<void>`
Barcode scan path. Calls the API; falls back to a shop-mode placeholder if nothing is found.

```
1. store.setIsLookingUpItem(true), store.setItemLookupError(null)
2. results = await searchUnifiedItemsApi(value)
3. if (results.length > 0):
     item = results[0]
   else:
     // Fallback: use existing barcode extraction, produce a minimal shop-mode item
     base = buildItemFromScannedValue(value)   // imported from scanner/domain/scanner-decoder.domain
     item = {
       id: "",
       idType: base.idType,
       itemId: base.itemId,
       sku: base.sku,
       isSold: false,
       intention: null,
       fixItem: false,
       isItemFixed: false,
     }
4. store.setIsLookingUpItem(false)
5. applyItemController(item)   // delegate to the shared apply path
```

#### `applyItemController(item: UnifiedScannerItem): void`
Manual-select path and the final step of `lookupItemByValueController`. No API call.

```
1. mode = resolveLocationScannerMode(item)
2. store: setSelectedItem(item), setLocationMode(mode), setFrozenFrameAt(now)
3. if (!store.onScanAsk) → store.setPhase("scanning-location")
   else                  → store.setPhase("item-confirmed")
4. homeShellActions.closeOverlayPage()   // close manual panel if open
```

---

### `controllers/location.controller.ts`

#### `applyLocationByValueController(value: string): void`
Barcode scan path. Resolves location from the correct store based on current mode.

```
1. store.setLocationWarningBanner(null)
2. { locationMode } = store.getState()
3. shopOptions = useLocationOptionsStore.getState().options
4. logisticLocations = useLogisticLocationsStore.getState().locations
5. location = resolveLocation(value, locationMode, shopOptions, logisticLocations)
6. if (!location):
     store.setLocationWarningBanner(`Location "${value}" not recognised.`)
     return
7. applyResolvedLocationController(location)   // delegate to shared path
```

#### `applyResolvedLocationController(location: ResolvedLocation): void`
Manual-select path and the final step of `applyLocationByValueController`. Receives a pre-resolved location.

```
1. { selectedItem } = store.getState()
2. warnings = evaluateLocationWarnings(selectedItem, location)
3. if (warnings.length > 0):
     store.setPendingLocation(location)
     store.setActiveWarning(warnings[0])
     store.setPendingWarnings(warnings.slice(1))
     store.setRequiresZoneMismatchAfterFixCheck(warnings.length > 1)
     store.setPhase("warning-pending")
     homeShellActions.popupFeaturePage(UNIFIED_SCANNER_POPUP_IDS[warnings[0].type])
     homeShellActions.closeOverlayPage()   // close manual panel if open
     return
4. store.setSelectedLocation(location)
5. store.setCanScanNext(true)   // ← set BEFORE the async placement call (shop mode ready immediately)
6. store.setPhase("placing")
7. homeShellActions.closeOverlayPage()
8. void placementController()
```

---

### `controllers/placement.controller.ts`

#### `placementController(): Promise<void>`

```typescript
// ── Shared error helper (defined locally in this file) ───────────────────────
// buildLinkError (from scanner domain) expects ScannerItem/ScannerLocation types
// which are incompatible with UnifiedScannerItem/ResolvedLocation.
// Use this local extractor instead — no cross-type casting needed.
function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Something went wrong. Please try again.";
}

// ── Shop mode ────────────────────────────────────────────────────────────────
const { selectedItem: item, selectedLocation: location } = store.getState();
// location.mode === "shop" here

const token = itemScanHistoryActions.beginOptimisticLocationUpdate(item, location.code);
try {
  const response = await linkItemPositionsApi({ idType: item.idType, itemId: item.itemId, location: location.code });
  itemScanHistoryActions.commitOptimisticLocationUpdate(token, response);
  store.setPhase("placed");
} catch (error) {
  itemScanHistoryActions.rollbackOptimisticLocationUpdate(token);
  store.setLastPlacementError(extractErrorMessage(error));
  store.setPhase("error");
}

// ── Logistic mode ────────────────────────────────────────────────────────────
// location.mode === "logistic" here

const locationRecord = useLogisticLocationsStore.getState().locations.find(l => l.id === location.id) ?? null;
const prev = locationRecord ? optimisticMarkPlacement(item.id, locationRecord) : null;
// optimisticMarkPlacement returns null gracefully if item is not in useLogisticTasksStore

try {
  await markPlacementApi({ scanHistoryId: item.id, logisticLocationId: location.id });
  store.setPhase("placed");
} catch (error) {
  if (prev) useLogisticTasksStore.getState().upsertItem(prev); // roll back if item was in the store
  store.setLastPlacementError(extractErrorMessage(error));
  store.setPhase("error");
}
```

---

## 10. Warning Confirmation Actions (`actions/unified-scanner.actions.ts`)

All warning popup responses are wired here. No separate warning flow file needed — sequencing is handled inline.

### Fix-check responses

**`confirmMarkFixed()`** — "Yes — Mark as Fixed & Place":
```
1. homeShellActions.closePopupPage()
2. await markItemFixedApi({ scanHistoryId: store.selectedItem.id })
3. store: update selectedItem.isItemFixed = true (setSelectedItem with spread)
4. if (store.requiresZoneMismatchAfterFixCheck):
     store.setRequiresZoneMismatchAfterFixCheck(false)
     store.setActiveWarning({ type: "zone-mismatch", priority: 2 })
     homeShellActions.popupFeaturePage("unified-scanner-zone-mismatch")
   else:
     → finalise: store.setSelectedLocation(store.pendingLocation)
                 store.setPendingLocation(null)
                 store.setActiveWarning(null)
                 store.setPhase("placing")
                 void placementController()
```

**`skipFixCheck()`** — "No — Place Without Fixing":
```
1. homeShellActions.closePopupPage()
2. if (store.requiresZoneMismatchAfterFixCheck):
     store.setRequiresZoneMismatchAfterFixCheck(false)
     store.setActiveWarning({ type: "zone-mismatch", priority: 2 })
     homeShellActions.popupFeaturePage("unified-scanner-zone-mismatch")
   else:
     → finalise (same as "Yes" path above from step 3 onward)
```

### Zone-mismatch responses

**`confirmZoneMismatch()`** — "Confirm — Place Here":
```
1. homeShellActions.closePopupPage()
2. store.setSelectedLocation(store.pendingLocation)
3. store.setPendingLocation(null)
4. store.setActiveWarning(null)
5. store.setPhase("placing")
6. void placementController()
```

**`cancelPlacement()`** — "Cancel":
```
1. homeShellActions.closePopupPage()
2. store: clearPendingLocation, clearActiveWarning, clearPendingWarnings
3. store.setPhase("scanning-location")
```

### Other actions in `unified-scanner.actions.ts`

```typescript
goToLocationStep(): void           // phase "item-confirmed" → "scanning-location"
retryLocation(): void              // phase "placed"/"error" → "scanning-location", clear selectedLocation/canScanNext/lastPlacementError
scanNext(): void                   // shop mode: store.resetCycle() ONLY — provider's handleScanNext also calls cameraFlow.resetScannerVisualCycle()
closeScanner(): void               // logistic "Done": homeShellActions.closeFullFeaturePage()
clearItemLookupError(): void       // clears itemLookupError in store
clearLocationWarningBanner(): void // clears locationWarningBanner in store
clearPlacementError(): void        // clears lastPlacementError, sets phase → "scanning-location"
setAvailableLenses(lenses): void   // called by camera flow after device enumeration
toggleFlash(): void
selectLens(lensId: string): void
toggleOnScanAsk(): void            // toggles onScanAsk, persists via saveScannerOnScanAskSetting
```

**Note on `scanNext`:** This action only calls `store.resetCycle()`. It does NOT call camera flow functions — actions are plain functions and cannot invoke hooks. The camera visual reset (`resetScannerVisualCycle`) is wired by the provider into `handleScanNext` alongside this action call. See §12.

---

## 11. Camera Flow (`flows/use-unified-scanner-camera.flow.ts`)

**Do not wrap `useScannerZxingFlow`** — that hook is hardcoded to `useScannerStore`, `scannerActions`, and the `"main-scanner"` region ID. Wrapping it would run two scanner state machines simultaneously.

This is a **new implementation** using `attachDecodeSession("unified-scanner", ...)` from the camera session manager (same pattern as `useLogisticPlacementScannerFlow`), extended with the scan-quality features of the main scanner.

### State structure — four separate states, same pattern as `useScannerZxingFlow`

The flow maintains **separate** decoded text and frozen frame for each step. This prevents the item's raw barcode value from bleeding into the location pane, and ensures the item pane correctly updates to the item's human-readable name after the API lookup resolves.

```typescript
// Internal React state (do NOT collapse into a single decodedText/frozenFrame)
const [itemFrozenFrame,    setItemFrozenFrame]    = useState<ScannerFrozenFrame | null>(null);
const [itemDecodedText,    setItemDecodedText]    = useState<string | null>(null);
const [locationFrozenFrame, setLocationFrozenFrame] = useState<ScannerFrozenFrame | null>(null);
const [locationDecodedText, setLocationDecodedText] = useState<string | null>(null);
const [pendingItemValue, setPendingItemValue] = useState<string | null>(null);
```

The flow **returns** the appropriate pair based on the current scanner step (derived from phase):

```typescript
export interface UnifiedScannerCameraFlowResult {
  isCameraReady: boolean;
  cameraError: string | null;
  itemFrozenFrame: ScannerFrozenFrame | null;
  itemDecodedText: string | null;
  locationFrozenFrame: ScannerFrozenFrame | null;
  locationDecodedText: string | null;
  clearItemScan: () => void;
  clearLocationScan: () => void;
  resetScannerVisualCycle: () => void;
}
```

### Reactive effects — mirror `useScannerZxingFlow` exactly, reading from unified store

```typescript
// When selectedItem is applied (barcode or manual): update item display text + freeze frame.
// This is what makes the DecodedTextPanel show "Hoodie · SKU-123" instead of the raw barcode.
useEffect(() => {
  if (!selectedItem) return;
  const id = window.requestAnimationFrame(() => {
    const frame = captureFrame();
    if (frame) setItemFrozenFrame(frame);
    setItemDecodedText(selectedItem.title ?? selectedItem.sku);
  });
  return () => window.cancelAnimationFrame(id);
}, [selectedItem]);   // selectedItem from useUnifiedScannerStore

// When selectedLocation is applied: update location display text + freeze frame.
useEffect(() => {
  if (!selectedLocation) return;
  const id = window.requestAnimationFrame(() => {
    const frame = captureFrame();
    if (frame) setLocationFrozenFrame(frame);
    const label = selectedLocation.mode === "shop"
      ? selectedLocation.label
      : selectedLocation.location;
    setLocationDecodedText(label);
  });
  return () => window.cancelAnimationFrame(id);
}, [selectedLocation]);   // selectedLocation from useUnifiedScannerStore

// When transitioning back to item step (after scanNext/resetCycle): clear location state.
useEffect(() => {
  if (phase !== "scanning-item") return;
  const id = window.requestAnimationFrame(() => {
    setLocationFrozenFrame(null);
    setLocationDecodedText(null);
  });
  return () => window.cancelAnimationFrame(id);
}, [phase]);
```

### Item transition delay — same 600 ms pattern as `useScannerZxingFlow`

```typescript
// pendingItemValue + itemFrozenFrame both set → start 600 ms timer before calling controller.
// This gives the frozen frame animation time to render before the API call fires.
useEffect(() => {
  if (!pendingItemValue || !itemFrozenFrame) return;
  const value = pendingItemValue;
  const timerId = window.setTimeout(() => {
    setPendingItemValue(null);
    void lookupItemByValueController(value);
  }, 600);
  return () => window.clearTimeout(timerId);
}, [pendingItemValue, itemFrozenFrame]);
```

### `attachDecodeSession` decode callback

```typescript
const detach = attachDecodeSession(
  "unified-scanner",
  (rawValue) => {
    if (decodePausedRef.current) return;

    // Dedup: ignore same value within 1 200 ms
    const now = Date.now();
    const last = lastScanRef.current;
    if (last && last.value === rawValue && now - last.at < 1200) return;
    lastScanRef.current = { value: rawValue, at: now };

    // Haptics
    navigator.vibrate?.(32);

    const currentPhase = phaseRef.current;

    if (currentPhase === "scanning-item") {
      const frame = captureFrame();
      if (frame) setItemFrozenFrame(frame);
      setItemDecodedText(rawValue);    // shown immediately; reactive effect overwrites with item.title after lookup
      setPendingItemValue(rawValue);   // triggers the 600 ms transition timer
      decodePausedRef.current = true;
      return;
    }

    if (currentPhase === "scanning-location") {
      const frame = captureFrame();
      if (frame) setLocationFrozenFrame(frame);
      setLocationDecodedText(rawValue);  // reactive effect overwrites with location.label after apply
      decodePausedRef.current = true;
      applyLocationByValueController(rawValue);
    }
  },
  (ready, error) => {
    setIsCameraReady(ready);
    setCameraError(error ?? null);
    if (ready) void initLensesFromDevices();  // private helper: enumerate → unifiedScannerActions.setAvailableLenses
  },
  selectedLensId ?? undefined,
);
```

### `clearItemScan` / `clearLocationScan` / `resetScannerVisualCycle`

```typescript
// Step-aware clear (called when user taps "retry" on a step)
const clearItemScan = useCallback(() => {
  setItemFrozenFrame(null);
  setItemDecodedText(null);
  setPendingItemValue(null);
  decodePausedRef.current = false;
  if (itemTransitionTimerRef.current) {
    window.clearTimeout(itemTransitionTimerRef.current);
    itemTransitionTimerRef.current = null;
  }
}, []);

const clearLocationScan = useCallback(() => {
  setLocationFrozenFrame(null);
  setLocationDecodedText(null);
  decodePausedRef.current = false;
}, []);

// Full reset — called by provider's onScanNext handler (shop mode)
const resetScannerVisualCycle = useCallback(() => {
  clearItemScan();
  clearLocationScan();
}, [clearItemScan, clearLocationScan]);
```

### Flash sync

```typescript
useEffect(() => {
  if (!isCameraReady) return;
  void applyTorchToUnifiedRegion(flashEnabled);
  // applyTorchToUnifiedRegion: private helper — identical logic to existing applyTorchConstraint
  // but targets CAMERA_REGION_IDS["unified-scanner"]
}, [flashEnabled, isCameraReady, selectedLensId]);
```

---

## 12. Provider (`providers/UnifiedScannerProvider.tsx`)

```typescript
export function UnifiedScannerProvider({ children }: { children: React.ReactNode }) {
  const cameraFlow = useUnifiedScannerCameraFlow();

  // ── Location options bootstrap guard ────────────────────────────────────
  const hasLocationOptions = useLocationOptionsStore(s => s.options.length > 0);
  useEffect(() => {
    if (!hasLocationOptions) void bootstrapLocationOptionsController();
  }, [hasLocationOptions]);

  // ── onScanAsk hydration ──────────────────────────────────────────────────
  useEffect(() => {
    useUnifiedScannerStore.getState().setOnScanAsk(loadScannerOnScanAskSetting());
  }, []);

  // ── Store reset on unmount ───────────────────────────────────────────────
  useEffect(() => {
    return () => useUnifiedScannerStore.getState().resetCycle();
  }, []);

  // ── onScanNext: action + camera flow wired together ──────────────────────
  // unifiedScannerActions.scanNext() only resets the store (resetCycle).
  // The camera flow's resetScannerVisualCycle() must be called here in the
  // provider — actions are plain functions and cannot call flow hooks directly.
  const handleScanNext = useCallback(() => {
    cameraFlow.resetScannerVisualCycle();
    unifiedScannerActions.scanNext();
  }, [cameraFlow]);

  // ── Assemble context value ───────────────────────────────────────────────
  // All fields from UnifiedScannerPageContextValue are wired here from
  // store selectors + camera flow result + handler callbacks.
  const phase = useUnifiedScannerStore(s => s.phase);
  const scannerStep: "item" | "location" = (
    ["scanning-location","warning-pending","placing","placed","error"] as UnifiedScannerPhase[]
  ).includes(phase) ? "location" : "item";

  const contextValue: UnifiedScannerPageContextValue = {
    // Camera
    isCameraReady: cameraFlow.isCameraReady,
    cameraError: cameraFlow.cameraError,
    itemFrozenFrame: cameraFlow.itemFrozenFrame,
    itemDecodedText: cameraFlow.itemDecodedText,
    locationFrozenFrame: cameraFlow.locationFrozenFrame,
    locationDecodedText: cameraFlow.locationDecodedText,
    // Store
    phase,
    scannerStep,
    selectedItem: useUnifiedScannerStore(s => s.selectedItem),
    locationMode: useUnifiedScannerStore(s => s.locationMode),
    selectedLocation: useUnifiedScannerStore(s => s.selectedLocation),
    isLookingUpItem: useUnifiedScannerStore(s => s.isLookingUpItem),
    itemLookupError: useUnifiedScannerStore(s => s.itemLookupError),
    locationWarningBanner: useUnifiedScannerStore(s => s.locationWarningBanner),
    lastPlacementError: useUnifiedScannerStore(s => s.lastPlacementError),
    canScanNext: useUnifiedScannerStore(s => s.canScanNext),
    flashEnabled: useUnifiedScannerStore(s => s.flashEnabled),
    availableLenses: useUnifiedScannerStore(s => s.availableLenses),
    selectedLensId: useUnifiedScannerStore(s => s.selectedLensId),
    onScanAsk: useUnifiedScannerStore(s => s.onScanAsk),
    // Handlers
    onBack: unifiedScannerActions.closeScanner,
    onToggleFlash: unifiedScannerActions.toggleFlash,
    onSelectLens: unifiedScannerActions.selectLens,
    onGoToLocationStep: unifiedScannerActions.goToLocationStep,
    onClearItemScan: cameraFlow.clearItemScan,
    onClearLocationScan: cameraFlow.clearLocationScan,
    onScanNext: handleScanNext,   // ← store reset + camera visual reset, both called here
    onDismissItemError: unifiedScannerActions.clearItemLookupError,
    onDismissLocationWarning: unifiedScannerActions.clearLocationWarningBanner,
    onDismissPlacementError: unifiedScannerActions.clearPlacementError,
    onToggleOnScanAsk: unifiedScannerActions.toggleOnScanAsk,
  };

  return (
    <UnifiedScannerPageProvider value={contextValue}>
      {children}
    </UnifiedScannerPageProvider>
  );
}
```

---

## 13. UI Components

### `UnifiedScannerPage.tsx`

Parent container. Owns the **camera region div** and the **manual input overlay state** — the only place either appears in the component tree.

```tsx
// Local state for manual input — same pattern as ScannerLogisticPlacementPage.
// No home shell overlay registration required.
const [manualInputMode, setManualInputMode] = useState<"item" | "location" | null>(null);

return (
  <section className="relative h-svh w-full overflow-hidden" aria-label="Unified scanner">
    {/* Camera region — shared by item and location steps */}
    <div
      id={CAMERA_REGION_IDS["unified-scanner"]}
      className="absolute inset-0 z-0 pointer-events-none"
    />

    {/* Two-pane slide track (identical spring motion to ScannerPage.tsx) */}
    <div className="absolute inset-0 z-20 overflow-hidden">
      <motion.div
        className="flex h-full w-[200%]"
        animate={{ x: scannerStep === "location" ? "-50%" : "0%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34, mass: 0.9 }}
      >
        <UnifiedItemScanPage
          onManualInput={() => setManualInputMode("item")}
          ...
        />
        <UnifiedLocationScanPage
          onManualInput={() => setManualInputMode("location")}
          ...
        />
      </motion.div>
    </div>

    {/* Camera not ready / error overlays */}
    {!isCameraReady && !cameraError ? <LoadingOverlay /> : null}
    {cameraError ? <CameraErrorOverlay message={cameraError} /> : null}

    {/* Logistic success state — absolute overlay above the slide track */}
    <AnimatePresence>
      {phase === "placed" && locationMode === "logistic" ? (
        <UnifiedLogisticSuccessState ... />
      ) : null}
    </AnimatePresence>

    {/* Manual input panels — Framer Motion slide-in from right, z-index above everything */}
    <AnimatePresence>
      {manualInputMode === "item" && (
        <UnifiedItemManualInputPanel
          onClose={() => setManualInputMode(null)}
          onSelect={(item) => { setManualInputMode(null); applyItemController(item); }}
        />
      )}
      {manualInputMode === "location" && (
        <UnifiedLocationManualInputPanel
          onClose={() => setManualInputMode(null)}
          onSelect={(location) => { setManualInputMode(null); applyResolvedLocationController(location); }}
        />
      )}
    </AnimatePresence>
  </section>
);
```

`scannerStep` is consumed from context (set by provider). Neither step page contains a camera region div — they are purely visual.

---

### `UnifiedItemScanPage.tsx`

Receives `onManualInput` as a prop (called by parent to open `manualInputMode="item"`). No local state.

- `ScannerGuideOverlay` (`isFrozen={Boolean(itemFrozenFrame)}` — reticle shows as frozen once item is scanned)
- `DecodedTextPanel` when `itemDecodedText` is non-null — shows raw barcode value during the 600 ms delay, then item title/sku once the store updates (reactive camera flow effect overwrites it)
- Spinner overlay while `isLookingUpItem`
- Dismissible error banner for `itemLookupError` (dismiss: `onDismissItemError` from context)
- `ScannerActionsOverlay` with `stepTitle="Scan Item"`, `onManualInput` prop
- "Continue →" button visible only when `phase === "item-confirmed"` → `onGoToLocationStep` from context

---

### `UnifiedLocationScanPage.tsx`

Receives `onManualInput` as a prop. No local state.

- `FrozenFrameCanvas` showing `itemFrozenFrame` as the visual reference (the item frame frozen at scan time, shown behind the location reticle)
- `ScannerGuideOverlay` (`isFrozen={Boolean(locationFrozenFrame)}` — reticle freezes once location is decoded)
- Mode badge pill below reticle: "Shop Location" (emerald) or "Logistic Location" (sky), driven by `locationMode`
- `DecodedTextPanel` when `locationDecodedText` is non-null:
  - **Shop mode only**: `secondaryActionLabel="Next scan"` when `canScanNext`, `onSecondaryAction → onScanNext` from context
  - **Logistic mode**: no secondary action (success is the full-screen overlay)
- Dismissible location warning banner for `locationWarningBanner`:
  - Dismiss button → `onDismissLocationWarning` from context
- Dismissible placement error banner when `phase === "error"` and `lastPlacementError` non-null:
  - Dismiss/retry button → `onDismissPlacementError` from context (resets to scanning-location)
- `ScannerActionsOverlay` with `stepTitle="Scan Location"`, `onManualInput` prop

---

### `ScannerActionsOverlay` (reused directly — no wrapper needed)

`ScannerActionsOverlay` (from the existing scanner) is a **pure presentational component** — it accepts all behaviour as props and does not read from any context or store. **Import it directly** in both step pages, passing unified scanner context values. No `UnifiedScannerActionsOverlay.tsx` file is needed.

---

### `UnifiedItemManualInputPanel.tsx`

Props: `onClose: () => void`, `onSelect: (item: UnifiedScannerItem) => void`.

- Framer Motion slide-in from right (same pattern as `ScannerLogisticPlacementPage`)
- Debounced (250ms) search via `searchUnifiedItemsApi(query)`
- Shows title + sku + image thumbnail per result
- On select → calls `onSelect(item)` prop (parent calls `applyItemController(item)` and closes panel)
- Close button → calls `onClose()` prop
- No `homeShellActions` calls — entirely local

---

### `UnifiedLocationManualInputPanel.tsx`

Props: `onClose: () => void`, `onSelect: (location: ResolvedLocation) => void`.

- Framer Motion slide-in from right
- Reads `locationMode` from context to decide which store to filter
- Mode-aware, client-side filtered:
  - `"shop"` mode: filters `useLocationOptionsStore().options` by label/value → maps to `ResolvedLocation`
  - `"logistic"` mode: calls `filterLogisticLocations(locations, query)` → maps to `ResolvedLocation`
- On select → calls `onSelect(resolvedLocation)` prop (parent calls `applyResolvedLocationController(location)`)
- Close button → calls `onClose()` prop
- No `homeShellActions` calls — entirely local

---

### `UnifiedLogisticSuccessState.tsx`

Full-screen absolute overlay (same visual as confirmed state in `ScannerLogisticPlacementPage.tsx`):
- Checkmark icon, "Placed at" label, `location.location` in large text
- **"Change Location"** → `unifiedScannerActions.retryLocation()`
- **"Done"** (disabled while `phase === "placing"`) → `unifiedScannerActions.closeScanner()`

---

### `UnifiedFixCheckPopup.tsx`

Visually identical to `PlacementItemFixedPopup.tsx`. Calls:
- "Yes — Mark as Fixed & Place" → `unifiedScannerActions.confirmMarkFixed()`
- "No — Place Without Fixing" → `unifiedScannerActions.skipFixCheck()`

Registered under popup page ID `"unified-scanner-fix-check"`.

---

### `UnifiedZoneMismatchPopup.tsx`

Visually identical to `PlacementZoneMismatchPopup.tsx`. Calls:
- "Confirm — Place Here" → `unifiedScannerActions.confirmZoneMismatch()`
- "Cancel" → `unifiedScannerActions.cancelPlacement()`

Registered under popup page ID `"unified-scanner-zone-mismatch"`.

---

### `UnifiedScannerFeature.tsx`

```tsx
export function UnifiedScannerFeature() {
  return (
    <UnifiedScannerProvider>
      <UnifiedScannerPage />
    </UnifiedScannerProvider>
  );
}
```

---

## 14. App Integration

### Home Shell — Popup Page Registration

Add two entries to the popup page registry (alongside `"placement-item-fixed-check"` and `"placement-zone-mismatch"`):

```
"unified-scanner-fix-check"     → <UnifiedFixCheckPopup />
"unified-scanner-zone-mismatch" → <UnifiedZoneMismatchPopup />
```

Manual input panels do **not** need home shell registration — they are managed by local state inside `UnifiedScannerPage`.

### BottomNav — Day-1 Swap

In the home shell's feature registry:
```
"unified-scanner" → <UnifiedScannerFeature />
```

In the BottomNav nav config, change the centre item ID from `"scanner"` to `"unified-scanner"`. The old `ScannerFeature` stays registered but is no longer the BottomNav target.

### Camera Prewarm — Home Page Flow

Without prewarm, tapping the BottomNav scanner button starts the camera cold — a 1–2 second delay before the viewfinder appears. Add `useCameraPrewarm("unified-scanner")` to the home page's flow hook (the same file where `useCameraPrewarm("main-scanner")` is called from `use-item-scan-history.flow.ts`). This starts the camera stream as soon as the home page mounts, so it is already warm when the scanner opens.

```typescript
// In the appropriate home-page-level flow hook:
useCameraPrewarm("unified-scanner");
```

Find the correct file by searching for the existing `useCameraPrewarm("main-scanner")` call site and add the unified scanner prewarm alongside it.

---

## 15. Implementation Order for Codex

```
 1. camera-session.manager.ts — additive change (§existing-file-change)
 2. types/unified-scanner.types.ts
 3. api/search-unified-items.api.ts
 4. domain/item-mode-rules/sold-item.rule.ts
 5. domain/item-mode.domain.ts
 6. domain/resolve-location.domain.ts
 7. domain/warning-rules/fix-check.rule.ts
 8. domain/warning-rules/zone-mismatch.rule.ts
 9. domain/warning-rules.domain.ts
10. stores/unified-scanner.store.ts
11. actions/unified-scanner.actions.ts  (stub: all exports defined, implementations filled after controllers)
12. controllers/item.controller.ts
13. controllers/location.controller.ts
14. controllers/placement.controller.ts
15. actions/unified-scanner.actions.ts  (complete all warning confirmation handlers using controllers)
16. flows/use-unified-scanner-camera.flow.ts
17. context/unified-scanner-context.ts + unified-scanner.context.tsx
18. providers/UnifiedScannerProvider.tsx
19. ui/UnifiedItemScanPage.tsx
20. ui/UnifiedItemManualInputPanel.tsx
21. ui/UnifiedLocationScanPage.tsx
22. ui/UnifiedLocationManualInputPanel.tsx
23. ui/UnifiedLogisticSuccessState.tsx
24. ui/UnifiedFixCheckPopup.tsx
25. ui/UnifiedZoneMismatchPopup.tsx
26. ui/UnifiedScannerPage.tsx
27. UnifiedScannerFeature.tsx
28. Register popup pages in home shell
29. Wire BottomNav centre item to "unified-scanner"
30. Add useCameraPrewarm("unified-scanner") to home page flow
```

---

## 16. Decision Log

| # | Question | Decision |
|---|---|---|
| Q1 | Logistic fields in item response? | Backend enriches `/shopify/items/by-sku` response with `id`, `isSold`, `intention`, `fixItem`, `isItemFixed` |
| Q2 | Item not found? | Fall back to shop mode using `buildItemFromScannedValue` |
| Q3 | `markPlacementApi` handles `intention=null`? | Yes — backend resolves it |
| Q4 | Post-placement UX? | Shop: "Next scan" inline. Logistic: full-screen success overlay with "Change Location" + "Done" |
| Q5 | BottomNav wiring? | Day-1 swap to unified scanner; old scanner stays registered |
| Q6 | Item search API? | Single enriched `/shopify/items/by-sku` endpoint for both barcode scan and manual search |
| Q7 | Optimistic update for logistic placement? | `optimisticMarkPlacement` — returns null gracefully if item not in `useLogisticTasksStore` |
| C1 | `useScannerZxingFlow` reusable? | No — hardcoded to `useScannerStore`/`scannerActions`. New flow using `attachDecodeSession` |
| C2 | `CameraSessionId` extension? | Add `"unified-scanner"` to union, `CAMERA_REGION_IDS`, `SESSION_IDS`, `sessions` in `camera-session.manager.ts` |
| C3 | Camera region div location? | Parent `UnifiedScannerPage` only — not in step pages |
| C4 | `canScanNext` timing? | Set BEFORE the async placement call (same as existing scanner) |
| C5 | Controller split? | Explicit exports: `lookupItemByValueController` + `applyItemController`; `applyLocationByValueController` + `applyResolvedLocationController` |
| C6 | Warning flow file? | Removed — popup sequencing is in `unified-scanner.actions.ts` |
| C7 | `warningTypeToPopupId`? | Replaced by `UNIFIED_SCANNER_POPUP_IDS` record in types |
| C8 | Error formatting? | Use local `extractErrorMessage(error: unknown): string` helper in `placement.controller.ts` — `buildLinkError` expects `ScannerItem`/`ScannerLocation` types incompatible with `UnifiedScannerItem`/`ResolvedLocation` |
| C9 | Error state UI? | Dismissible banner in `UnifiedLocationScanPage`; dismiss calls `clearPlacementError()` → resets to scanning-location |
| C10 | Store reset on unmount? | `UnifiedScannerProvider` cleanup calls `store.resetCycle()` |
| C11 | Location options bootstrap? | Provider checks `hasLocationOptions`; if false, calls `bootstrapLocationOptionsController()` |
| C12 | `locationWarningBanner` dismiss? | `clearLocationWarningBanner()` in actions |
| M1 | Item scan API unification? | Single `searchUnifiedItemsApi` for both barcode scan and manual search |
| I1 | Camera flow single vs split decoded text? | Four separate states (`itemDecodedText`, `itemFrozenFrame`, `locationDecodedText`, `locationFrozenFrame`) — same pattern as `useScannerZxingFlow`. Prevents bleed-through and ensures human-readable display after lookup resolves |
| I2 | `buildLinkError` type mismatch? | Local `extractErrorMessage(error)` helper in `placement.controller.ts` — avoids type-casting `UnifiedScannerItem` / `ResolvedLocation` to the existing scanner's types |
| I3 | Context interface unspecified? | `UnifiedScannerPageContextValue` fully enumerated in `types/unified-scanner.types.ts` |
| I4 | `scanNext` action + camera flow coupling? | `scanNext()` only calls `store.resetCycle()`. Provider wires `handleScanNext = () => { cameraFlow.resetScannerVisualCycle(); unifiedScannerActions.scanNext(); }` |
| I5 | Manual input overlay registration? | Local state `manualInputMode` in `UnifiedScannerPage` — no home shell overlay registration needed |
| I6 | Camera prewarm? | `useCameraPrewarm("unified-scanner")` added to the home page flow alongside the existing main-scanner prewarm |
```
