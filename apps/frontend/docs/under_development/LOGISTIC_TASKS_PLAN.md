# LOGISTIC TASKS — FRONTEND PLAN

## Purpose

The main operational page for logistic work. Shows active sold items grouped by
orderId and optionally by intention tab, filtered by role defaults. Supports
three distinct actions (mark intention, mark placement, fulfil), real-time WS
updates, and a dedicated barcode scanner page for placement.

---

## Feature Location

```
src/features/logistic-tasks/
  types/
    logistic-tasks.dto.ts
    logistic-tasks.types.ts
  domain/
    logistic-tasks.domain.ts
    logistic-tasks-filters.domain.ts
  api/
    get-logistic-tasks.api.ts
    mark-intention.api.ts
    mark-placement.api.ts
    fulfil-item.api.ts
  stores/
    logistic-tasks.store.ts
  controllers/
    logistic-tasks.controller.ts
    logistic-tasks-optimistic.controller.ts
  actions/
    logistic-tasks.actions.ts
  flows/
    use-logistic-tasks.flow.ts
    use-logistic-tasks-realtime.flow.ts
  context/
    logistic-tasks-page-context.ts
    logistic-tasks-page.context.tsx
  ui/
    LogisticTasksPage.tsx
    LogisticTasksHeader.tsx
    LogisticTasksTabMenu.tsx
    LogisticTasksList.tsx
    LogisticTasksCard.tsx
    LogisticTasksLoadingCards.tsx
    LogisticTasksFiltersPanel.tsx
    MarkIntentionOverlay.tsx
    LogisticTasksBatchNotificationBanner.tsx

# Scanner addition (lives in features/scanner):
src/features/scanner/
  stores/
    scanner-logistic-placement.store.ts
  context/
    scanner-logistic-placement-context.ts
    scanner-logistic-placement.context.tsx
  ui/
    ScannerLogisticPlacementPage.tsx
```

---

## Types

### `types/logistic-tasks.dto.ts`

Mirrors backend `LogisticItemSummary` and `LogisticItemsPage`:

```typescript
export type LogisticIntentionDto =
  | "customer_took_it"
  | "store_pickup"
  | "local_delivery"
  | "international_shipping";

export type LogisticEventTypeDto = "marked_intention" | "placed" | "fulfilled";
export type LogisticZoneTypeDto = "for_delivery" | "for_pickup" | "for_fixing";

export interface LogisticTaskItemDto {
  id: string;
  productId: string;
  itemSku: string | null;
  itemBarcode: string | null;
  itemImageUrl: string | null;
  itemCategory: string | null;
  itemType: string;
  itemTitle: string;
  latestLocation: string | null;
  orderId: string | null;
  intention: LogisticIntentionDto;
  fixItem: boolean | null;
  scheduledDate: string | null;   // ISO string
  lastLogisticEventType: LogisticEventTypeDto | null;
  updatedAt: string;              // ISO string
  logisticEvent: {
    username: string;
    eventType: LogisticEventTypeDto;
    location: string | null;
    zoneType: LogisticZoneTypeDto | null;
  } | null;
}

export interface LogisticOrderGroupDto {
  orderId: string | null;
  items: LogisticTaskItemDto[];
}

export interface GetLogisticTasksResponseDto {
  orders: LogisticOrderGroupDto[];
}

// For seller view (noIntention=true) — same shape, items have intention=null
export interface GetLogisticTasksNoIntentionResponseDto {
  orders: LogisticOrderGroupDto[];
}

export interface MarkIntentionRequestDto {
  scanHistoryId: string;
  intention: LogisticIntentionDto;
  fixItem: boolean;
  scheduledDate?: string;         // yyyy-mm-dd
}

export interface MarkIntentionResponseDto {
  scheduledDate: string | null;
}

export interface MarkPlacementRequestDto {
  scanHistoryId: string;
  logisticLocationId: string;
}

export interface FulfilItemRequestDto {
  scanHistoryId: string;
}
```

### `types/logistic-tasks.types.ts`

Domain-facing types after normalisation:

