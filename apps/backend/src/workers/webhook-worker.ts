import "../config/load-env.js";
import { AppError } from "../shared/errors/app-error.js";
import { initializeDatabaseRuntime } from "../shared/database/sqlite-runtime.js";
import { logger } from "../shared/logging/logger.js";
import {
  BULLMQ_QUEUE_OPTIONS,
  QUEUE_NAME,
  redisConnection,
} from "../shared/queue/index.js";
import { createWsBroadcastPublisher } from "../shared/queue/ws-bridge.js";
import { Worker, type Job } from "bullmq";
import { webhookIntakeRepository } from "../modules/shopify/repositories/webhook-intake.repository.js";
import { processShopifyWebhookIntakeJob } from "../modules/shopify/jobs/process-shopify-webhook-intake.job.js";

const isTransientError = (error: unknown): boolean => {
  const message =
    error instanceof Error ? error.message : String(error ?? "unknown");

  return (
    message.includes("Socket timeout") ||
    message.includes("Transaction already closed") ||
    message.includes("SQLITE_BUSY") ||
    message.includes("SQLITE_LOCKED") ||
    message.includes("connect ECONNREFUSED")
  );
};

const isRetryableError = (error: unknown): boolean => {
  if (error instanceof SyntaxError) {
    return false;
  }

  if (error instanceof AppError) {
    if (
      error.statusCode === 401 ||
      error.statusCode === 403 ||
      error.statusCode === 404 ||
      error.statusCode === 400
    ) {
      return false;
    }
  }

  return isTransientError(error);
};

await initializeDatabaseRuntime();

const wsBroadcastPublisher = createWsBroadcastPublisher();

const worker = new Worker(
  QUEUE_NAME,
  async (job: Job<{ intakeId: string }>) => {
    const { intakeId } = job.data;
    const intake = await webhookIntakeRepository.findById(intakeId);

    if (!intake) {
      logger.warn("Webhook worker intake record not found", {
        intakeId,
        jobId: job.id,
      });
      return;
    }

    if (intake.status === "processed") {
      logger.info("Webhook worker skipping processed intake", {
        intakeId,
        topic: intake.topic,
      });
      return;
    }

    await webhookIntakeRepository.markProcessing(intakeId);

    try {
      await processShopifyWebhookIntakeJob(intake, {
        broadcast: wsBroadcastPublisher.publish,
      });

      await webhookIntakeRepository.markProcessed(intakeId);
      logger.info("Webhook worker processed intake", {
        intakeId,
        topic: intake.topic,
      });
    } catch (error) {
      const retryable = isRetryableError(error);
      const message =
        error instanceof Error ? error.message : String(error ?? "unknown");

      await webhookIntakeRepository.markFailed(intakeId, message, retryable);

      logger.error("Webhook worker failed", {
        intakeId,
        topic: intake.topic,
        retryable,
        error: message,
      });

      if (retryable) {
        throw error;
      }
    }
  },
  {
    connection: redisConnection,
    prefix: BULLMQ_QUEUE_OPTIONS.prefix,
    concurrency: 1,
  },
);

worker.on("failed", (job, error) => {
  logger.error("Webhook worker job failed permanently", {
    jobId: job?.id,
    intakeId: job?.data?.intakeId,
    error: error.message,
  });
});

logger.info("Webhook worker started", {
  queue: QUEUE_NAME,
  prefix: BULLMQ_QUEUE_OPTIONS.prefix,
  concurrency: 1,
});

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  logger.warn("Webhook worker shutdown signal received", { signal });
  await worker.close();
  await wsBroadcastPublisher.quit();
  await redisConnection.quit();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
