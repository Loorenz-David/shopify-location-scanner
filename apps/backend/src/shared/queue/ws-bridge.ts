import { Redis } from "ioredis";
import { env } from "../../config/env.js";
import { logger } from "../logging/logger.js";

// Channel name is prefixed with "iss" (item-scanner-shopify) to isolate this
// app's pub/sub traffic from other apps sharing the same Redis instance.
export const WS_BROADCAST_CHANNEL = "iss:ws:broadcast";

export type WsBroadcastMessage = {
  shopId: string;
  targetRoles?: string[];
  event: { type: string } & Record<string, unknown>;
};

// Publisher — one instance per worker process. Do NOT reuse the BullMQ
// redisConnection here: BullMQ may put that connection in blocking mode.
export const createWsBroadcastPublisher = () => {
  const client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3 });

  client.on("error", (err) => {
    logger.error("WS broadcast publisher Redis error", { error: err.message });
  });

  const publish = async (
    shopId: string,
    event: WsBroadcastMessage["event"],
    targetRoles?: string[],
  ): Promise<void> => {
    const message: WsBroadcastMessage = {
      shopId,
      event,
      ...(targetRoles ? { targetRoles } : {}),
    };
    await client.publish(WS_BROADCAST_CHANNEL, JSON.stringify(message));
  };

  const quit = () => client.quit();

  return { publish, quit };
};

// Subscriber — dedicated connection per API server process. A Redis client in
// subscribe mode can only run subscribe/unsubscribe commands, so it must be
// separate from every other connection.
export const createWsBroadcastSubscriber = (
  onMessage: (
    shopId: string,
    event: WsBroadcastMessage["event"],
    targetRoles?: string[],
  ) => void,
) => {
  const client = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

  client.on("error", (err) => {
    logger.error("WS broadcast subscriber Redis error", { error: err.message });
  });

  client.subscribe(WS_BROADCAST_CHANNEL, (err) => {
    if (err) {
      logger.error("WS broadcast subscriber failed to subscribe", {
        error: err.message,
      });
      return;
    }
    logger.info("WS broadcast subscriber listening", {
      channel: WS_BROADCAST_CHANNEL,
    });
  });

  client.on("message", (channel, rawMessage) => {
    if (channel !== WS_BROADCAST_CHANNEL) return;
    try {
      const parsed = JSON.parse(rawMessage) as WsBroadcastMessage;
      onMessage(parsed.shopId, parsed.event, parsed.targetRoles);
    } catch {
      logger.warn("WS broadcast subscriber received malformed message", {
        rawMessage,
      });
    }
  });

  const quit = () => client.quit();

  return { quit };
};