```typescript
export type LogisticIntention =
  | "customer_took_it"
  | "store_pickup"
  | "local_delivery"
  | "international_shipping";

export type LogisticEventType = "marked_intention" | "placed" | "fulfilled";
export type LogisticZoneType = "for_delivery" | "for_pickup" | "for_fixing";

export interface LogisticTaskItem {
  id: string;             // scanHistoryId
  productId: string;
  sku: string | null;
  imageUrl: string | null;
  itemType: string;
  itemTitle: string;
  location: string | null;
  orderId: string | null;
  intention: LogisticIntention | null;   // null when noIntention items
  fixItem: boolean;
  scheduledDate: Date | null;
  lastEventType: LogisticEventType | null;
  logisticLocation: string | null;       // location name from latest event
  logisticZoneType: LogisticZoneType | null;
  updatedAt: Date;
}

export interface LogisticOrderGroup {
  orderId: string | null;
  items: LogisticTaskItem[];
}

export interface LogisticTaskFilters {
  fixItem?: boolean;
  lastLogisticEventType?: LogisticEventType;
  zoneType?: LogisticZoneType;
  intention?: LogisticIntention;
  orderId?: string;
  noIntention?: boolean;
}
```

---

## Domain

### `domain/logistic-tasks.domain.ts`

```typescript
export const LOGISTIC_INTENTION_LABELS: Record<LogisticIntention, string> = {
  customer_took_it:         "Customer Took It",
  store_pickup:             "Store Pickup",
  local_delivery:           "Local Delivery",
  international_shipping:   "International Shipping",
};

export const LOGISTIC_INTENTION_ORDER: LogisticIntention[] = [
  "store_pickup",
  "local_delivery",
  "international_shipping",
  "customer_took_it",
];

export function normalizeLogisticTaskItem(dto: LogisticTaskItemDto): LogisticTaskItem { ... }

export function normalizeLogisticTasksPage(
  dto: GetLogisticTasksResponseDto,
): { items: LogisticTaskItem[]; groups: LogisticOrderGroup[] } { ... }

/**
 * Flattens groups → items while preserving orderId on each item.
 * Used to build the flat store items array for WS updates.
 */
export function flattenOrderGroups(groups: LogisticOrderGroup[]): LogisticTaskItem[] { ... }

/**
 * Groups a flat item array back into orderId groups for rendering.
 * Non-null orderId groups first (server ordering preserved).
 */
export function buildOrderGroups(items: LogisticTaskItem[]): LogisticOrderGroup[] { ... }

/**
 * Groups items by their intention for tab rendering.
 * Only includes intentions present in the current items array.
 */
export function groupByIntention(
  items: LogisticTaskItem[],
): Map<LogisticIntention, LogisticTaskItem[]> { ... }

/**
 * Counts items per intention — used for tab pills.
 */
export function countByIntention(
  items: LogisticTaskItem[],
): Record<LogisticIntention, number> { ... }

/**
 * Converts role-context default filters to LogisticTaskFilters.
 */
export function buildFiltersFromRoleDefaults(
  defaults: LogisticTaskDefaultFilter[],
): LogisticTaskFilters { ... }

/**
 * Converts LogisticTaskFilters to URLSearchParams entries for the API.
 */
export function buildApiQueryParams(filters: LogisticTaskFilters): URLSearchParams { ... }
```

### `domain/logistic-tasks-filters.domain.ts`

```typescript
export function defaultLogisticTaskFilters(): LogisticTaskFilters { return {}; }

export function countActiveLogisticTaskFilters(filters: LogisticTaskFilters): number { ... }

export function serializeFiltersForRequestKey(filters: LogisticTaskFilters): string {
  return JSON.stringify(filters);
}
```

---

## Store

### `stores/logistic-tasks.store.ts`

**State fields:**

```typescript
interface LogisticTasksStoreState {
  // Raw flat items (source of truth)
  items: LogisticTaskItem[];

  // Filter state
  filters: LogisticTaskFilters;
  query: string;                      // client-side text search (sku, title)

  // Intention tab — persisted to localStorage (key: "logistic-tasks:activeTab")
  activeIntentionTab: LogisticIntention | null;

  // Batch notification banner
  batchNotification: { count: number; message: string } | null;

  // Async states
  isLoading: boolean;
  hasLoaded: boolean;
  errorMessage: string | null;
  activeRequestId: number;

  // ... setters and actions
  hydrate: (items: LogisticTaskItem[]) => void;
  hydrateAndFinish: (items: LogisticTaskItem[]) => void;
  finishWithError: (msg: string) => void;
  upsertItem: (item: LogisticTaskItem) => void;   // for WS realtime + optimistic
  removeItem: (id: string) => void;               // for fulfilled items
  setFilters: (partial: Partial<LogisticTaskFilters>) => void;
  setQuery: (q: string) => void;
  setActiveIntentionTab: (tab: LogisticIntention | null) => void;
  setBatchNotification: (n: { count: number; message: string } | null) => void;
  reset: () => void;
}
```

