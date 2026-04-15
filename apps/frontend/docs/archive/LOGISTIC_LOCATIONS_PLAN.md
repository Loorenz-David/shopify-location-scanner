# LOGISTIC LOCATIONS — FRONTEND PLAN

## Purpose

A settings sub-page for creating, searching, and deleting logistic locations
(physical zones items are placed in during logistics processing). It mirrors the
`LocationOptionsSettingsPage` pattern.

The feature also exposes a bootstrap injection hook consumed by the bootstrap
controller to pre-populate the store from the bootstrap payload.

The `logistic-tasks` feature reads the locations store directly when validating
scanned barcodes against known locations.

---

## Feature Location

```
src/features/logistic-locations/
  types/
    logistic-locations.dto.ts
    logistic-locations.types.ts
  domain/
    logistic-locations.domain.ts
  api/
    get-logistic-locations.api.ts
    create-logistic-location.api.ts
    update-logistic-location.api.ts
    delete-logistic-location.api.ts
  stores/
    logistic-locations.store.ts
  controllers/
    logistic-locations.controller.ts
  actions/
    logistic-locations.actions.ts
  flows/
    use-logistic-locations.flow.ts
    logistic-locations-bootstrap.flow.ts   ← consumed by bootstrap controller
  ui/
    LogisticLocationsSettingsPage.tsx
    LogisticZoneTypePicker.tsx             ← zone type selection boxes (shown pre-creation)
```

---

## Types

### `types/logistic-locations.dto.ts`

Mirrors backend `LogisticLocationDto`:

```typescript
export interface LogisticLocationDto {
  id: string;
  shopId: string;
  location: string;
  zoneType: "for_delivery" | "for_pickup" | "for_fixing";
  createdAt: string; // ISO string
}

export interface GetLogisticLocationsResponseDto {
  locations: LogisticLocationDto[];
}

export interface CreateLogisticLocationRequestDto {
  location: string;
  zoneType: "for_delivery" | "for_pickup" | "for_fixing";
}

export interface CreateLogisticLocationResponseDto {
  location: LogisticLocationDto;
}

export interface UpdateLogisticLocationRequestDto {
  location?: string;
  zoneType?: "for_delivery" | "for_pickup" | "for_fixing";
}

export interface UpdateLogisticLocationResponseDto {
  location: LogisticLocationDto;
}
```

### `types/logistic-locations.types.ts`

Domain-facing types (after normalisation):

```typescript
export type LogisticZoneType = "for_delivery" | "for_pickup" | "for_fixing";

export interface LogisticLocationRecord {
  id: string;
  shopId: string;
  location: string;
  zoneType: LogisticZoneType;
  createdAt: string;
}
```

---

## Domain

### `domain/logistic-locations.domain.ts`

```typescript
import type { LogisticLocationDto } from "../types/logistic-locations.dto";
import type { LogisticLocationRecord, LogisticZoneType } from "../types/logistic-locations.types";

export const LOGISTIC_ZONE_TYPE_LABELS: Record<LogisticZoneType, string> = {
  for_delivery:  "For Delivery",
  for_pickup:    "For Pickup",
  for_fixing:    "For Fixing",
};

export const LOGISTIC_ZONE_TYPES: LogisticZoneType[] = [
  "for_delivery",
  "for_pickup",
  "for_fixing",
];

export function normalizeLogisticLocation(dto: LogisticLocationDto): LogisticLocationRecord {
  return {
    id: dto.id,
    shopId: dto.shopId,
    location: dto.location,
    zoneType: dto.zoneType,
    createdAt: dto.createdAt,
  };
}

export function normalizeLogisticLocations(dtos: LogisticLocationDto[]): LogisticLocationRecord[] {
  return dtos.map(normalizeLogisticLocation);
}

/**
 * Client-side text search: matches the location name (case-insensitive).
 */
export function filterLogisticLocations(
  locations: LogisticLocationRecord[],
  query: string,
): LogisticLocationRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return locations;
  return locations.filter((loc) => loc.location.toLowerCase().includes(q));
}

/**
 * Sorts so that recently-added IDs float to the top.
 * The rest stay in their server-returned order (by createdAt desc).
 */
export function sortWithRecentFirst(
  locations: LogisticLocationRecord[],
  recentlyAddedIds: string[],
): LogisticLocationRecord[] {
  if (recentlyAddedIds.length === 0) return locations;
  const recentSet = new Set(recentlyAddedIds);
  return [
    ...locations.filter((l) => recentSet.has(l.id)),
    ...locations.filter((l) => !recentSet.has(l.id)),
  ];
}

/**
 * Find a location by its `location` string value (used by scanner validation).
 */
export function findLocationByValue(
  locations: LogisticLocationRecord[],
  value: string,
): LogisticLocationRecord | null {
  const q = value.trim().toLowerCase();
  return locations.find((l) => l.location.toLowerCase() === q) ?? null;
}
```

