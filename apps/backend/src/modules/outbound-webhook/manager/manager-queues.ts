import { Queue } from "bullmq";
import { Redis } from "ioredis";
import { env } from "../../../config/env.js";

let connection: Redis | null = null;
let stockQueue: Queue | null = null;
let processedQueue: Queue | null = null;
const redis = (): Redis => connection ??= new Redis(env.REDIS_URL, { enableOfflineQueue: false, maxRetriesPerRequest: 1 });
export const managerQueues = () => ({
  stock: stockQueue ??= new Queue("manager-stock-sync", { connection: redis(), prefix: "iss" }),
  processed: processedQueue ??= new Queue("manager-items-processed", { connection: redis(), prefix: "iss" }),
});
export const closeManagerQueues = async (): Promise<void> => { await stockQueue?.close(); await processedQueue?.close(); await connection?.quit(); stockQueue = null; processedQueue = null; connection = null; };
export const addStockSync = (shopId: string) => managerQueues().stock.add("stock-sync", { shopId }, { deduplication: { id: `stock-sync:${shopId}`, keepLastIfActive: true }, attempts: 4, backoff: { type: "exponential", delay: 5_000 }, removeOnComplete: 100, removeOnFail: 200 });
export const addProcessed = (deliveryId: string) => managerQueues().processed.add("items-processed", { deliveryId }, { jobId: deliveryId, attempts: 6, backoff: { type: "exponential", delay: 5_000 }, removeOnComplete: true, removeOnFail: true });