**Selectors:**

```typescript
export const selectLogisticTasksItems      // raw items
export const selectLogisticTasksOrderGroups   // buildOrderGroups(items)
export const selectLogisticTasksIntentionMap  // groupByIntention(items)
export const selectLogisticTasksIntentionCounts
export const selectLogisticTasksIsLoading
export const selectLogisticTasksHasLoaded
export const selectLogisticTasksErrorMessage
export const selectLogisticTasksFiltersRequestKey  // serializeFiltersForRequestKey(filters)
export const selectLogisticTasksActiveIntentionTab
export const selectLogisticTasksBatchNotification
```

**Active intention tab persistence:**
On `setActiveIntentionTab`, write `JSON.stringify(tab)` to
`localStorage.setItem("logistic-tasks:activeTab", ...)`.
On store init, read from localStorage to restore the tab.

---

## API Modules

### `api/get-logistic-tasks.api.ts`

`GET /logistic/items?{params}` — accepts `LogisticTaskFilters` + optional `ids`
(comma-separated, for targeted WS refetch):

```typescript
export async function getLogisticTasksApi(
  filters: LogisticTaskFilters,
  ids?: string[],
): Promise<GetLogisticTasksResponseDto>
```

Internally calls `buildApiQueryParams(filters)`, appends `ids` if provided.

### `api/mark-intention.api.ts`

`POST /logistic/intentions` — body: `MarkIntentionRequestDto`

### `api/mark-placement.api.ts`

`POST /logistic/placements` — body: `MarkPlacementRequestDto`

### `api/fulfil-item.api.ts`

`POST /logistic/fulfil` — body: `FulfilItemRequestDto`

---

## Controllers

### `controllers/logistic-tasks.controller.ts`

**`loadLogisticTasksController(filters, query)`**
1. Increment request sequence; store `activeRequestId`
2. `store.setLoading(true)`, `store.setErrorMessage(null)`
3. `getLogisticTasksApi(filters)`
4. Normalise response → flat items array
5. `store.hydrateAndFinish(items)`
6. Guards stale request (request sequence mismatch → discard)

**`refreshLogisticTasksByIdsController(ids: string[], currentFilters)`**
1. Calls `getLogisticTasksApi(currentFilters, ids)`
2. For each returned item: `store.upsertItem(item)` — replaces by `id`
3. For each `id` NOT returned by the server: `store.removeItem(id)` — item was
   fulfilled or no longer matches filters

> This is the WS realtime path. It does not set `isLoading` to avoid spinner
> flash on background refreshes.

### `controllers/logistic-tasks-optimistic.controller.ts`

**`optimisticMarkIntention(scanHistoryId, intention, fixItem, scheduledDate)`**
1. Find item in store by `id === scanHistoryId`
2. Return if not found
3. Build updated item: apply new intention/fixItem/scheduledDate + set
   `lastEventType: "marked_intention"`, clear `logisticLocation`
4. `store.upsertItem(updatedItem)`
5. Return the previous item (for rollback)

**`optimisticMarkPlacement(scanHistoryId, locationRecord)`**
1. Find item, build update: set `lastEventType: "placed"`,
   `logisticLocation: locationRecord.location`,
   `logisticZoneType: locationRecord.zoneType`
2. `store.upsertItem(updatedItem)`
3. Return previous item

---

## Actions

### `actions/logistic-tasks.actions.ts`

