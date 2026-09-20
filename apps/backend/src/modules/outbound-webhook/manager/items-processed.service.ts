import { logger } from "../../../shared/logging/logger.js";
import type { OutboundWebhookDeliveryRecord } from "../contracts/outbound-webhook.contract.js";
import { outboundDeliveryRepository } from "../repositories/outbound-delivery.repository.js";
import { outboundWebhookTargetRepository } from "../repositories/outbound-webhook-target.repository.js";
import {
  logRejectedResponse,
  postJson,
  sendManagerRequest,
  truncateResponseBody,
  type PostJson,
} from "./manager-http.js";

export type ProcessedDeps = {
  post: PostJson;
  now: () => Date;
};

export const defaultProcessedDeps: ProcessedDeps = {
  post: postJson,
  now: () => new Date(),
};

/**
 * Thrown so BullMQ retries the delivery. The stored `requestBody` is replayed
 * byte-for-byte, so a retry can never reformat the article number.
 */
export class ProcessedRetryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProcessedRetryError";
  }
}

/**
 * §12A.6 guards the worker against re-sending a finished report. `rejected` is
 * admitted only for a 401, which §12A.7 (Card 8) requires the re-drive to repeat
 * once the key is fixed; every other `rejected`, `delivered` and `skipped` row is
 * final.
 */
const isSendable = (delivery: OutboundWebhookDeliveryRecord): boolean =>
  delivery.status === "pending" ||
  delivery.status === "failed" ||
  (delivery.status === "rejected" && delivery.responseStatus === 401);

/**
 * §12A.6 worker handler. One article per request, always; the target's URL and
 * secret are read here, at send time, so a rotated secret or a deactivated target
 * takes effect on the next attempt (§5.3).
 */
export const runProcessedDelivery = async (
  input: { deliveryId: string; isFinalAttempt: boolean },
  deps: ProcessedDeps = defaultProcessedDeps,
): Promise<void> => {
  const delivery = await outboundDeliveryRepository.findById(input.deliveryId);
  if (!delivery || !isSendable(delivery)) {
    return;
  }

  const attempts = delivery.attempts + 1;
  const context = {
    shopId: delivery.shopId,
    deliveryId: delivery.id,
    targetId: delivery.targetId,
    subjectKey: delivery.subjectKey,
  };

  const target = delivery.targetId
    ? await outboundWebhookTargetRepository.findActiveById({
        id: delivery.targetId,
        shopId: delivery.shopId,
      })
    : null;

  if (!target) {
    await outboundDeliveryRepository.recordAttempt({
      id: delivery.id,
      status: "skipped",
      attempts: delivery.attempts,
      responseStatus: delivery.responseStatus,
      responseBody: delivery.responseBody,
      lastError: "target_inactive",
      lastAttemptAt: delivery.lastAttemptAt ?? deps.now(),
      completedAt: deps.now(),
    });
    logger.warn("Manager processed report not sent: target missing or inactive", context);
    return;
  }

  const response = await sendManagerRequest({
    kind: "processed",
    url: target.targetUrl,
    secret: target.secret,
    body: delivery.requestBody,
    entryCount: 1,
    post: deps.post,
  });
  const attemptAt = deps.now();

  if (response.kind === "ok") {
    await outboundDeliveryRepository.recordAttempt({
      id: delivery.id,
      status: "delivered",
      attempts,
      responseStatus: response.status,
      responseBody: truncateResponseBody(response.body),
      lastAttemptAt: attemptAt,
      completedAt: attemptAt,
    });
    logger.info("Manager processed report delivered", {
      ...context,
      status: response.status,
      outcome: response.results[0]?.outcome ?? null,
      reason: response.results[0]?.reason ?? null,
    });
    return;
  }

  if (response.kind === "unparseable") {
    await outboundDeliveryRepository.recordAttempt({
      id: delivery.id,
      status: "delivered",
      attempts,
      responseStatus: response.status,
      responseBody: truncateResponseBody(response.body),
      lastError: "unparseable_response",
      lastAttemptAt: attemptAt,
      completedAt: attemptAt,
    });
    logger.error("Manager processed response could not be read", {
      ...context,
      status: response.status,
    });
    return;
  }

  if (response.kind === "rejected") {
    await outboundDeliveryRepository.recordAttempt({
      id: delivery.id,
      status: "rejected",
      attempts,
      responseStatus: response.status,
      responseBody: truncateResponseBody(response.body),
      lastAttemptAt: attemptAt,
      completedAt: attemptAt,
    });
    logRejectedResponse(response.status, response.body, context);
    return;
  }

  if (response.kind === "fatal") {
    await outboundDeliveryRepository.recordAttempt({
      id: delivery.id,
      status: "failed",
      attempts,
      lastError: response.error,
      lastAttemptAt: attemptAt,
      completedAt: attemptAt,
    });
    logger.error("Manager processed report failed without a retry", {
      ...context,
      error: response.error,
    });
    return;
  }

  // Retryable: the row stays `pending` while attempts remain (§12A.8) and only
  // becomes `failed` once BullMQ has exhausted them — which is what the §12A.7
  // re-drive later picks up.
  await outboundDeliveryRepository.recordAttempt({
    id: delivery.id,
    status: input.isFinalAttempt ? "failed" : "pending",
    attempts,
    responseStatus: response.status,
    responseBody: truncateResponseBody(response.body),
    lastError: response.error,
    lastAttemptAt: attemptAt,
    completedAt: input.isFinalAttempt ? attemptAt : null,
  });

  if (input.isFinalAttempt) {
    logger.error("Manager processed report failed after every attempt", {
      ...context,
      error: response.error,
    });
  } else {
    logger.warn("Manager processed report failed; it will be retried", {
      ...context,
      error: response.error,
    });
  }

  throw new ProcessedRetryError(response.error);
};

/** §12A.7: the bounded, oldest-first re-drive selection for one worker tick. */
export const listProcessedRedriveCandidates = async (
  now: Date = new Date(),
): Promise<OutboundWebhookDeliveryRecord[]> =>
  outboundDeliveryRepository.listRedriveCandidates(now);
