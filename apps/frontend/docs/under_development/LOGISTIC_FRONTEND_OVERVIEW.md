# LOGISTIC FRONTEND — OVERVIEW & CROSS-CUTTING CHANGES

## What We Are Building

Three interconnected capabilities layered on top of the existing app:

1. **Role Context** — a React context that derives UI capability flags from the
   authenticated user's role. Wraps the entire authenticated app so every feature
   can read it without prop-drilling.

2. **Logistic Locations** (`features/logistic-locations`) — settings sub-page for
   managing the physical locations items are placed in during logistics processing
   (shelves, zones, etc.). Also populates the logistic-tasks scanner.

3. **Logistic Tasks** (`features/logistic-tasks`) — the main operational page:
   a role-aware list of active logistics work items with intention tabs, order
   grouping, inline actions (mark intention / mark placement), a dedicated
   barcode-scanner page for placement, and real-time WS updates.

**Out of scope here:** PWA push notification wiring — see
`apps/frontend/docs/under_development/LOGISTIC_PWA_PUSH_PLAN.md`.

---

## New Features Created

| Feature path                          | Type        | Nav entry              |
| ------------------------------------- | ----------- | ---------------------- |
| `features/role-context`               | Context/Provider | none (wraps App)  |
| `features/logistic-locations`         | Settings sub-page | under Settings   |
| `features/logistic-tasks`             | Full page   | bottom nav slot 2      |

---

## Existing Files That Must Change

### 1. `features/auth/types/auth.dto.ts`

Extend the `role` union on `AuthUserDto`:

```typescript
// Before
role: "admin" | "worker";

// After
role: "admin" | "manager" | "worker" | "seller";
```

This propagates to `AuthSessionDto`, `CurrentUserResponseDto`, and anywhere
`AuthUserDto` is imported. TypeScript will surface all places that need
updating.

---

### 2. `core/ws-client/ws-events.ts`

Add the four new inbound event types that logistic features produce on the backend:

```typescript
export type WsInboundEvent =
  | { type: "authenticated"; shopId: string }
  | { type: "scan_history_updated"; productId: string }
  // --- new ---
  | { type: "logistic_intention_set"; scanHistoryId: string; orderId: string | null; intention: string }
  | { type: "logistic_item_placed"; scanHistoryId: string; orderId: string | null; logisticLocationId: string }
  | { type: "logistic_item_fulfilled"; scanHistoryId: string; orderId: string | null }
  | { type: "logistic_batch_notification"; count: number; itemIds: string[]; message: string };
```

---

### 3. `features/bootstrap/types/bootstrap.dto.ts`

Add `logisticLocations` and `vapidPublicKey` to `BootstrapPayloadDto` to match
the backend contract (`BootstrapPayload` in
`backend/src/modules/bootstrap/contracts/bootstrap.contract.ts`):

```typescript
export interface LogisticLocationBootstrapDto {
  id: string;
  shopId: string;
  location: string;
  zoneType: "for_delivery" | "for_pickup" | "for_fixing";
  createdAt: string; // ISO string after JSON serialisation
}

export interface BootstrapPayloadDto {
  shopify: { metafields: BootstrapMetafieldsDto };
  logisticLocations: LogisticLocationBootstrapDto[];
  vapidPublicKey: string;
}
```

---

### 4. `features/bootstrap/controllers/bootstrap.controller.ts`

After setting the payload, inject logistic locations into the
`logistic-locations` feature store:

```typescript
import { hydrateLogisticLocationsFromBootstrap } from "../../logistic-locations/flows/logistic-locations-bootstrap.flow";

// inside the try block, after bootstrapStore.setPayload(response.payload):
hydrateLogisticLocationsFromBootstrap(response.payload.logisticLocations);
```

The function is exported from the `logistic-locations` feature — see that plan
for details.

---

### 5. `App.tsx`

Wrap `HomeFeature` in `RoleContextProvider`, passing the authenticated user:

```typescript
import { RoleContextProvider } from "./features/role-context/providers/RoleContextProvider";

// Replace:
<HomeFeature onLogout={handleLogout} />

// With:
<RoleContextProvider user={authenticatedUser}>
  <HomeFeature onLogout={handleLogout} />
</RoleContextProvider>
```

`authenticatedUser` is already in local state in `App.tsx`. The provider is a
no-op wrapper that derives the capabilities dict from `user.role`.

---

### 6. `features/home/HomeFeature.tsx`

**A. Register two new pages:**

```typescript
{
  id: "logistic-tasks",
  title: "Tasks",
  component: LogisticTasksPage,
  bottomMenu: {
    label: "Tasks",
    slot: "left",
    order: 5,      // between History (0) and Scanner (10)
    visible: true,
  },
},
{
  id: "settings-logistic-locations",
  title: "Logistic locations",
  component: LogisticLocationsSettingsPage,
  presentation: "full-overlay",
},
```

**B. Reorder the Analytics entry** to sit between Scanner and Settings:

```typescript
{
  id: "analytics",
  ...
  bottomMenu: {
    label: "Analytics",
    slot: "right",
    order: 15,     // was 5 — now right of scanner
    visible: true,  // visibility controlled by role context inside the page
  },
},
```

**C. Analytics visibility for workers** — the Analytics page registration stays
in the list. The nav button itself renders but is visually invisible for workers
using a CSS-only approach: the `BottomNav` component passes `visible` from the
registration; the `BottomNav` renders a blank placeholder div of equal width
when `visible: false` so layout is preserved. The visibility of the analytics
button must be computed from the role context inside `HomeFeature`:

```typescript
const { can_display_main_stats } = useRoleCapabilities();

// When building registeredPages:
bottomMenu: {
  label: "Analytics",
  slot: "right",
  order: 15,
  visible: can_display_main_stats,
},
```

**D. Add the realtime flow for logistic tasks:**

```typescript
import { useLogisticTasksRealtimeFlow } from "../logistic-tasks/flows/use-logistic-tasks-realtime.flow";

export function HomeFeature({ onLogout }: HomeFeatureProps) {
  useItemScanHistoryRealtimeFlow();
  useLogisticTasksRealtimeFlow(); // ← add
  ...
```

**E. Overlay host** — add a `LogisticTasksOverlayHost` alongside the existing
overlay hosts inside `overlayContent`:

```tsx
overlayContent={
  <>
    <ScannerOverlayHost onClose={homeShellActions.closeOverlayPage} />
    <ItemScanHistoryOverlayHost onClose={homeShellActions.closeOverlayPage} />
    <LogisticTasksOverlayHost onClose={homeShellActions.closeOverlayPage} />
  </>
}
```

---

## Bottom Nav Layout After Changes

| Slot  | Order | Label     | Page id            | Hidden for role |
| ----- | ----- | --------- | ------------------ | --------------- |
| left  | 0     | History   | item-scan-history  | —               |
| left  | 5     | Tasks     | logistic-tasks     | —               |
| center| 10    | Scanner   | scanner            | —               |
| right | 15    | Analytics | analytics          | worker (blank)  |
| right | 20    | Settings  | settings           | —               |

---

## Implementation Order Across All Plans

1. Backend API filter additions (`LOGISTIC_API_FILTER_ADDITIONS.md`)
2. Auth DTO role extension
3. WS events additions
4. Bootstrap DTO + controller update
5. Role-context feature (standalone, no feature deps)
6. Logistic-locations feature (standalone except bootstrap injection)
7. Logistic-tasks feature (depends on role-context, logistic-locations store read)
8. HomeFeature.tsx + App.tsx wiring
9. Scanner logistic placement page (added to scanner feature, consumes logistic-tasks actions)
