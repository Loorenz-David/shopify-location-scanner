import type WebSocket from "ws";
export declare const registerConnection: (shopId: string, ws: WebSocket) => void;
export declare const removeConnection: (shopId: string, ws: WebSocket) => void;
export declare const getConnections: (shopId: string) => Set<WebSocket>;
//# sourceMappingURL=ws-registry.d.ts.map