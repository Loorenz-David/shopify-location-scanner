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
const managerRedis = (): Redis => {
  connection ??= new Redis(env.REDIS_URL, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    lazyConnect: false,
  });
  return connection;
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
  await stockSyncQueue?.close();
  await itemsProcessedQueue?.close();
  await connection?.quit();
  stockSyncQueue = null;
  itemsProcessedQueue = null;
  connection = null;
};