```typescript
export const logisticTasksActions = {

  // Initial and filter-driven load
  async loadTasks(): Promise<void> {
    const { filters, query } = useLogisticTasksStore.getState();
    await loadLogisticTasksController(filters, query);
  },

  setFilters(partial: Partial<LogisticTaskFilters>): void {
    useLogisticTasksStore.getState().setFilters(partial);
  },

  setQuery(q: string): void {
    useLogisticTasksStore.getState().setQuery(q);
  },

  setActiveIntentionTab(tab: LogisticIntention | null): void {
    useLogisticTasksStore.getState().setActiveIntentionTab(tab);
  },

  openFilters(): void {
    homeShellActions.openOverlayPage("logistic-tasks-filters", "Filter tasks");
  },

  // Mark intention (seller action)
  async markIntention(
    scanHistoryId: string,
    intention: LogisticIntention,
    fixItem: boolean,
    scheduledDate?: string,
  ): Promise<void> {
    const prev = optimisticMarkIntention(scanHistoryId, intention, fixItem, scheduledDate);
    homeShellActions.closeOverlayPage();  // close the intention overlay

    try {
      await markIntentionApi({ scanHistoryId, intention, fixItem, scheduledDate });
    } catch {
      if (prev) store.upsertItem(prev);   // rollback
      store.setErrorMessage("Unable to mark intention. Please try again.");
    }
  },

  // Placement scanner entry point (worker/manager action)
  openPlacementScanner(scanHistoryId: string): void {
    useScannerLogisticPlacementStore.getState().setScanHistoryId(scanHistoryId);
    homeShellActions.openFullFeaturePage("scanner-logistic-placement");
  },

  closePlacementScanner(): void {
    useScannerLogisticPlacementStore.getState().reset();
    homeShellActions.closeFullFeature();
  },

  // Called from scanner placement page after location confirmed
  async markPlacement(scanHistoryId: string, locationId: string): Promise<void> {
    const locations = useLogisticLocationsStore.getState().locations;
    const locationRecord = locations.find((l) => l.id === locationId) ?? null;
    const prev = locationRecord
      ? optimisticMarkPlacement(scanHistoryId, locationRecord)
      : null;

    try {
      await markPlacementApi({ scanHistoryId, logisticLocationId: locationId });
    } catch {
      if (prev) store.upsertItem(prev);
      // Error is surfaced in scanner page, not in task list
    }
  },

  // Dismiss batch notification banner
  dismissBatchNotification(): void {
    useLogisticTasksStore.getState().setBatchNotification(null);
  },

  // WS realtime refresh (called by realtime flow)
  async refreshByIds(ids: string[]): Promise<void> {
    const { filters } = useLogisticTasksStore.getState();
    await refreshLogisticTasksByIdsController(ids, filters);
  },
};
```

---

## Flows

### `flows/use-logistic-tasks.flow.ts`

Three effects, same pattern as `use-item-scan-history.flow.ts`:

1. **Initial load** — fires when `hasLoaded === false`
2. **Filter/query change re-fetch** — debounced (300ms), fires when
   `filtersRequestKey` or `query` changes (after initial load)
3. **Loading visibility** — delayed visibility (180ms initial, 400ms refresh)
4. **Pull-to-refresh** — same touch gesture pattern as item-scan-history

### `flows/use-logistic-tasks-realtime.flow.ts`

Registered in `HomeFeature.tsx` alongside `useItemScanHistoryRealtimeFlow`.

Subscribes to three WS events. Each handler:
1. Deduplicates by scanHistoryId (last refresh timestamp map, 750ms window)
2. Calls `logisticTasksActions.refreshByIds([scanHistoryId])`

For `logistic_batch_notification`:
1. `useLogisticTasksStore.getState().setBatchNotification({ count, message })`
2. Auto-dismiss after 8 seconds (`window.setTimeout`)

```typescript
export function useLogisticTasksRealtimeFlow(): void {
  useWsEvent("logistic_intention_set",  handler);
  useWsEvent("logistic_item_placed",    handler);
  useWsEvent("logistic_item_fulfilled", handler);
  useWsEvent("logistic_batch_notification", notificationHandler);
}
```

---

## Filters Panel

### `ui/LogisticTasksFiltersPanel.tsx`

Rendered inside the `LogisticTasksOverlayHost` (in `HomeFeature` overlay content).

Shows only the filter controls whose `key` is in `task_page_allowed_filters`
(read via `useRoleCapabilities()`).

Available controls (when allowed):
- `fixItem` — toggle: "Fix required"
- `lastLogisticEventType` — segmented selector: "marked intention / placed / fulfilled"
- `zoneType` — segmented selector: "for delivery / for pickup / for fixing"
- `intention` — multi-select chips: all four intentions
- `orderId` — text input

Each control reads/writes `logisticTasksActions.setFilters(...)`.

---

## UI Components

### `ui/LogisticTasksPage.tsx`

