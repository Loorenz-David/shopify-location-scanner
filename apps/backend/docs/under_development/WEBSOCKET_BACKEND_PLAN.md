# WebSocket Backend Implementation Plan

## Goal

Add a lightweight, in-process WebSocket server to the existing Express backend so that
connected clients receive real-time push notifications when scan history changes. No
message queues, no external brokers, no worker processes. When a scan is recorded or a
Shopify webhook mutates data, the server broadcasts the affected `productId` to every
client in the same shop. The frontend decides whether to re-fetch.

---

## Technology Choice

Use the `ws` npm package — a minimal, standards-compliant WebSocket library for Node.js.
Do NOT use Socket.io. No rooms abstraction is needed; shop-scoped broadcasting is handled
with a plain `Map<shopId, Set<WebSocket>>`.

Install:

```bash
npm install ws
npm install --save-dev @types/ws
```

---

## File Structure to Create

All new files live under `src/modules/ws/`.

```
src/modules/ws/
  ws-registry.ts        # Tracks live connections grouped by shopId
  ws-auth.ts            # Verifies JWT and extracts shopId from first client message
  ws-broadcaster.ts     # Broadcasts a typed event to all connections in a shopId
  ws-server.ts          # Creates and attaches the WebSocket server to the http.Server
```

---

## Step 1 — Convert `app.listen()` to an explicit `http.Server`

**File:** `src/server.ts`

The current code does:

```typescript
const server = app.listen(PORT, () => { ... });
```

Replace it with:

```typescript
import { createServer } from "http";
import { createWsServer } from "./modules/ws/ws-server.js";

const httpServer = createServer(app);
createWsServer(httpServer);          // attaches WebSocket upgrade handling

httpServer.listen(PORT, () => {
  logger.info("Backend started", { port: PORT, env: env.NODE_ENV });
});
```

Pass `httpServer` (not `app`) everywhere that currently uses `server` — the shutdown
handler already uses `server.close()`, just rename the variable.

---

## Step 2 — Connection Registry

**File:** `src/modules/ws/ws-registry.ts`

Maintains a `Map<shopId, Set<WebSocket>>`. Provides add, remove, and get-by-shop
operations. This module is a plain singleton (module-level variable), not a class.

```typescript
import type WebSocket from "ws";

// Key: shopId, Value: set of live WebSocket connections for that shop
const registry = new Map<string, Set<WebSocket>>();

export function registerConnection(shopId: string, ws: WebSocket): void {
  if (!registry.has(shopId)) {
    registry.set(shopId, new Set());
  }
  registry.get(shopId)!.add(ws);
}

export function removeConnection(shopId: string, ws: WebSocket): void {
  registry.get(shopId)?.delete(ws);
  if (registry.get(shopId)?.size === 0) {
    registry.delete(shopId);
  }
}

export function getConnections(shopId: string): Set<WebSocket> {
  return registry.get(shopId) ?? new Set();
}
```

---

## Step 3 — WebSocket Authentication

**File:** `src/modules/ws/ws-auth.ts`

On connection, the client has 5 seconds to send an auth message. The server verifies the
JWT using the existing `token.service.ts`. On success the shopId is returned. On failure
the socket is closed with code 4001.

```typescript
import type WebSocket from "ws";
import { verifyAccessToken } from "../auth/integrations/token.service.js";

const AUTH_TIMEOUT_MS = 5000;

export type WsAuthResult =
  | { ok: true; shopId: string; userId: string }
  | { ok: false };

/**
 * Waits for the first message from `ws`, expects:
 *   { type: "auth", token: "<access token>" }
 *
 * Returns the auth result. Caller is responsible for registering or closing.
 */
export function waitForAuth(ws: WebSocket): Promise<WsAuthResult> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      ws.close(4001, "Auth timeout");
      resolve({ ok: false });
    }, AUTH_TIMEOUT_MS);

    ws.once("message", (raw) => {
      clearTimeout(timeout);
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type !== "auth" || typeof msg.token !== "string") {
          ws.close(4001, "Expected auth message");
          return resolve({ ok: false });
        }

        const payload = verifyAccessToken(msg.token);
        if (!payload || !payload.shopId) {
          ws.close(4001, "Invalid token");
          return resolve({ ok: false });
        }

        resolve({ ok: true, shopId: payload.shopId, userId: payload.userId });
      } catch {
        ws.close(4001, "Malformed message");
        resolve({ ok: false });
      }
    });
  });
}
```

