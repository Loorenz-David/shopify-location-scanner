import type { Server as HttpServer } from "http";
import { WebSocketServer } from "ws";
export declare const createWsServer: (httpServer: HttpServer) => WebSocketServer;
export declare const closeWsServer: () => Promise<void>;
//# sourceMappingURL=ws-server.d.ts.map