```
<section>
  {batchNotification && <LogisticTasksBatchNotificationBanner />}

  <div px-5>
    <LogisticTasksHeader
      query={query}
      activeFilterCount={countActiveFilters(filters)}
      onChangeQuery={setQuery}
      onOpenFilters={openFilters}
    />
  </div>

  {task_intention_tab_menu && (
    <LogisticTasksTabMenu
      intentionCounts={intentionCounts}
      activeTab={activeIntentionTab}
      onSelectTab={setActiveIntentionTab}
    />
  )}

  <div ref={scrollContainerRef} overflow-y-auto>
    {loading skeleton | empty state | error state}
    <LogisticTasksList
      groups={visibleGroups}         // filtered by activeIntentionTab when tab menu active
      cardAction={task_intention_card_action}
      scrollContainerRef={scrollContainerRef}
    />
  </div>
</section>
```

**Visible groups derivation:**
```typescript
// In the page (or a selector):
const allGroups = selectLogisticTasksOrderGroups(state);

const visibleGroups = task_intention_tab_menu && activeIntentionTab
  ? allGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.intention === activeIntentionTab),
      }))
      .filter((group) => group.items.length > 0)
  : allGroups;
```

### `ui/LogisticTasksTabMenu.tsx`

Renders below the header. One tab per intention that has items:

```
[store_pickup 3] [local_delivery 7] [international_shipping 1]
```

- Active tab is underlined / highlighted
- Count is a small pill badge beside the label
- Uses `LOGISTIC_INTENTION_LABELS` for display text
- Tabs ordered by `LOGISTIC_INTENTION_ORDER`

### `ui/LogisticTasksList.tsx`

Renders `LogisticOrderGroup[]`:

```
<div flex flex-col gap-4>
  {groups.map((group, index) => (
    <>
      {index > 0 && <div className="h-8" />}   {/* bigger gap between order groups */}

      {group.orderId && (
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Order {group.orderId}
        </p>
      )}

      <div flex flex-col gap-3>
        {group.items.map((item) => (
          <LogisticTasksCard key={item.id} item={item} cardAction={cardAction} />
        ))}
      </div>
    </>
  ))}
</div>
```

Uses same intersection-observer virtual scroll pattern as `ItemScanHistoryList`
(initial 12, batch 10).

### `ui/LogisticTasksCard.tsx`

```
<article rounded-xl border bg-white shadow>
  <div flex items-center gap-3 p-3>
    <img src={item.imageUrl} className="h-14 w-14 rounded-lg object-cover" />

    <div flex-1 min-w-0>
      <p className="text-sm font-semibold">{item.sku ?? item.itemTitle}</p>
      <p className="text-xs text-slate-500">{item.itemType}</p>
      {item.logisticLocation && (
        <p className="text-xs text-slate-500">📍 {item.logisticLocation}</p>
      )}
      {item.scheduledDate && (
        <p className="text-xs text-slate-500">
          🗓 {formatScheduledDate(item.scheduledDate)}
        </p>
      )}
    </div>

    <ActionButton cardAction={cardAction} item={item} />
  </div>
</article>
```

`ActionButton` renders:
- `markItemIntention` → "Set Intention" button → calls `openMarkIntentionOverlay(item.id)`
- `markItemPlacement` → "Place" button → calls `logisticTasksActions.openPlacementScanner(item.id)`

### `ui/MarkIntentionOverlay.tsx`

Opened via `homeShellActions.openOverlayPage("logistic-tasks-mark-intention", "Set Intention")`.

The overlay receives `scanHistoryId` via the `LogisticTasksOverlayHost` context.

```
<SlidingOverlayContainer (already rendered by HomeFeature)>
  <div flex flex-col gap-6 p-5>
    <h2>Set Intention</h2>

    {/* Intention boxes — one per intention, single-select */}
    <div grid grid-cols-2 gap-3>
      {LOGISTIC_INTENTION_ORDER.map(intention => (
        <button
          key={intention}
          className={`rounded-xl border p-4 text-sm font-semibold
            ${selected === intention ? "border-green-500 bg-green-50" : "border-slate-200"}`}
          onClick={() => setSelected(intention)}
        >
          {LOGISTIC_INTENTION_LABELS[intention]}
        </button>
      ))}
    </div>

    {/* Fix item switch */}
    <div flex items-center justify-between>
      <label className="text-sm font-medium">Fix item</label>
      <Switch checked={fixItem} onChange={setFixItem} />
    </div>

    {/* Scheduled date picker */}
    <div>
      <label className="text-sm font-medium">Scheduled date (optional)</label>
      <input
        type="date"
        min={todayIso}
        value={scheduledDate}
        onChange={(e) => setScheduledDate(e.target.value)}
      />
      {dateWarning && (
        <p className="text-xs text-amber-600">
          Date is in the past. Are you sure?
          <button onClick={confirmPastDate}>Confirm</button>
        </p>
      )}
    </div>

    {/* Validation: intention required */}
    {validationError && <p className="text-sm text-rose-600">{validationError}</p>}

    <button
      disabled={isSubmitting || !selected}
      onClick={handleSubmit}
    >
      {isSubmitting ? "Saving..." : "Save Intention"}
    </button>
  </div>
</SlidingOverlayContainer>
```

