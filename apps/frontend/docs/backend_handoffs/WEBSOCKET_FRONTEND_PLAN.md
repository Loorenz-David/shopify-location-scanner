# WebSocket Frontend Implementation Plan

## Goal

Connect to the backend WebSocket server after the user authenticates, receive
`scan_history_updated` events carrying a `productId`, and re-fetch the scan history
list if the updated product is currently visible (or if the list is active at all).
The frontend never receives full item payloads over the socket — it only receives a
`productId` signal and decides whether to fetch fresh data via existing REST endpoints.

Related backend plan: `docs/under_development/WEBSOCKET_BACKEND_PLAN.md`

---

## Technology Choice

Use the browser's native `WebSocket` API. No extra npm packages needed. The native API
is available in all modern browsers and in every environment the PWA targets.

---

## File Structure to Create

All new files live under `src/core/ws-client/`.

```
src/core/ws-client/
  ws-client.ts          # Singleton WebSocket manager with reconnect + auth
  ws-events.ts          # TypeScript types for inbound and outbound WS messages
  use-ws-event.ts       # React hook: subscribe to a named WS event
```

One integration point in each existing feature:

```
src/features/item-scan-history/flows/use-item-scan-history.flow.ts
  → subscribe to scan_history_updated, re-fetch when relevant

src/features/home/ (or root App bootstrap)
  → call wsClient.connect() after login, wsClient.disconnect() on logout
```

---

## Step 1 — Event Type Definitions

**File:** `src/core/ws-client/ws-events.ts`

Defines every message shape the server can send. Mirror the protocol from the backend
plan exactly.

```typescript
// Messages the server sends to the client
export type WsInboundEvent =
  | { type: "authenticated"; shopId: string }
  | { type: "scan_history_updated"; productId: string };

// Messages the client sends to the server
export type WsOutboundMessage =
  | { type: "auth"; token: string };
```

---

## Step 2 — WebSocket Client Singleton

**File:** `src/core/ws-client/ws-client.ts`

A plain TypeScript object (not a class, not a React hook). This is the single source of
truth for the WebSocket connection. It handles:

- Connecting to `ws(s)://[API_HOST]/ws`
- Sending the `auth` message immediately on open
- Reconnecting with exponential backoff on unexpected close
- Distributing inbound events to registered listeners
- Exposing `connect()`, `disconnect()`, and `on()` / `off()` API

```typescript
import type { WsInboundEvent, WsOutboundMessage } from "./ws-events.js";

type EventHandler<T extends WsInboundEvent = WsInboundEvent> = (event: T) => void;

const MAX_RECONNECT_DELAY_MS = 30_000;
const BASE_RECONNECT_DELAY_MS = 1_000;

// Derive WS URL from the same base URL the REST client uses.
// VITE_API_BASE_URL is "http://..." or "https://..." — swap the scheme.
function buildWsUrl(): string {
  const base = import.meta.env.VITE_API_BASE_URL as string;
  return base.replace(/^http/, "ws") + "/ws";
}

// Listener registry: event type → set of handlers
const listeners = new Map<string, Set<EventHandler<any>>>();

let socket: WebSocket | null = null;
let tokenGetter: (() => string | null) | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
let intentionallyClosed = false;

function send(msg: WsOutboundMessage): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}

function dispatch(event: WsInboundEvent): void {
  listeners.get(event.type)?.forEach((handler) => handler(event));
  listeners.get("*")?.forEach((handler) => handler(event));
}

function scheduleReconnect(): void {
  if (intentionallyClosed) return;
  const delay = Math.min(
    BASE_RECONNECT_DELAY_MS * 2 ** reconnectAttempt,
    MAX_RECONNECT_DELAY_MS,
  );
  reconnectAttempt += 1;
  reconnectTimer = setTimeout(openSocket, delay);
}

function openSocket(): void {
  if (socket && socket.readyState <= WebSocket.OPEN) return; // already connecting/open

  const token = tokenGetter?.();
  if (!token) return; // not authenticated yet

  socket = new WebSocket(buildWsUrl());

  socket.onopen = () => {
    reconnectAttempt = 0;
    send({ type: "auth", token });
  };

  socket.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data) as WsInboundEvent;
      dispatch(data);
    } catch {
      // ignore malformed messages
    }
  };

  socket.onclose = (ev) => {
    socket = null;
    // 4001 = auth failure — do not retry
    if (ev.code === 4001) return;
    scheduleReconnect();
  };

  socket.onerror = () => {
    // onclose fires immediately after onerror; reconnect is handled there
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Call once after the user logs in.
 * `getToken` is a function that returns the current access token from localStorage.
 */
export function connectWsClient(getToken: () => string | null): void {
  intentionallyClosed = false;
  tokenGetter = getToken;
  openSocket();
}

/**
 * Call on logout. Clears all listeners and prevents reconnection.
 */
export function disconnectWsClient(): void {
  intentionallyClosed = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  socket?.close();
  socket = null;
  listeners.clear();
}

/**
 * Subscribe to a specific event type (or "*" for all events).
 * Returns an unsubscribe function.
 */
export function onWsEvent<T extends WsInboundEvent>(
  type: T["type"] | "*",
  handler: EventHandler<T>,
): () => void {
  if (!listeners.has(type)) {
    listeners.set(type, new Set());
  }
  listeners.get(type)!.add(handler as EventHandler<any>);
  return () => listeners.get(type)?.delete(handler as EventHandler<any>);
}
```

