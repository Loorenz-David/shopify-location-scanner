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

const DISPATCH_TIMEOUT_MS = 8_000;
const MAX_LOGGED_RESPONSE_BODY_CHARS = 2_000;

const isRetryableError = (error: unknown): boolean => {
  const message =
    error instanceof Error ? error.message : String(error ?? "unknown");

  return (
    message.includes("fetch failed") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ECONNRESET") ||
    message.includes("TimeoutError") ||
    message.includes("socket hang up")
  );
};

await initializeDatabaseRuntime();

const truncateForLog = (value: string): string => {
  if (value.length <= MAX_LOGGED_RESPONSE_BODY_CHARS) {
    return value;
  }

  return `${value.slice(0, MAX_LOGGED_RESPONSE_BODY_CHARS)}...<truncated>`;
};

const outboundWebhookWorker = new Worker<OutboundWebhookJobPayload>(
  OUTBOUND_WEBHOOK_QUEUE_NAME,
  async (job: Job<OutboundWebhookJobPayload>) => {
    const { targetId, targetUrl, secret, eventPayload } = job.data;

    logger.info("Outbound webhook worker dispatching", {
      jobId: job.id,
      targetId,
      targetUrl,
      eventPayload,
      requestHeaders: {
        "Content-Type": "application/json",
        "x-api-key": "[redacted]",
      },
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

    const responseBody = truncateForLog(await response.text());

    if (response.status >= 400 && response.status < 500) {
      logger.warn("Outbound webhook target rejected with 4xx", {
        jobId: job.id,
        targetId,
        targetUrl,
        status: response.status,
        responseBody,
      });
      return;
    }

    if (!response.ok) {
      logger.warn("Outbound webhook target returned retryable status", {
        jobId: job.id,
        targetId,
        targetUrl,
        status: response.status,
        responseBody,
      });
      throw new Error(`Target returned HTTP ${response.status}`);
    }

    logger.info("Outbound webhook dispatched successfully", {
      jobId: job.id,
      targetId,
      targetUrl,
      status: response.status,
      responseBody,
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
});

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  logger.warn("Outbound webhook worker shutdown signal received", { signal });
  await outboundWebhookWorker.close();
  await redisConnection.quit();
  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
