import type WebSocket from "ws";
export type WsAuthResult = {
    ok: true;
    shopId: string;
    userId: string;
} | {
    ok: false;
};
export declare const waitForAuth: (ws: WebSocket) => Promise<WsAuthResult>;
//# sourceMappingURL=ws-auth.d.ts.map