> **Note:** `verifyAccessToken` already exists in `src/modules/auth/integrations/token.service.ts`.
> It returns the decoded JWT payload or throws. Wrap the call in try/catch if it throws
> instead of returning null — check the actual implementation and adjust accordingly.

---

## Step 4 — Broadcaster

**File:** `src/modules/ws/ws-broadcaster.ts`

Single exported function. Takes a `shopId` and an event payload, serialises it to JSON,
and sends to every open connection for that shop. Stale/closed sockets are removed during
the broadcast loop.

```typescript
import WebSocket from "ws";
import { getConnections, removeConnection } from "./ws-registry.js";
import { logger } from "../../shared/logging/logger.js";

export type WsOutboundEvent =
  | { type: "authenticated"; shopId: string }
  | { type: "scan_history_updated"; productId: string }
  | { type: "ping" };

export function broadcastToShop(shopId: string, event: WsOutboundEvent): void {
  const connections = getConnections(shopId);
  const payload = JSON.stringify(event);

  for (const ws of connections) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    } else {
      // Socket is closing or already closed — clean up
      removeConnection(shopId, ws);
      logger.info("WS: removed stale connection", { shopId });
    }
  }
}
```

---

## Step 5 — WebSocket Server

**File:** `src/modules/ws/ws-server.ts`

Creates the `WebSocket.Server` in "noServer" mode (so it shares the existing HTTP port),
handles the HTTP upgrade event, runs the auth handshake, then registers the connection.
Also manages ping/pong keep-alive to detect dead sockets.

```typescript
import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import { waitForAuth } from "./ws-auth.js";
import { registerConnection, removeConnection } from "./ws-registry.js";
import { broadcastToShop } from "./ws-broadcaster.js";
import { logger } from "../../shared/logging/logger.js";

const PING_INTERVAL_MS = 30_000;

export function createWsServer(httpServer: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  // Intercept HTTP upgrade requests at the /ws path
  httpServer.on("upgrade", (request, socket, head) => {
    const { pathname } = new URL(request.url ?? "/", "http://localhost");
    if (pathname !== "/ws") {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", async (ws: WebSocket) => {
    // Auth handshake — must complete within 5 seconds
    const result = await waitForAuth(ws);
    if (!result.ok) return;

    const { shopId, userId } = result;
    registerConnection(shopId, ws);
    logger.info("WS: client connected", { shopId, userId });

    // Confirm auth to client
    ws.send(JSON.stringify({ type: "authenticated", shopId }));

    // Keep-alive: ping every 30 s, close if no pong back
    let isAlive = true;
    const pingTimer = setInterval(() => {
      if (!isAlive) {
        logger.info("WS: client did not pong, terminating", { shopId, userId });
        removeConnection(shopId, ws);
        ws.terminate();
        return;
      }
      isAlive = false;
      ws.ping();
    }, PING_INTERVAL_MS);

    ws.on("pong", () => {
      isAlive = true;
    });

    ws.on("close", () => {
      clearInterval(pingTimer);
      removeConnection(shopId, ws);
      logger.info("WS: client disconnected", { shopId, userId });
    });

    ws.on("error", (err) => {
      logger.error("WS: socket error", { shopId, userId, error: err.message });
      removeConnection(shopId, ws);
    });
  });

  logger.info("WS: server attached on /ws");
}
```

---

## Step 6 — Emit Events from the Scanner Repository

**File:** `src/modules/scanner/repositories/scan-history.repository.ts`

After each mutation that changes scan history, call `broadcastToShop`. There are two
mutation methods to update:

### 6a — `appendLocationEvent()`

This method is called when a user scans and links an item to a location. At the end of
the function, after the database writes are complete and before the return statement, add:

