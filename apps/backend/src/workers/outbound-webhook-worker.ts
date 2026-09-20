import "../config/load-env.js";
import { Worker, type Job } from "bullmq";
import { initializeDatabaseRuntime } from "../shared/database/sqlite-runtime.js";
import { logger } from "../shared/logging/logger.js";
import { redisConnection } from "../shared/queue/redis-connection.js";
import {
  OUTBOUND_WEBHOOK_QUEUE_NAME,
  OUTBOUND_WEBHOOK_QUEUE_PREFIX,
  type OutboundWebhookJobPayload,
} from "../shared/queue/outbound-webhook-queue.js";
import { isRetryableError } from "../modules/outbound-webhook/manager/manager-http.js";
import { env } from "../config/env.js";
import {
  MANAGER_ITEMS_PROCESSED_QUEUE,
  MANAGER_QUEUE_PREFIX,
  MANAGER_STOCK_SYNC_QUEUE,
  enqueueItemsProcessed,
  enqueueStockSync,
  type ItemsProcessedJobData,
  type StockSyncJobData,
} from "../modules/outbound-webhook/manager/manager-queues.js";
import {
  closeManagerSignals,
  enableManagerSignals,
} from "../modules/outbound-webhook/manager/manager-signals.js";
import { runStockSync } from "../modules/outbound-webhook/manager/stock-sync.service.js";
import {
  listProcessedRedriveCandidates,
  runProcessedDelivery,
} from "../modules/outbound-webhook/manager/items-processed.service.js";
import { outboundDeliveryRepository } from "../modules/outbound-webhook/repositories/outbound-delivery.repository.js";
import { outboundWebhookTargetRepository } from "../modules/outbound-webhook/repositories/outbound-webhook-target.repository.js";

const DISPATCH_TIMEOUT_MS = 8_000;
const DAY_MS = 24 * 60 * 60 * 1_000;

await initializeDatabaseRuntime();

// §12A.5: this process signals too — its start and interval ticks enqueue the
// stock syncs.
enableManagerSignals();

const outboundWebhookWorker = new Worker<OutboundWebhookJobPayload>(
  OUTBOUND_WEBHOOK_QUEUE_NAME,
  async (job: Job<OutboundWebhookJobPayload>) => {
    const { targetId, targetUrl, secret, eventPayload } = job.data;

    logger.info("Outbound webhook worker dispatching", {
      jobId: job.id,
      targetId,
      targetUrl,
    });

    let response: Response;

    try {
      response = await fetch(targetUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": secret,
        },
        body: JSON.stringify(eventPayload),
        signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
      });
    } catch (error) {
      const retryable = isRetryableError(error);
      const message =
        error instanceof Error ? error.message : String(error ?? "unknown");

      logger.error("Outbound webhook dispatch network error", {
        jobId: job.id,
        targetId,
        targetUrl,
        retryable,
        error: message,
      });

      if (retryable) {
        throw error;
      }

      return;
    }

    if (response.status >= 400 && response.status < 500) {
      logger.warn("Outbound webhook target rejected with 4xx", {
        jobId: job.id,
        targetId,
        targetUrl,
        status: response.status,
      });
      return;
    }

    if (!response.ok) {
      logger.warn("Outbound webhook target returned retryable status", {
        jobId: job.id,
        targetId,
        targetUrl,
        status: response.status,
      });
      throw new Error(`Target returned HTTP ${response.status}`);
    }

    logger.info("Outbound webhook dispatched successfully", {
      jobId: job.id,
      targetId,
      targetUrl,
      status: response.status,
    });
  },
  {
    connection: redisConnection,
    prefix: OUTBOUND_WEBHOOK_QUEUE_PREFIX,
    concurrency: 5,
  },
);

outboundWebhookWorker.on("failed", (job, error) => {
  logger.error("Outbound webhook job failed permanently", {
    jobId: job?.id,
    targetId: job?.data?.targetId,
    targetUrl: job?.data?.targetUrl,
    error: error.message,
  });
});

