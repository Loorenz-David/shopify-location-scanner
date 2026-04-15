# LOGISTIC ROLE CONTEXT — PLAN

## Purpose

A single React context that derives a `RoleCapabilities` object from the
authenticated user's role. Every feature reads this context instead of
reading the raw role string and branching inline.

The context wraps the app ABOVE the bootstrap/home shell layer in `App.tsx`.

---

## Feature Location

```
src/features/role-context/
  types/
    role-context.types.ts
  domain/
    role-context.domain.ts
  context/
    role-context.ts
  providers/
    RoleContextProvider.tsx
  hooks/
    use-role-capabilities.ts
```

---

## `types/role-context.types.ts`

```typescript
import type { LogisticIntention } from "../../../features/logistic-tasks/types/logistic-tasks.types";

export type UserRole = "admin" | "manager" | "worker" | "seller";

// The keys that appear in the API params for logistic tasks
export type LogisticTaskFilterKey =
  | "fixItem"
  | "lastLogisticEventType"
  | "zoneType"
  | "intention"
  | "orderId"
  | "noIntention";

export interface LogisticTaskDefaultFilter {
  key: LogisticTaskFilterKey;
  value: string | boolean | null;
}

export type LogisticTaskCardAction = "markItemIntention" | "markItemPlacement";

export interface RoleCapabilities {
  /**
   * Whether the Analytics page tab is visible and accessible.
   * false for "worker".
   */
  can_display_main_stats: boolean;

  /**
   * Default filters applied to the task page on mount.
   * Serialised to API query params by the logistic-tasks domain.
   */
  task_page_default_filters: LogisticTaskDefaultFilter[];

  /**
   * Filter keys the role is allowed to change in the filter panel.
   * The UI hides filter controls not present in this list.
   * Workers cannot use the "noIntention" / intention=null filter.
   */
  task_page_allowed_filters: LogisticTaskFilterKey[];

  /**
   * Whether intention tabs (grouped by LogisticIntention) are shown
   * below the task page header.
   */
  task_intention_tab_menu: boolean;

  /**
   * Which action the card primary button triggers.
   */
  task_intention_card_action: LogisticTaskCardAction;
}
```

---

## `domain/role-context.domain.ts`

Pure function — no imports from React, stores, or API.

```typescript
import type {
  LogisticTaskFilterKey,
  RoleCapabilities,
  UserRole,
} from "../types/role-context.types";

const ALL_FILTER_KEYS: LogisticTaskFilterKey[] = [
  "fixItem",
  "lastLogisticEventType",
  "zoneType",
  "intention",
  "orderId",
];

const WORKER_ALLOWED_FILTER_KEYS: LogisticTaskFilterKey[] = [
  "fixItem",
  "lastLogisticEventType",
  "zoneType",
  "orderId",
  // "intention" and "noIntention" excluded for workers
];

export function buildRoleCapabilities(role: UserRole): RoleCapabilities {
  switch (role) {
    case "manager":
      return {
        can_display_main_stats: true,
        task_page_default_filters: [
          { key: "lastLogisticEventType", value: "placed" },
          { key: "zoneType", value: "for_fixing" },
        ],
        task_page_allowed_filters: ALL_FILTER_KEYS,
        task_intention_tab_menu: true,
        task_intention_card_action: "markItemPlacement",
      };

    case "seller":
      return {
        can_display_main_stats: true,
        task_page_default_filters: [
          // noIntention=true → shows items with intention IS NULL
          { key: "noIntention", value: true },
        ],
        task_page_allowed_filters: ALL_FILTER_KEYS,
        task_intention_tab_menu: false,
        task_intention_card_action: "markItemIntention",
      };

    case "worker":
      return {
        can_display_main_stats: false,
        task_page_default_filters: [
          { key: "lastLogisticEventType", value: "marked_intention" },
        ],
        task_page_allowed_filters: WORKER_ALLOWED_FILTER_KEYS,
        task_intention_tab_menu: true,
        task_intention_card_action: "markItemPlacement",
      };

    case "admin":
    default:
      return {
        can_display_main_stats: true,
        task_page_default_filters: [],
        task_page_allowed_filters: ALL_FILTER_KEYS,
        task_intention_tab_menu: true,
        task_intention_card_action: "markItemPlacement",
      };
  }
}
```

---

## `context/role-context.ts`

```typescript
import { createContext } from "react";
import type { RoleCapabilities } from "../types/role-context.types";

export const RoleContext = createContext<RoleCapabilities | null>(null);
```

---

## `providers/RoleContextProvider.tsx`

Reads `user.role` from the `AuthUserDto` already held in `App.tsx` local state.
Recomputes when role changes (e.g. admin changes their own role, though rare).

```typescript
import { useMemo, type ReactNode } from "react";
import type { AuthUserDto } from "../../auth/types/auth.dto";
import { buildRoleCapabilities } from "../domain/role-context.domain";
import { RoleContext } from "../context/role-context";

interface RoleContextProviderProps {
  user: AuthUserDto;
  children: ReactNode;
}

export function RoleContextProvider({ user, children }: RoleContextProviderProps) {
  const capabilities = useMemo(
    () => buildRoleCapabilities(user.role),
    [user.role],
  );

  return (
    <RoleContext.Provider value={capabilities}>
      {children}
    </RoleContext.Provider>
  );
}
```

---

## `hooks/use-role-capabilities.ts`

```typescript
import { useContext } from "react";
import { RoleContext } from "../context/role-context";
import type { RoleCapabilities } from "../types/role-context.types";

export function useRoleCapabilities(): RoleCapabilities {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error("useRoleCapabilities must be used inside RoleContextProvider");
  }
  return ctx;
}
```

---

## Consumption map

```
App.tsx
  └─ RoleContextProvider (user prop from App state)
       └─ HomeFeature
            ├─ useRoleCapabilities()  ← reads can_display_main_stats for nav
            └─ LogisticTasksPage
                 └─ useRoleCapabilities()  ← reads all task-related keys
```

---

## Notes

- The provider is intentionally stateless — it derives everything from `user.role`.
  No store, no async calls.
- `admin` receives generous defaults (no default filters, all filter keys allowed,
  tab menu visible). Adjust if business rules diverge later.
- The `LogisticTaskDefaultFilter[]` type is imported by `logistic-tasks/domain`
  to convert role defaults into API query params. The role-context feature itself
  has no knowledge of logistic-tasks internals — it only exports the typed config.
