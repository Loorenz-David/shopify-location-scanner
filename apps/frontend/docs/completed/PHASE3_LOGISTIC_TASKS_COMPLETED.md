# Phase 3 — Logistic Tasks — Completed

**Source plans:** `docs/under_development/LOGISTIC_TASKS_PLAN.md` + `LOGISTIC_FRONTEND_OVERVIEW.md`

---

## What was implemented

### Feature: `src/features/logistic-tasks/`

Full logistic tasks management including real-time updates, role-gated UI, and barcode placement scanning.

#### Types

| File                            | Contents                                                                                                                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `types/logistic-tasks.dto.ts`   | `LogisticTaskItemDto`, `LogisticOrderGroupDto`, `GetLogisticTasksQueryDto`, `GetLogisticTasksResponseDto`, `MarkIntentionRequestDto`, `MarkPlacementRequestDto`, `FulfilItemRequestDto` |
| `types/logistic-tasks.types.ts` | `LogisticIntention`, `LogisticEventType`, `LogisticZoneType`, `LogisticTaskItem`, `LogisticOrderGroup`, `LogisticTaskFilters`                                                           |

#### Domain

- `domain/logistic-tasks.domain.ts` — labels, ordering constants, normalize functions, `buildOrderGroups`, `groupByIntention`, `countByIntention`, `buildFiltersFromRoleDefaults`, `buildApiQueryParams`, `formatScheduledDate`.
- `domain/logistic-tasks-filters.domain.ts` — `defaultLogisticTaskFilters`, `countActiveLogisticTaskFilters`, `serializeFiltersForRequestKey`.

#### Store (`stores/logistic-tasks.store.ts`)

- `activeIntentionTab` persisted to `localStorage("logistic-tasks:activeTab")`.
- `incrementRequestId()` used as a stale-request guard.
- 9 exported selectors.

#### API

- `api/get-logistic-tasks.api.ts` — `GET /logistic/items?{params}`
- `api/mark-intention.api.ts` — `POST /logistic/intentions`
- `api/mark-placement.api.ts` — `POST /logistic/placements`
- `api/fulfil-item.api.ts` — `POST /logistic/fulfil`

#### Controllers

- `controllers/logistic-tasks.controller.ts` — `loadLogisticTasksController` (stale request guard), `refreshLogisticTasksByIdsController` (silent refresh).
- `controllers/logistic-tasks-optimistic.controller.ts` — `optimisticMarkIntention`, `optimisticMarkPlacement` (both return previous item for rollback).

#### Actions (`actions/logistic-tasks.actions.ts`)

`loadTasks`, `setFilters`, `setQuery`, `setActiveIntentionTab`, `openFilters`, `openMarkIntentionOverlay`, `markIntention`, `openPlacementScanner`, `closePlacementScanner`, `markPlacement`, `dismissBatchNotification`, `refreshByIds`, `resetFilters`.

- `openMarkIntentionOverlay` encodes `scanHistoryId` in the overlay ID: `"logistic-tasks-mark-intention:{scanHistoryId}"`.
- `openPlacementScanner` sets `scanHistoryId` in the placement scanner store and calls `openFullFeaturePage("scanner-logistic-placement")`.

#### Flows

- `flows/use-logistic-tasks.flow.ts` — `useLogisticTasksFlow` (role-default filters on first load, debounced refetch on filter/query change), `useLogisticTasksLoadingVisibilityFlow`, `useLogisticTasksReloadCallback`.
- `flows/use-logistic-tasks-realtime.flow.ts` — `useLogisticTasksRealtimeFlow()` subscribes to all 4 logistic WS events; batch notification auto-dismisses after 8 s.

#### Context

- `context/logistic-tasks-page-context.ts` — `LogisticTasksPageContext` with `activeScanHistoryId` + `openMarkIntention`.
- `context/logistic-tasks-page.context.tsx` — `LogisticTasksPageProvider`.

#### UI components

| File                                          | Purpose                                                                                         |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `ui/LogisticTasksHeader.tsx`                  | Search bar + filter button (badge shows active filter count)                                    |
| `ui/LogisticTasksTabMenu.tsx`                 | Intention tab switcher (ordered by `LOGISTIC_INTENTION_ORDER`)                                  |
| `ui/LogisticTasksLoadingCards.tsx`            | 4 skeleton placeholder cards                                                                    |
| `ui/LogisticTasksCard.tsx`                    | Item card with role-gated primary/secondary actions                                             |
| `ui/LogisticTasksList.tsx`                    | Virtual-scroll list via `IntersectionObserver` (initial 12, batch 10), with order-group headers |
| `ui/LogisticTasksBatchNotificationBanner.tsx` | Amber banner with dismiss button                                                                |
| `ui/LogisticTasksFiltersPanel.tsx`            | Role-gated filter overlay panel                                                                 |
| `ui/MarkIntentionOverlay.tsx`                 | Intention grid, fix-item switch, date picker with past-date warning modal                       |
| `ui/LogisticTasksPage.tsx`                    | Composed page wrapped in `LogisticTasksPageProvider`                                            |

#### Overlay host

`LogisticTasksOverlayHost.tsx` — routes to `LogisticTasksFiltersPanel` or `MarkIntentionOverlay` depending on overlay ID.

---

### Feature extension: `src/features/scanner/`

#### `stores/scanner-logistic-placement.store.ts`

New Zustand store: `scanHistoryId`, `confirmedLocationId`, `confirmedLocationName`, `warning`, `isPlacing` + setters + `reset()`.

#### `flows/use-logistic-placement-scanner.flow.ts`

Minimal `BrowserMultiFormatReader`-based camera flow. Uses region ID `"logistic-placement-qr-reader"`. Single `onDecode` callback ref pattern prevents stale closure issues. 1.5 s debounce prevents duplicate decodes from the same barcode.

#### `ui/ScannerLogisticPlacementPage.tsx`

Full-page placement scanner presented as a `full-overlay` from the home shell.

- **State A (scanning):** Live camera view, guide reticle, back button, manual type-search panel, warning banner on unrecognised scan.
- **State B (confirmed):** Success panel with location name, "Change Location" (returns to State A), "Complete" (calls `closePlacementScanner`).
- Scan decode → `findLocationByValue(locations, decoded)` → match: `markPlacement` + store confirmed; no match: warning banner.
- Manual input → `filterLogisticLocations` client-side → selecting a result follows the same flow as a scan match.

---

### Modified: `src/App.tsx`

- Wraps `<HomeFeature>` in `<RoleContextProvider user={authenticatedUser}>`.

### Modified: `src/features/home/HomeFeature.tsx`

- Calls `useLogisticTasksRealtimeFlow()` alongside the existing `useItemScanHistoryRealtimeFlow()`.
- Reads `can_display_main_stats` from `useRoleCapabilities()` to gate analytics bottom-nav visibility.
- Registers `logistic-tasks` page (bottom nav, left slot, order 5).
- Registers `scanner-logistic-placement` page (full-overlay).
- Changes analytics slot order from 5 → 15; `visible: can_display_main_stats`.
- Adds `<LogisticTasksOverlayHost>` to the shared overlay content.