**Validation rules:**
- At least one intention box must be selected — show inline error if submit
  attempted without selection
- `scheduledDate` is optional, but if the selected date is earlier than today,
  show a warning with "Confirm" — the user must explicitly confirm before
  submitting (past date allowed after confirmation)

**Submit:**
1. Set `isSubmitting = true`
2. Call `logisticTasksActions.markIntention(scanHistoryId, intention, fixItem, scheduledDate)`
3. Overlay closes on action (action calls `homeShellActions.closeOverlayPage()`)
4. Live filters keep list clean (item with `intention` set will leave seller's
   `noIntention` view automatically)

### `ui/LogisticTasksBatchNotificationBanner.tsx`

Displayed at the top of the task page when `batchNotification` is non-null.

```
<div className="mx-5 rounded-xl bg-amber-50 border border-amber-300 px-3 py-2 flex items-center justify-between">
  <p className="text-sm font-semibold text-amber-800">{message}</p>
  <button onClick={logisticTasksActions.dismissBatchNotification}>×</button>
</div>
```

Auto-dismissed after 8 seconds (timer managed in the realtime flow).

---

## LogisticTasksOverlayHost

```
src/features/logistic-tasks/LogisticTasksOverlayHost.tsx
```

Same pattern as `ItemScanHistoryOverlayHost`. Reads `overlayPageId` from the
home shell store and conditionally renders the correct overlay content.

Overlay page IDs managed by this host:
- `"logistic-tasks-filters"` → `<LogisticTasksFiltersPanel />`
- `"logistic-tasks-mark-intention"` → `<MarkIntentionOverlay />`

The host also provides a context that carries `activeScanHistoryId` (set before
opening the overlay) so `MarkIntentionOverlay` knows which item to act on.

---

## Scanner Logistic Placement Page

Lives in `features/scanner/` because it uses the scanner engine, but is
registered by `HomeFeature` as a full-overlay page and triggered exclusively by
`logistic-tasks`.

### `features/scanner/stores/scanner-logistic-placement.store.ts`

```typescript
interface ScannerLogisticPlacementStoreState {
  scanHistoryId: string | null;
  confirmedLocationId: string | null;  // after successful placement
  confirmedLocationName: string | null;
  warning: string | null;             // invalid scan warning text
  isPlacing: boolean;
  setScanHistoryId: (id: string | null) => void;
  setConfirmedLocation: (id: string, name: string) => void;
  setWarning: (w: string | null) => void;
  setPlacing: (v: boolean) => void;
  reset: () => void;
}
```

### `features/scanner/ui/ScannerLogisticPlacementPage.tsx`

Full-page scanner, `presentation: "full-overlay"` in HomeFeature.

**Two visual states:**

**State A — Scanning** (`confirmedLocationId === null`):
```
<header>
  <BackArrowButton onClick={logisticTasksActions.closePlacementScanner} />
  <h1>Logistic Placement</h1>
</header>

<CameraView />          ← reuses scanner camera infrastructure

<LocationManualInputPanel   ← existing scanner component, adapted for locations
  query={locationSearchQuery}
  onChangeQuery={setManualLocationSearchQuery}
  results={locationSearchResults}    ← searched from logistic-locations store
  onSelectResult={handleLocationSelected}
/>

{warning && (
  <WarningPopup
    message={warning}
    onClose={() => store.setWarning(null)}
  />
)}
```

**State B — Placed** (`confirmedLocationId !== null`):
```
<header>
  <h1>Logistic Placement</h1>
</header>

<div>
  <p>Placed at: {confirmedLocationName}</p>
</div>

<div flex gap-3>
  <button onClick={handleChangeLocation}>
    Change Location
  </button>
  <button onClick={logisticTasksActions.closePlacementScanner}>
    Complete
  </button>
</div>
```