---

## Step 3 — React Hook for Event Subscription

**File:** `src/core/ws-client/use-ws-event.ts`

A thin React hook that subscribes to a WS event type for the lifetime of the component.

```typescript
import { useEffect } from "react";
import { onWsEvent } from "./ws-client.js";
import type { WsInboundEvent } from "./ws-events.js";

/**
 * Subscribe to a WebSocket event inside a React component.
 * The handler is stable for the component's lifetime — use useCallback if the
 * handler depends on state that changes.
 *
 * @example
 * useWsEvent("scan_history_updated", (event) => {
 *   console.log("product changed", event.productId);
 * });
 */
export function useWsEvent<T extends WsInboundEvent>(
  type: T["type"],
  handler: (event: T) => void,
): void {
  useEffect(() => {
    const unsubscribe = onWsEvent<T>(type, handler);
    return unsubscribe;
  }, [type, handler]);
}
```

---

## Step 4 — Connect on Login, Disconnect on Logout

**Where:** In the same place the app currently bootstraps the user session. The most
natural location is the auth flow that runs after login succeeds, and the logout action.

In `src/features/auth/actions/auth.actions.ts` (or wherever login/logout is handled):

```typescript
import { connectWsClient, disconnectWsClient } from "../../core/ws-client/ws-client.js";

// After login / session restore succeeds:
connectWsClient(() => localStorage.getItem("accessToken"));

// After logout:
disconnectWsClient();
```

The `getToken` lambda reads from localStorage at call time. This is intentional — when
the token is refreshed, the next server ping will use the newest value automatically,
because the lambda is called at reconnect time, not at `connectWsClient()` time.

> If there is a bootstrap query that restores the session on app load (e.g.
> `build-bootstrap-payload.query.ts`), call `connectWsClient` at the end of that query
> as well, so the socket reconnects after a page refresh without requiring re-login.

---

## Step 5 — React to `scan_history_updated` in Scan History

**File:** `src/features/item-scan-history/flows/use-item-scan-history.flow.ts`

This flow already manages loading, pagination, and pull-to-refresh. Add a WS subscription
that triggers a re-fetch when a `scan_history_updated` event arrives.

### What to add

Inside the flow hook, after the initial load effect, add:

```typescript
import { useCallback } from "react";
import { useWsEvent } from "../../../core/ws-client/use-ws-event.js";

// Inside the hook body:
const handleScanUpdate = useCallback(() => {
  // Re-fetch the current first page to pick up any changes.
  // The existing hydrate() or reload mechanism in this flow handles this.
  // Call whatever function is already used for pull-to-refresh.
  reload(); // replace with the actual refresh function name used in this flow
}, [reload]);

useWsEvent("scan_history_updated", handleScanUpdate);
```

