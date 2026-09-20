import { prisma } from "../../../shared/database/prisma-client.js";
import type {
  DeliveryQuery,
  OutboundDeliveryStatus,
  OutboundEventType,
  OutboundWebhookDeliveryRecord,
} from "../contracts/outbound-webhook.contract.js";

/** §12A.7: a `pending` row this old never reached the queue (Redis was down). */
const PENDING_STALE_MS = 5 * 60 * 1_000;
/** §12A.7, Card 8: how far back a failed or 401-rejected report is still re-sent. */
const REDRIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1_000;
/** §12A.7: oldest first, bounded so a wrong key cannot flood Manager. */
const REDRIVE_LIMIT = 200;

export const outboundDeliveryRepository = {
  async create(input: {
    shopId: string;
    targetId: string | null;
    eventType: OutboundEventType;
    subjectKey?: string | null;
    status: OutboundDeliveryStatus;
    requestBody: string;
    lastError?: string | null;
    completedAt?: Date | null;
  }): Promise<OutboundWebhookDeliveryRecord> {
    return prisma.outboundWebhookDelivery.create({
      data: {
        shopId: input.shopId,
        targetId: input.targetId,
        eventType: input.eventType,
        subjectKey: input.subjectKey ?? null,
        status: input.status,
        requestBody: input.requestBody,
        lastError: input.lastError ?? null,
        completedAt: input.completedAt ?? null,
      },
    }) as unknown as Promise<OutboundWebhookDeliveryRecord>;
  },

  async recordAttempt(input: {
    id: string;
    status: OutboundDeliveryStatus;
    attempts: number;
    responseStatus?: number | null;
    responseBody?: string | null;
    lastError?: string | null;
    lastAttemptAt: Date;
    completedAt?: Date | null;
  }): Promise<void> {
    await prisma.outboundWebhookDelivery.update({
      where: { id: input.id },
      data: {
        status: input.status,
        attempts: input.attempts,
        responseStatus: input.responseStatus ?? null,
        responseBody: input.responseBody ?? null,
        lastError: input.lastError ?? null,
        lastAttemptAt: input.lastAttemptAt,
        completedAt: input.completedAt ?? null,
      },
    });
  },

  async findById(id: string): Promise<OutboundWebhookDeliveryRecord | null> {
    return prisma.outboundWebhookDelivery.findUnique({
      where: { id },
    }) as unknown as Promise<OutboundWebhookDeliveryRecord | null>;
  },

  /** §12A.9: `createdAt desc`, every stored field, exact match on `subjectKey`. */
  async list(input: { shopId: string } & DeliveryQuery): Promise<OutboundWebhookDeliveryRecord[]> {
    return prisma.outboundWebhookDelivery.findMany({
      where: {
        shopId: input.shopId,
        ...(input.eventType ? { eventType: input.eventType } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.subject === undefined ? {} : { subjectKey: input.subject }),
        ...(input.since ? { createdAt: { gte: input.since } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: input.limit,
    }) as unknown as Promise<OutboundWebhookDeliveryRecord[]>;
  },

  /**
   * §12A.7 selection, evaluated against the clock at tick time. A `delivered` or
   * `skipped` row is never re-sent, and neither is anything outside the window.
   */
  async listRedriveCandidates(now: Date): Promise<OutboundWebhookDeliveryRecord[]> {
    const windowStart = new Date(now.getTime() - REDRIVE_WINDOW_MS);

    return prisma.outboundWebhookDelivery.findMany({
      where: {
        eventType: "items_processed",
        OR: [
          {
            status: "pending",
            createdAt: { lt: new Date(now.getTime() - PENDING_STALE_MS) },
          },
          { status: "failed", createdAt: { gte: windowStart } },
          { status: "rejected", responseStatus: 401, createdAt: { gte: windowStart } },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: REDRIVE_LIMIT,
    }) as unknown as Promise<OutboundWebhookDeliveryRecord[]>;
  },

  /** §12A.9 retention. Ledger rows are never pruned. */
  async pruneOlderThan(before: Date): Promise<number> {
    const result = await prisma.outboundWebhookDelivery.deleteMany({
      where: { createdAt: { lt: before } },
    });
    return result.count;
  },
};
