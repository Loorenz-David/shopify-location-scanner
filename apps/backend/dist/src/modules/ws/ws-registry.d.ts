import type WebSocket from "ws";
import type { UserRole } from "@prisma/client";
export declare const registerConnection: (shopId: string, ws: WebSocket, role: UserRole, userId: string) => Promise<void>;
export declare const removeConnection: (shopId: string, ws: WebSocket) => Promise<void>;
export declare const getConnections: (shopId: string, roles?: UserRole[]) => WebSocket[];
export declare const getConnectionsForUser: (shopId: string, userId: string) => WebSocket[];
export declare const isUserConnectedViaWs: (shopId: string, userId: string) => Promise<boolean>;
//# sourceMappingURL=ws-registry.d.ts.map