```typescript
import { broadcastToShop } from "../../ws/ws-broadcaster.js";

// Inside appendLocationEvent(), after all DB writes succeed:
broadcastToShop(input.shopId, {
  type: "scan_history_updated",
  productId: result.productId,   // use the productId from the returned ScanHistoryRecord
});

return result;
```

### 6b — `appendSoldTerminalEventWithFallback()`

This method is called when a Shopify "orders/paid" webhook arrives. After all DB writes
succeed, before the return:

```typescript
broadcastToShop(shopId, {
  type: "scan_history_updated",
  productId: input.productId,
});
```

> The `shopId` is available in both methods as part of their input parameters. Confirm
> the exact parameter names by reading the function signatures before editing.

---

## Step 7 — Graceful Shutdown

**File:** `src/server.ts`

In the existing `shutdown()` function, close the WebSocket server before the HTTP server:

```typescript
// No separate reference needed — ws connections are cleaned up when httpServer.close()
// drains. If you want to be explicit, export a closeWsServer() from ws-server.ts
// that calls wss.close(), then call it here before httpServer.close().
```

The simplest approach: export `wss` from `ws-server.ts` and call `wss.close()` in the
shutdown handler before `httpServer.close()`.

---

## WebSocket Message Protocol (Server ↔ Client)

### Client → Server

| Message | When | Shape |
|---------|------|-------|
| `auth` | First message after connect | `{ type: "auth", token: string }` |
| *(pong)* | Automatic browser response to server ping | (binary WebSocket pong frame, no JSON needed) |

### Server → Client

| Event | When | Shape |
|-------|------|-------|
| `authenticated` | Auth succeeded | `{ type: "authenticated", shopId: string }` |
| `scan_history_updated` | A scan was recorded or a Shopify order webhook mutated an item | `{ type: "scan_history_updated", productId: string }` |
| *(ping)* | Every 30 s to keep-alive | (binary WebSocket ping frame) |

Close codes:
- `4001` — Auth failed or timed out

---

## Environment / CORS Notes

The WebSocket upgrade path `/ws` is handled at the `http.Server` level, not by Express,
so Express CORS middleware does not apply. If the frontend origin needs to be validated
during the upgrade, read `request.headers.origin` inside the `upgrade` event handler and
compare against `env.FRONTEND_URL` / `env.FRONTEND_URLS`. Reject by calling
`socket.destroy()` if the origin is not allowed.

Example origin check to add inside the `upgrade` handler in `ws-server.ts`:

```typescript
const origin = request.headers.origin ?? "";
const allowedOrigins = [
  env.FRONTEND_URL,
  ...(env.FRONTEND_URLS?.split(",").map((o) => o.trim()) ?? []),
];
if (origin && !allowedOrigins.includes(origin)) {
  socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
  socket.destroy();
  return;
}
```

---

## What NOT to Build

- Do not add Socket.io.
- Do not add Redis pub/sub or any external broker.
- Do not add rooms, namespaces, or acknowledgement features.
- Do not emit WebSocket events for reads — only for mutations.
- Do not broadcast full item payloads over the socket. Only `productId` is sent;
  the frontend fetches fresh data via existing REST endpoints.

---

## Checklist

- [ ] `npm install ws && npm install --save-dev @types/ws` in `apps/backend`
- [ ] `src/modules/ws/ws-registry.ts` created
- [ ] `src/modules/ws/ws-auth.ts` created
- [ ] `src/modules/ws/ws-broadcaster.ts` created
- [ ] `src/modules/ws/ws-server.ts` created
- [ ] `src/server.ts` updated: `createServer(app)` + `createWsServer(httpServer)`
- [ ] `scan-history.repository.ts` — `appendLocationEvent()` emits `scan_history_updated`
- [ ] `scan-history.repository.ts` — `appendSoldTerminalEventWithFallback()` emits `scan_history_updated`
- [ ] Graceful shutdown closes WS server before HTTP server
- [ ] Origin validation in upgrade handler
- [ ] Manual test: connect via `wscat -c "ws://localhost:4000/ws"`, send auth, trigger a scan, receive event
