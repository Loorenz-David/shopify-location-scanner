import type WebSocket from "ws";
import type { UserRole } from "@prisma/client";
export type WsAuthResult = {
    ok: true;
    shopId: string;
    userId: string;
    role: UserRole;
} | {
    ok: false;
};
export declare const waitForAuth: (ws: WebSocket) => Promise<WsAuthResult>;
//# sourceMappingURL=ws-auth.d.ts.map