---

## Store

### `stores/logistic-locations.store.ts`

```typescript
interface LogisticLocationsStoreState {
  locations: LogisticLocationRecord[];
  query: string;
  recentlyAddedIds: string[];      // IDs to float to top in the current session
  expandedId: string | null;       // expanded card (for delete action)
  selectedZoneType: LogisticZoneType | null;  // zone picker selection state
  isLoading: boolean;
  hasHydrated: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  // setters
  setLocations: (locations: LogisticLocationRecord[]) => void;
  setQuery: (query: string) => void;
  addRecentlyAddedId: (id: string) => void;
  setExpandedId: (id: string | null) => void;
  setSelectedZoneType: (zone: LogisticZoneType | null) => void;
  setLoading: (v: boolean) => void;
  setHasHydrated: (v: boolean) => void;
  setSubmitting: (v: boolean) => void;
  setErrorMessage: (msg: string | null) => void;
  reset: () => void;
}
```

**Selectors to export:**
- `selectLogisticLocations` — raw list
- `selectFilteredLogisticLocations` — filtered + sorted with recent first
- `selectLogisticLocationsIsLoading`
- `selectLogisticLocationsErrorMessage`

---

## API Modules

### `api/get-logistic-locations.api.ts`
`GET /logistic/locations` — accepts optional `q` query param for server-side
search.

### `api/create-logistic-location.api.ts`
`POST /logistic/locations` — body: `{ location: string, zoneType: LogisticZoneType }`

### `api/update-logistic-location.api.ts`
`PATCH /logistic/locations/:id` — body: partial `{ location?, zoneType? }`

### `api/delete-logistic-location.api.ts`
`DELETE /logistic/locations/:id`

All API modules follow the same pattern as existing API files: use `apiClient`,
require auth, return typed response DTOs.

---

## Controller

### `controllers/logistic-locations.controller.ts`

Mirrors the `location-options-settings.controller.ts` pattern exactly:
optimistic mutation → API call → reconcile server response.

**`hydrateLogisticLocationsController()`**
1. `store.setLoading(true)`
2. Call `getLogisticLocationsApi()` (no query — load all)
3. `store.setLocations(normalizeLogisticLocations(response.locations))`
4. On error: `store.setErrorMessage("Unable to load logistic locations.")`
5. `store.setLoading(false)`, `store.setHasHydrated(true)`

**`createLogisticLocationController(location: string, zoneType: LogisticZoneType)`**
1. Validate non-empty, no exact duplicate (case-insensitive) — set error and return early if fails
2. Build optimistic record with a temporary `id` (`"optimistic-" + Date.now()`)
3. `store.setLocations([optimisticRecord, ...currentLocations])`
4. `store.addRecentlyAddedId(optimisticRecord.id)`
5. `store.setQuery("")`, `store.setSelectedZoneType(null)`
6. Call `createLogisticLocationApi({ location, zoneType })`
7. On success: replace optimistic record with server record; also replace
   `recentlyAddedIds` entry (swap temp id for real id)
8. On error: rollback locations, restore query, `store.setErrorMessage(...)`

**`deleteLogisticLocationController(id: string)`**
1. Optimistically remove from list; collapse expanded card
2. Call `deleteLogisticLocationApi(id)`
3. On error: rollback, `store.setErrorMessage(...)`

> `update` is intentionally omitted from the settings page (not in scope).
> The API module exists for future use.

---

## Actions

### `actions/logistic-locations.actions.ts`

```typescript
export const logisticLocationsActions = {
  async hydrate(): Promise<void> { ... },
  setQuery(query: string): void { ... },
  setSelectedZoneType(zone: LogisticZoneType | null): void { ... },
  toggleExpanded(id: string): void { ... },
  async createLocation(location: string, zoneType: LogisticZoneType): Promise<void> { ... },
  async deleteLocation(id: string): Promise<void> { ... },
  backToSettings(): void {
    homeShellActions.selectNavigationPage("settings");
  },
};
```

