import { Queue } from "bullmq";
import { redisConnection } from "./redis-connection.js";

export const OUTBOUND_WEBHOOK_QUEUE_NAME = "outbound-webhooks";
export const OUTBOUND_WEBHOOK_QUEUE_PREFIX = "iss";

export type OutboundWebhookJobPayload = {
  targetId: string;
  targetUrl: string;
  secret: string;
  eventPayload: unknown;
};

export const outboundWebhookQueue = new Queue<OutboundWebhookJobPayload>(
  OUTBOUND_WEBHOOK_QUEUE_NAME,
  {
    connection: redisConnection,
    prefix: OUTBOUND_WEBHOOK_QUEUE_PREFIX,
    defaultJobOptions: {
      attempts: 4,
      backoff: {
        type: "exponential",
        delay: 5_000,
      },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  },
);
