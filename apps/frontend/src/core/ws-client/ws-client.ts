import type { WsInboundEvent, WsOutboundMessage } from "./ws-events";

type EventHandler<T extends WsInboundEvent = WsInboundEvent> = (event: T) => void;

const BASE_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

const listeners = new Map<string, Set<EventHandler>>();

let socket: WebSocket | null = null;
let tokenGetter: (() => string | null) | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
let intentionallyClosed = false;

function buildWsUrl(): string {
  const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
  const normalizedBaseUrl = baseUrl.replace(/\/$/, "");

  try {
    const parsedBaseUrl = new URL(normalizedBaseUrl);
    const wsProtocol = parsedBaseUrl.protocol === "https:" ? "wss:" : "ws:";

    return `${wsProtocol}//${parsedBaseUrl.host}/ws`;
  } catch {
    return `${normalizedBaseUrl.replace(/^http/i, "ws")}/ws`;
  }
}

function clearReconnectTimer(): void {
  if (!reconnectTimer) {
    return;
  }

  window.clearTimeout(reconnectTimer);
  reconnectTimer = null;
}

function send(message: WsOutboundMessage): void {
  if (socket?.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify(message));
}

function dispatch(event: WsInboundEvent): void {
  listeners.get(event.type)?.forEach((handler) => handler(event));
  listeners.get("*")?.forEach((handler) => handler(event));
}

function scheduleReconnect(): void {
  if (intentionallyClosed || reconnectTimer) {
    return;
  }

  const delayMs = Math.min(
    BASE_RECONNECT_DELAY_MS * 2 ** reconnectAttempt,
    MAX_RECONNECT_DELAY_MS,
  );

  reconnectAttempt += 1;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    openSocket();
  }, delayMs);
}

function openSocket(): void {
  if (
    socket &&
    (socket.readyState === WebSocket.CONNECTING ||
      socket.readyState === WebSocket.OPEN)
  ) {
    return;
  }

  const token = tokenGetter?.();
  if (!token) {
    return;
  }

  clearReconnectTimer();
  socket = new WebSocket(buildWsUrl());

  socket.onopen = () => {
    reconnectAttempt = 0;
    send({ type: "auth", token });
  };

  socket.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data) as WsInboundEvent;
      dispatch(payload);
    } catch {
      // Ignore malformed messages from the server.
    }
  };

  socket.onclose = (event) => {
    socket = null;

    if (event.code === 4001) {
      return;
    }

    scheduleReconnect();
  };

  socket.onerror = () => {
    // Reconnect is handled by onclose.
  };
}

export function connectWsClient(getToken: () => string | null): void {
  intentionallyClosed = false;
  tokenGetter = getToken;
  openSocket();
}

export function disconnectWsClient(): void {
  intentionallyClosed = true;
  tokenGetter = null;
  reconnectAttempt = 0;
  clearReconnectTimer();
  listeners.clear();
  socket?.close();
  socket = null;
}

export function onWsEvent<T extends WsInboundEvent>(
  type: T["type"] | "*",
  handler: EventHandler<T>,
): () => void {
  if (!listeners.has(type)) {
    listeners.set(type, new Set());
  }

  listeners.get(type)?.add(handler as EventHandler);

  return () => {
    const eventListeners = listeners.get(type);
    eventListeners?.delete(handler as EventHandler);

    if (eventListeners && eventListeners.size === 0) {
      listeners.delete(type);
    }
  };
}