logger.info("Outbound webhook worker started", {
  queue: OUTBOUND_WEBHOOK_QUEUE_NAME,
  prefix: OUTBOUND_WEBHOOK_QUEUE_PREFIX,
  concurrency: 5,
  managerQueues: [MANAGER_STOCK_SYNC_QUEUE, MANAGER_ITEMS_PROCESSED_QUEUE],
  managerSyncIntervalMs: env.MANAGER_SYNC_INTERVAL_MS,
});

/**
 * §12A.4: the stock lane, one job at a time. A retryable failure inside
 * `runStockSync` is re-thrown here, so BullMQ re-runs the whole job — which
 * re-reads state and can never send an older number.
 */
const managerStockSyncWorker = new Worker<StockSyncJobData>(
  MANAGER_STOCK_SYNC_QUEUE,
  async (job: Job<StockSyncJobData>) => {
    await runStockSync(job.data.shopId);
  },
  {
    connection: redisConnection,
    prefix: MANAGER_QUEUE_PREFIX,
    concurrency: 1,
  },
);

managerStockSyncWorker.on("failed", (job, error) => {
  logger.error("Manager stock sync job failed", {
    jobId: job?.id,
    shopId: job?.data?.shopId,
    attemptsMade: job?.attemptsMade,
    error: error.message,
  });
});

/** §12A.6: one article per request, `concurrency: 5`, in this same process. */
const managerItemsProcessedWorker = new Worker<ItemsProcessedJobData>(
  MANAGER_ITEMS_PROCESSED_QUEUE,
  async (job: Job<ItemsProcessedJobData>) => {
    const allowedAttempts = job.opts.attempts ?? 1;
    await runProcessedDelivery({
      deliveryId: job.data.deliveryId,
      isFinalAttempt: job.attemptsMade + 1 >= allowedAttempts,
    });
  },
  {
    connection: redisConnection,
    prefix: MANAGER_QUEUE_PREFIX,
    concurrency: 5,
  },
);

managerItemsProcessedWorker.on("failed", (job, error) => {
  logger.error("Manager items-processed job failed", {
    jobId: job?.id,
    deliveryId: job?.data?.deliveryId,
    attemptsMade: job?.attemptsMade,
    error: error.message,
  });
});

/**
 * §12A.4 (periodic + start), §12A.7 (re-drive) and §12A.9 (retention) share one
 * tick. A plain `setInterval` in this single worker process, not a BullMQ job
 * scheduler.
 */
const managerTick = async (): Promise<void> => {
  const shopIds = await outboundWebhookTargetRepository.listShopIdsWithActiveEvent("stock_demand");
  for (const shopId of shopIds) {
    await enqueueStockSync(shopId);
  }

  const redriveCandidates = await listProcessedRedriveCandidates(new Date());
  for (const delivery of redriveCandidates) {
    await enqueueItemsProcessed(delivery.id);
  }

  const pruned = await outboundDeliveryRepository.pruneOlderThan(
    new Date(Date.now() - env.OUTBOUND_DELIVERY_RETENTION_DAYS * DAY_MS),
  );

  logger.info("Manager signal tick complete", {
    shopsSynced: shopIds.length,
    reportsRedriven: redriveCandidates.length,
    deliveriesPruned: pruned,
  });
};

const runManagerTick = (): void => {
  void managerTick().catch((error: unknown) => {
    logger.error("Manager signal tick failed", {
      error: error instanceof Error ? error.message : String(error ?? "unknown"),
    });
  });
};

runManagerTick();
const managerTickTimer = setInterval(runManagerTick, env.MANAGER_SYNC_INTERVAL_MS);

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  logger.warn("Outbound webhook worker shutdown signal received", { signal });
  clearInterval(managerTickTimer);
  await outboundWebhookWorker.close();
  await managerStockSyncWorker.close();
  await managerItemsProcessedWorker.close();
  await closeManagerSignals();
  await redisConnection.quit();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
