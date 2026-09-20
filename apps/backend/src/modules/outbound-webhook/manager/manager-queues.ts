import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { env } from "../../../config/env.js";

export const MANAGER_QUEUE_PREFIX = "iss";
export const MANAGER_STOCK_SYNC_QUEUE = "manager-stock-sync";
export const MANAGER_ITEMS_PROCESSED_QUEUE = "manager-items-processed";

export type StockSyncJobData = { shopId: string };
export type ItemsProcessedJobData = { deliveryId: string };

let connection: Redis | null = null;
let stockSyncQueue: Queue<StockSyncJobData> | null = null;
let itemsProcessedQueue: Queue<ItemsProcessedJobData> | null = null;

/**
 * §12A.5: the producer side owns its own connection, created lazily on the first
 * signal — nothing connects to Redis at import time. It must **not** reuse
 * `shared/queue/redis-connection.ts` (`maxRetriesPerRequest: null`), which queues
 * commands forever: with Redis down a scan or an order webhook would hang on a
 * signal it never awaits. These options make `queue.add` reject at once instead.
 */
const MANAGER_RECONNECT_ATTEMPTS = 2;

/** Drops the cached lane so the next signal builds a fresh one. */
const discardLane = (client: Redis): void => {
  if (connection !== client) {
    return;
  }
  connection = null;
  stockSyncQueue = null;
  itemsProcessedQueue = null;
};

const managerRedis = (): Redis => {
  if (connection !== null) {
    return connection;
  }

  const client = new Redis(env.REDIS_URL, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    lazyConnect: false,
    // Bounded on purpose. ioredis reconnects forever by default, and BullMQ's
    // `waitUntilReady` inside `queue.add` stays pending for exactly as long as
    // it keeps trying — the hang §12A.5 rules out, and `enableOfflineQueue`
    // does not prevent it. Giving up makes the client emit `end`, which is what
    // turns a Redis outage into the immediate rejection the caller logs.
    retryStrategy: (attempt) =>
      attempt > MANAGER_RECONNECT_ATTEMPTS ? null : Math.min(attempt * 200, 1_000),
  });

  // Signals never throw, so a connection error must not reach the process as an
  // unhandled `error` event; the rejected `add` is what gets logged. Dropping
  // the lane on `end` means a Redis that comes back is picked up by the next
  // signal instead of staying dead for the life of the process.
  client.on("error", () => undefined);
  client.on("end", () => discardLane(client));

  connection = client;
  return client;
};

export const managerStockSyncQueue = (): Queue<StockSyncJobData> => {
  stockSyncQueue ??= new Queue<StockSyncJobData>(MANAGER_STOCK_SYNC_QUEUE, {
    connection: managerRedis(),
    prefix: MANAGER_QUEUE_PREFIX,
  });
  return stockSyncQueue;
};

export const managerItemsProcessedQueue = (): Queue<ItemsProcessedJobData> => {
  itemsProcessedQueue ??= new Queue<ItemsProcessedJobData>(MANAGER_ITEMS_PROCESSED_QUEUE, {
    connection: managerRedis(),
    prefix: MANAGER_QUEUE_PREFIX,
  });
  return itemsProcessedQueue;
};

/**
 * §12A.4, exactly these options for every enqueue — trigger, worker start and
 * periodic alike.
 *
 * `deduplication` with `keepLastIfActive` and no ttl gives the lane its ordering:
 * a trigger arriving while a sync is waiting or delayed is ignored (that job has
 * not read state yet), and one arriving while a sync is *active* is stored and
 * becomes exactly one further job. At most one active plus one waiting, never
 * parallel, never lost.
 *
 * A fixed `jobId` must not be used here: it would collide with retained
 * completed jobs (`removeOnComplete: 100`) and silently drop later triggers.
 */
export const enqueueStockSync = async (shopId: string): Promise<void> => {
  await managerStockSyncQueue().add(
    "stock-sync",
    { shopId },
    {
      deduplication: { id: `stock-sync:${shopId}`, keepLastIfActive: true },
      attempts: 4,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  );
};

/**
 * §12A.6. `jobId = delivery.id` is what makes the §12A.7 re-drive a re-add of the
 * same report rather than a second one.
 */
export const enqueueItemsProcessed = async (deliveryId: string): Promise<void> => {
  await managerItemsProcessedQueue().add(
    "items-processed",
    { deliveryId },
    {
      jobId: deliveryId,
      attempts: 6,
      backoff: { type: "exponential", delay: 5_000 },
      removeOnComplete: true,
      removeOnFail: true,
    },
  );
};

export const closeManagerQueues = async (): Promise<void> => {
  const open = connection;
  const queues = [stockSyncQueue, itemsProcessedQueue];
  stockSyncQueue = null;
  itemsProcessedQueue = null;
  connection = null;

  if (open === null) {
    return;
  }

  if (open.status === "ready") {
    await Promise.allSettled(queues.map((queue) => queue?.close()));
    await open.quit().catch(() => undefined);
    return;
  }

  // Redis is unreachable. `quit()` and `close()` both need a round trip, and
  // ioredis would go on reconnecting for as long as one is outstanding, so the
  // process could never exit — §12A.5 requires the opposite of every process
  // that closes its signals. `disconnect()` tears the socket down at once.
  open.disconnect();
  await Promise.allSettled(queues.map((queue) => queue?.close()));
};
