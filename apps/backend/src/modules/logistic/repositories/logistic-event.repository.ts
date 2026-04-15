import { prisma } from "../../../shared/database/prisma-client.js";
import type {
  LogisticEvent,
  LogisticLocation,
} from "../domain/logistic.domain.js";

const toLocationDomain = (record: any): LogisticLocation | null => {
  if (!record) return null;
  return {
    id: record.id,
    shopId: record.shopId,
    location: record.location,
    zoneType: record.zoneType,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

const toDomain = (record: any): LogisticEvent => ({
  id: record.id,
  scanHistoryId: record.scanHistoryId,
  shopId: record.shopId,
  orderId: record.orderId ?? null,
  logisticLocationId: record.logisticLocationId ?? null,
  username: record.username,
  eventType: record.eventType,
  happenedAt: record.happenedAt,
  createdAt: record.createdAt,
  logisticLocation: record.logisticLocation
    ? toLocationDomain(record.logisticLocation)
    : null,
});

export const logisticEventRepository = {
  /**
   * Atomically:
   * 1. Creates a ScanHistoryLogistic record
   * 2. Updates ScanHistory denormalised fields (lastLogisticEventType, logisticLocationId)
   * 3. Optionally sets logisticsCompletedAt (for fulfilled events)
   */
  async appendEvent(input: {
    scanHistoryId: string;
    shopId: string;
    orderId: string | null;
    logisticLocationId: string | null;
    username: string;
    eventType: "marked_intention" | "placed" | "fulfilled";
    completedAt?: Date;
  }): Promise<LogisticEvent> {
    return prisma.$transaction(async (tx) => {
      const event = await tx.scanHistoryLogistic.create({
        data: {
          scanHistoryId: input.scanHistoryId,
          shopId: input.shopId,
          orderId: input.orderId,
          logisticLocationId: input.logisticLocationId,
          username: input.username,
          eventType: input.eventType as any,
        },
        include: { logisticLocation: true },
      });

      await tx.scanHistory.update({
        where: { id: input.scanHistoryId },
        data: {
          lastLogisticEventType: input.eventType as any,
          logisticLocationId: input.logisticLocationId,
          ...(input.completedAt
            ? { logisticsCompletedAt: input.completedAt }
            : {}),
        },
      });

      return toDomain(event);
    });
  },

  async findLatestForScanHistory(
    scanHistoryId: string,
  ): Promise<LogisticEvent | null> {
    const record = await prisma.scanHistoryLogistic.findFirst({
      where: { scanHistoryId },
      orderBy: { happenedAt: "desc" },
      include: { logisticLocation: true },
    });
    return record ? toDomain(record) : null;
  },
};