### Decision: fetch on any event vs. match productId

Two options:

**Option A (simpler):** Re-fetch the current page on every `scan_history_updated` event
regardless of which `productId` changed. This is safe because the list is already
paginated and the fetch is cheap. Recommended for the initial implementation.

**Option B (optimised):** Only re-fetch if `event.productId` matches a `productId` in the
currently loaded `items` array in the Zustand store. Use this if Option A causes too many
unnecessary fetches (unlikely in a small shop context).

For Option B the check looks like:

```typescript
const handleScanUpdate = useCallback((event: { type: "scan_history_updated"; productId: string }) => {
  const currentItems = itemScanHistoryStore.getState().items;
  const isVisible = currentItems.some((item) => item.productId === event.productId);
  if (isVisible) reload();
}, [reload]);
```

Start with Option A. Switch to Option B only if needed.

---

## Step 6 — Export from Core Index (Optional Convenience)

If the project has a barrel export at `src/core/api-client/index.ts` or a similar
core index, add exports for the WS client for discoverability:

```typescript
export { connectWsClient, disconnectWsClient, onWsEvent } from "./ws-client/ws-client.js";
export { useWsEvent } from "./ws-client/use-ws-event.js";
export type { WsInboundEvent, WsOutboundMessage } from "./ws-client/ws-events.js";
```

---

## Environment Variable

The WS URL is derived from `VITE_API_BASE_URL` by swapping the scheme from `http` to `ws`
(and `https` to `wss`). No new env variable is required.

```
VITE_API_BASE_URL=http://localhost:4000
→ ws://localhost:4000/ws

VITE_API_BASE_URL=https://api.example.com
→ wss://api.example.com/ws
```

Make sure `VITE_API_BASE_URL` in both `.env` (local) and the production environment does
NOT include a trailing slash.

---

## Connection Lifecycle Summary

```
App loads
  └── bootstrap query completes (session restored)
        └── connectWsClient(() => localStorage.getItem("accessToken"))
              └── socket opens → sends { type: "auth", token }
                    └── server responds { type: "authenticated", shopId }
                          └── connection live

User scans item (or Shopify webhook fires)
  └── server broadcasts { type: "scan_history_updated", productId }
        └── useWsEvent("scan_history_updated", handler) fires
              └── handler calls reload() in use-item-scan-history.flow.ts
                    └── GET /scanner/history re-fetches current page
                          └── Zustand store updates → React re-renders list

Network drop / server restart
  └── socket.onclose fires
        └── scheduleReconnect() with exponential backoff (1s → 2s → 4s → … → 30s)
              └── socket re-opens → re-sends auth → connection restored

User logs out
  └── disconnectWsClient()
        └── socket closed, listeners cleared, reconnect cancelled
```

---

## What NOT to Build

- Do not add Socket.io or any third-party WS library.
- Do not store the WebSocket connection in Zustand or React context — it is a
  singleton module-level variable, not component state.
- Do not render loading spinners or UI for WS connection state. The REST fallback
  (pull-to-refresh) is the visible mechanism; WS is a silent enhancement.
- Do not send any commands from frontend to backend over WS other than the initial
  `auth` message. All mutations go through REST as they do today.
- Do not buffer or queue events that arrive before the component mounts. Simply
  re-fetch on the next event.

---

## Checklist

- [ ] `src/core/ws-client/ws-events.ts` created
- [ ] `src/core/ws-client/ws-client.ts` created
- [ ] `src/core/ws-client/use-ws-event.ts` created
- [ ] `connectWsClient()` called after successful login (auth actions)
- [ ] `connectWsClient()` called after successful session bootstrap on page load
- [ ] `disconnectWsClient()` called on logout
- [ ] `use-item-scan-history.flow.ts` — `useWsEvent("scan_history_updated", ...)` added
- [ ] `VITE_API_BASE_URL` confirmed without trailing slash in all envs
- [ ] Manual test: open two browser tabs, scan in tab 1, tab 2 list updates automatically