**Scan decode logic** (inside the scanner camera callback):
1. Extract decoded value
2. `const match = findLocationByValue(logisticLocationsStore.locations, decodedValue)`
3. If `!match` → `store.setWarning("Location not recognised. Check the QR code.")` → do NOT submit
4. If `match` → call `logisticTasksActions.markPlacement(scanHistoryId, match.id)` → set confirmed state

**Manual location search logic:**
- User types in `LocationManualInputPanel`
- Search runs against `logisticLocationsStore.locations` client-side using
  `filterLogisticLocations(locations, query)` — no API call needed since
  locations are already in the store from bootstrap
- Selecting a result triggers the same flow as a successful scan

**"Change Location" (regret):**
1. `store.setConfirmedLocation(null, null)` — back to State A
2. The scanner resumes (camera is always running in the background)
3. User scans again → calls `markPlacement` with the new location
4. This calls `POST /logistic/placements` again with the new locationId —
   the backend handles repeated placement calls (creates a new `placed` event)

**Warning popup:** Simple modal overlay: warning text + a "Close" button.
No action, just informational.

### Registration in HomeFeature.tsx

```typescript
import { ScannerLogisticPlacementPage } from "../scanner/ui/ScannerLogisticPlacementPage";

// In registeredPages:
{
  id: "scanner-logistic-placement",
  title: "Logistic Placement",
  component: ScannerLogisticPlacementPage,
  presentation: "full-overlay",
},
```

---

## Context

### `context/logistic-tasks-page-context.ts` + `.context.tsx`

Carries the `activeScanHistoryId` for the overlay (prevents passing it via
store which would affect non-overlay renders):

```typescript
interface LogisticTasksPageContext {
  activeScanHistoryId: string | null;
  openMarkIntention: (scanHistoryId: string) => void;
}
```

Provided by a wrapper around `LogisticTasksPage`. The `openMarkIntention`
function:
1. Sets `activeScanHistoryId` in context state
2. Calls `homeShellActions.openOverlayPage("logistic-tasks-mark-intention", "Set Intention")`

---

## Data / State Lifecycle

```
Bootstrap
  → hydrateLogisticLocationsFromBootstrap()
  → logisticLocationsStore.locations populated

Page mount (LogisticTasksPage)
  → useRoleCapabilities() → task_page_default_filters → buildFiltersFromRoleDefaults()
  → store.setFilters(roleDefaults)  [only on first mount, not on re-render]
  → useLogisticTasksFlow() → loadLogisticTasksController(filters)
  → GET /logistic/items?{params}
  → normalizeLogisticTasksPage(response)
  → store.hydrateAndFinish(items)
  → selectLogisticTasksOrderGroups → LogisticTasksList renders groups

WS event arrives (e.g. logistic_item_placed)
  → useLogisticTasksRealtimeFlow handler
  → refreshLogisticTasksByIdsController([scanHistoryId])
  → GET /logistic/items?ids={scanHistoryId}&{currentFilters}
  → returned items: store.upsertItem(item)
  → missing items (fulfilled/filtered out): store.removeItem(id)
  → selector recomputes → UI updates

Seller marks intention
  → MarkIntentionOverlay submit
  → optimisticMarkIntention() → store.upsertItem(updatedItem)
  → MarkIntentionOverlay closes
  → POST /logistic/intentions
  → WS event logistic_intention_set → refreshByIds() → confirms/corrects
  → Live selector (seller filter: noIntention=true) → item drops off list

Worker marks placement
  → logistic-tasks opens scanner-logistic-placement
  → Scan → validate → optimisticMarkPlacement()
  → POST /logistic/placements
  → WS event logistic_item_placed → refreshByIds()
  → Worker filter (lastLogisticEventType=marked_intention) → item drops off list
```

---

## Risks and Assumptions

| Risk | Mitigation |
|---|---|
| WS event arrives before API call completes | Dedupe window (750ms) prevents double refresh |
| Scanner placement page camera conflicts with main scanner | Each is a separate full-overlay; only one is open at a time |
| `noIntention` backend filter not yet deployed | Feature flags not used — task list shows empty for sellers until backend is deployed |
| scheduledDate past-date confirmation adds complexity | Warning is inline, not a modal — reduces code surface |
| Bootstrap doesn't include logistic locations for non-shop accounts | `hydrateLogisticLocationsFromBootstrap` called with empty array — store stays empty, no crash |
| `recentlyAddedIds` grows unbounded in session | Reset on `hydrateLogisticLocationsController` call (page re-enter) |