---

## Flows

### `flows/use-logistic-locations.flow.ts`

Triggers `logisticLocationsActions.hydrate()` on mount, only if not yet hydrated.
Pattern matches `use-location-options-settings.flow.ts`.

### `flows/logistic-locations-bootstrap.flow.ts`

Exported function (not a hook) consumed by `bootstrap.controller.ts`:

```typescript
export function hydrateLogisticLocationsFromBootstrap(
  dtos: LogisticLocationBootstrapDto[],
): void {
  const locations = normalizeLogisticLocations(dtos);
  useLogisticLocationsStore.getState().setLocations(locations);
  useLogisticLocationsStore.getState().setHasHydrated(true);
}
```

This means by the time the user opens the logistic-locations settings page or
the scanner placement page, locations are already in the store — no spinner
needed. The settings page flow skips the API fetch if `hasHydrated` is already
`true`.

---

## UI

### `ui/LogisticZoneTypePicker.tsx`

Shown when: the location search query is non-empty AND no matching locations
exist (same condition as the "Add option" button in `LocationOptionsSettingsPage`).

Renders three boxes, one per zone type, showing the label and a descriptive
icon/colour. Selecting a zone type:
1. Sets `selectedZoneType` in store
2. Calls `logisticLocationsActions.createLocation(query, zoneType)` immediately

If `selectedZoneType` is already set (picker was shown, user tapped away and
back), the previously selected type is highlighted.

### `ui/LogisticLocationsSettingsPage.tsx`

Mirrors `LocationOptionsSettingsPage.tsx` structure exactly:

```
<section> (scrollable, same gradient background)
  <header>
    <BackArrowButton onClick={logisticLocationsActions.backToSettings} />
    <SearchBar value={query} onChange={setQuery} placeholder="Search locations" />
  </header>

  {errorMessage && <ErrorBanner />}

  {isLoading && <SkeletonCard />}

  {!isLoading && (
    <div gap-2>
      {filteredSortedLocations.map(location => (
        <article key={location.id}>
          <button onClick={toggleExpanded}>
            <span>{location.location}</span>
            <ZoneTypePill zoneType={location.zoneType} />
            <ChevronIcon />
          </button>
          {isExpanded && (
            <div>
              <span className="text-sm text-slate-500">
                {LOGISTIC_ZONE_TYPE_LABELS[location.zoneType]}
              </span>
              <DeleteButton onClick={deleteLocation} disabled={isSubmitting} />
            </div>
          )}
        </article>
      ))}

      {filteredLocations.length === 0 && query.trim() && (
        <LogisticZoneTypePicker
          selectedZoneType={selectedZoneType}
          onSelect={logisticLocationsActions.setSelectedZoneType}
          onCreate={(zoneType) => logisticLocationsActions.createLocation(query, zoneType)}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  )}
</section>
```

Each card shows: location name + a small `ZoneTypePill` (`for_delivery` →
teal, `for_pickup` → amber, `for_fixing` → rose). This pill replaces the arrow
that `LocationOptionsSettingsPage` uses, since zone type is the key secondary
info for a location card.

---

## Settings Page Registration

In `HomeFeature.tsx`:
```typescript
{
  id: "settings-logistic-locations",
  title: "Logistic locations",
  component: LogisticLocationsSettingsPage,
  presentation: "full-overlay",
},
```

In `SettingsFeature` or `SettingsPage`, add a row that calls:
```typescript
homeShellActions.openFullFeaturePage("settings-logistic-locations")
```

---

## Store Exposure for logistic-tasks

The `logistic-tasks` scanner needs to validate a scanned value against known
locations. It imports directly from the store:

```typescript
import {
  useLogisticLocationsStore,
} from "../../logistic-locations/stores/logistic-locations.store";
import { findLocationByValue } from "../../logistic-locations/domain/logistic-locations.domain";

// In scanner placement logic:
const locations = useLogisticLocationsStore.getState().locations;
const match = findLocationByValue(locations, scannedValue);
```

This is a read-only cross-feature store access — acceptable per codebase
patterns (bootstrap controller already reads scanner store).
