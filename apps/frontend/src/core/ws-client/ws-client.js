const BASE_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const listeners = new Map();
let socket = null;
let tokenGetter = null;
let reconnectTimer = null;
let reconnectAttempt = 0;
let intentionallyClosed = false;
function buildWsUrl() {
    const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
    const normalizedBaseUrl = baseUrl.replace(/\/$/, "");
    try {
        const parsedBaseUrl = new URL(normalizedBaseUrl);
        const wsProtocol = parsedBaseUrl.protocol === "https:" ? "wss:" : "ws:";
        return `${wsProtocol}//${parsedBaseUrl.host}/ws`;
    }
    catch {
        return `${normalizedBaseUrl.replace(/^http/i, "ws")}/ws`;
    }
}
function clearReconnectTimer() {
    if (!reconnectTimer) {
        return;
    }
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
}
function send(message) {
    if (socket?.readyState !== WebSocket.OPEN) {
        return;
    }
    socket.send(JSON.stringify(message));
}
function dispatch(event) {
    listeners.get(event.type)?.forEach((handler) => handler(event));
    listeners.get("*")?.forEach((handler) => handler(event));
}
function scheduleReconnect() {
    if (intentionallyClosed || reconnectTimer) {
        return;
    }
    const delayMs = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** reconnectAttempt, MAX_RECONNECT_DELAY_MS);
    reconnectAttempt += 1;
    reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        openSocket();
    }, delayMs);
}
function openSocket() {
    if (socket &&
        (socket.readyState === WebSocket.CONNECTING ||
            socket.readyState === WebSocket.OPEN)) {
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
            const payload = JSON.parse(event.data);
            dispatch(payload);
        }
        catch {
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
export function connectWsClient(getToken) {
    intentionallyClosed = false;
    tokenGetter = getToken;
    openSocket();
}
export function disconnectWsClient() {
    intentionallyClosed = true;
    tokenGetter = null;
    reconnectAttempt = 0;
    clearReconnectTimer();
    socket?.close();
    socket = null;
}
export function onWsEvent(type, handler) {
    if (!listeners.has(type)) {
        listeners.set(type, new Set());
    }
    listeners.get(type)?.add(handler);
    return () => {
        const eventListeners = listeners.get(type);
        eventListeners?.delete(handler);
        if (eventListeners && eventListeners.size === 0) {
            listeners.delete(type);
        }
    };
}
