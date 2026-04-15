# Phase 1 — Foundation Contracts — Completed

**Source plan:** `docs/under_development/LOGISTIC_FRONTEND_OVERVIEW.md` + `LOGISTIC_ROLE_CONTEXT_PLAN.md`

---

## What was implemented

### Modified: `src/features/auth/types/auth.dto.ts`

- Extended `role` union from `"admin" | "worker"` to `"admin" | "manager" | "worker" | "seller"`.

### Modified: `src/core/ws-client/ws-events.ts`

Added four new inbound WebSocket event types for the logistic system:

- `logistic_intention_set` — fired when a user sets an intention on a scan history item.
- `logistic_item_placed` — fired when an item is placed at a logistic location.
- `logistic_item_fulfilled` — fired when an item is marked as fulfilled.
- `logistic_batch_notification` — fired when a batch of items arrive matching active filters.

### Modified: `src/features/bootstrap/types/bootstrap.dto.ts`

- Added `LogisticLocationBootstrapDto` interface.
- Extended `BootstrapPayloadDto` with `logisticLocations: LogisticLocationBootstrapDto[]` and `vapidPublicKey: string`.

### Created: `src/features/role-context/`

Full role-context feature (5 files):

| File                                | Purpose                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------ |
| `types/role-context.types.ts`       | `UserRole`, `LogisticTaskFilterKey`, `LogisticTaskDefaultFilter`, `LogisticTaskCardAction`, `RoleCapabilities` interface |
| `domain/role-context.domain.ts`     | `buildRoleCapabilities(role)` — maps each role to its capabilities                                                       |
| `context/role-context.ts`           | `RoleContext = createContext<RoleCapabilities                                                                            | null>(null)` |
| `providers/RoleContextProvider.tsx` | Wraps children, derives capabilities from `user.role` via `useMemo`                                                      |
| `hooks/use-role-capabilities.ts`    | `useRoleCapabilities()` — throws if used outside provider                                                                |

## Role capability matrix

| Capability                          | admin               | manager             | worker              | seller |
| ----------------------------------- | ------------------- | ------------------- | ------------------- | ------ |
| `can_display_main_stats`            | ✓                   | ✓                   | ✗                   | ✗      |
| `can_manage_logistic_locations`     | ✓                   | ✓                   | ✗                   | ✗      |
| `can_see_logistic_tasks`            | ✓                   | ✓                   | ✓                   | ✗      |
| `can_mark_intention`                | ✓                   | ✓                   | ✓                   | ✗      |
| `can_mark_placement`                | ✓                   | ✓                   | ✓                   | ✗      |
| `task_page_default_filter`          | `all`               | `all`               | `pending`           | `all`  |
| `task_page_allowed_filters`         | all                 | all                 | `[pending, placed]` | `[]`   |
| `default_logistic_task_card_action` | `markItemIntention` | `markItemIntention` | `markItemPlacement` | none   |
