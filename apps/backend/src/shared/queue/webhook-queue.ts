import { Queue } from "bullmq";
import { redisConnection } from "./redis-connection.js";

export const QUEUE_PREFIX = "iss";
export const QUEUE_NAME = "shopify-webhooks";

export const BULLMQ_QUEUE_OPTIONS = {
  prefix: QUEUE_PREFIX,
} as const;

export type WebhookJobPayload = {
  intakeId: string;
};

export const webhookQueue = new Queue<WebhookJobPayload>(QUEUE_NAME, {
  connection: redisConnection,
  prefix: QUEUE_PREFIX,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: "exponential",
      delay: 2_000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});
