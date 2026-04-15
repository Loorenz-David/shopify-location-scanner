import type WebSocket from "ws";
import type { UserRole } from "@prisma/client";
import { tokenService } from "../auth/integrations/token.service.js";

const AUTH_TIMEOUT_MS = 5_000;
const AUTH_FAILED_CLOSE_CODE = 4001;

export type WsAuthResult =
  | {
      ok: true;
      shopId: string;
      userId: string;
      role: UserRole;
    }
  | {
      ok: false;
    };

export const waitForAuth = (ws: WebSocket): Promise<WsAuthResult> => {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      ws.close(AUTH_FAILED_CLOSE_CODE, "Auth timeout");
      resolve({ ok: false });
    }, AUTH_TIMEOUT_MS);

    ws.once("message", (raw) => {
      clearTimeout(timeout);

      try {
        const message = JSON.parse(raw.toString()) as {
          type?: unknown;
          token?: unknown;
        };

        if (message.type !== "auth" || typeof message.token !== "string") {
          ws.close(AUTH_FAILED_CLOSE_CODE, "Expected auth message");
          resolve({ ok: false });
          return;
        }

        const principal = tokenService.verifyAccessToken(message.token);
        if (!principal.shopId) {
          ws.close(AUTH_FAILED_CLOSE_CODE, "Shop not linked");
          resolve({ ok: false });
          return;
        }

        resolve({
          ok: true,
          shopId: principal.shopId,
          userId: principal.userId,
          role: principal.role as UserRole,
        });
      } catch {
        ws.close(AUTH_FAILED_CLOSE_CODE, "Invalid auth payload");
        resolve({ ok: false });
      }
    });

    ws.once("close", () => {
      clearTimeout(timeout);
      resolve({ ok: false });
    });
  });
};
