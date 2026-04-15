# Phase 2 — Logistic Locations — Completed

**Source plan:** `docs/under_development/LOGISTIC_LOCATIONS_PLAN.md`

---

## What was implemented

### Feature: `src/features/logistic-locations/`

Full CRUD feature for managing logistic locations (zone assignments used during item placement).

#### Types

| File                                | Contents                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `types/logistic-locations.dto.ts`   | `LogisticLocationDto`, `CreateLogisticLocationDto`, `UpdateLogisticLocationDto`, `GetLogisticLocationsResponseDto` |
| `types/logistic-locations.types.ts` | `LogisticZoneType` union, `LogisticLocationRecord` domain model                                                    |

#### Domain (`domain/logistic-locations.domain.ts`)

- `LOGISTIC_ZONE_TYPE_LABELS` — human-readable labels for zone types.
- `LOGISTIC_ZONE_TYPES` — ordered array of zone type values.
- `normalizeLogisticLocation(dto)` / `normalizeLogisticLocations(dtos)` — DTO → record.
- `filterLogisticLocations(locations, query)` — client-side search.
- `sortWithRecentFirst(locations, recentlyAddedIds)` — promotes recently added items.
- `findLocationByValue(locations, value)` — case-insensitive exact match (used by scanner).

#### Store (`stores/logistic-locations.store.ts`)

Zustand store with:

- `locations`, `query`, `selectedZoneType`, `expandedId`, `hasHydrated`, `recentlyAddedIds`
- `replaceRecentlyAddedId(old, new)` — swaps optimistic ID for server ID on confirm.
- Selectors: `selectLogisticLocations`, `selectLogisticLocationsFilteredSorted`, `selectLogisticLocationsHasHydrated`, `selectLogisticLocationsQuery`

#### API

- `api/get-logistic-locations.api.ts` — `GET /logistic/locations`
- `api/create-logistic-location.api.ts` — `POST /logistic/locations`
- `api/update-logistic-location.api.ts` — `PATCH /logistic/locations/:id`
- `api/delete-logistic-location.api.ts` — `DELETE /logistic/locations/:id`

#### Controllers (`controllers/logistic-locations.controller.ts`)

- `hydrateLogisticLocationsController()` — fetches all locations, sets `hasHydrated = true`.
- `createLogisticLocationController(dto)` — optimistic add (temp ID), confirms with server ID.
- `deleteLogisticLocationController(id)` — optimistic remove, rollback on error.

#### Actions (`actions/logistic-locations.actions.ts`)

Public interface: `hydrate`, `setQuery`, `setSelectedZoneType`, `toggleExpanded`, `createLocation`, `deleteLocation`, `backToSettings`.

#### Flows

- `flows/use-logistic-locations.flow.ts` — `useLogisticLocationsFlow()`: hydrates on mount if not yet hydrated.
- `flows/logistic-locations-bootstrap.flow.ts` — `hydrateLogisticLocationsFromBootstrap(dtos)`: non-hook, consumed by bootstrap controller on first app load.

#### UI

- `ui/LogisticZoneTypePicker.tsx` — 3-column grid of zone type selector buttons with colour coding.
- `ui/LogisticLocationsSettingsPage.tsx` — full settings page: search, expandable location cards with zone type badge, inline create/delete.

### Modified: `src/features/bootstrap/controllers/bootstrap.controller.ts`

- Imports and calls `hydrateLogisticLocationsFromBootstrap` after `setPayload`, seeding the store from bootstrap data on first load.

### Modified: `src/features/home/HomeFeature.tsx`

- Added `LogisticLocationsSettingsPage` page registration (`settings-logistic-locations`, full-overlay).
