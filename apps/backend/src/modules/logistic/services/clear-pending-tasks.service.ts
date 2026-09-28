import { prisma } from "../../../shared/database/prisma-client.js";
import { ConflictError, NotFoundError, ValidationError } from "../../../shared/errors/http-errors.js";
import { broadcastToShop } from "../../ws/ws-broadcaster.js";
import type { Prisma } from "@prisma/client";

const CHUNK_SIZE = 200;
const PREVIEW_TTL_MS = 5 * 60_000;

function pendingWhere(shopId: string, asOf: Date): Prisma.ScanHistoryWhereInput {
  return {
    shopId,
    isSold: true,
    logisticsCompletedAt: null,
    intention: { not: null, notIn: ["customer_took_it"] },
    lastLogisticEventType: "marked_intention",
    updatedAt: { lte: asOf },
  };
}

function notifyQueueChanged(shopId: string, batchId: string): void {
  broadcastToShop(shopId, { type: "logistic_task_queue_changed", batchId });
}

export async function previewPendingTaskClear(shopId: string) {
  const asOf = new Date();
  const rows = await prisma.scanHistory.groupBy({
    by: ["intention"],
    where: pendingWhere(shopId, asOf),
    _count: { _all: true },
  });
  const byIntention: Record<string, number> = {};
  for (const row of rows) {
    if (row.intention) byIntention[row.intention] = row._count._all;
  }
  return {
    asOf: asOf.toISOString(),
    count: Object.values(byIntention).reduce((sum, count) => sum + count, 0),
    byIntention,
  };
}

export async function clearPendingTasks(input: {
  shopId: string;
  actorUserId: string;
  actorName: string;
  asOf: Date;
  expectedCount: number;
  note?: string | undefined;
}) {
  const age = Date.now() - input.asOf.getTime();
  if (age < 0 || age > PREVIEW_TTL_MS) {
    throw new ConflictError("Preview expired. Refresh the count and confirm again.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const where = pendingWhere(input.shopId, input.asOf);
    const items = await tx.scanHistory.findMany({
      where,
      select: { id: true, orderId: true },
      orderBy: { id: "asc" },
    });
    if (items.length !== input.expectedCount) {
      throw new ConflictError("Pending tasks changed. Refresh the count and confirm again.");
    }
    if (items.length === 0) return { batchId: null, clearedCount: 0 };

    const batch = await tx.logisticTaskClearBatch.create({
      data: {
        shopId: input.shopId,
        actorUserId: input.actorUserId,
        actorName: input.actorName,
        note: input.note?.trim() || null,
        clearedCount: items.length,
      },
    });
    for (let offset = 0; offset < items.length; offset += CHUNK_SIZE) {
      const chunk = items.slice(offset, offset + CHUNK_SIZE);
      const updated = await tx.scanHistory.updateMany({
        where: { ...where, id: { in: chunk.map((item) => item.id) } },
        data: {
          lastLogisticEventType: "dismissed",
          currentClearBatchId: batch.id,
          logisticLocationId: null,
        },
      });
      if (updated.count !== chunk.length) {
        throw new ConflictError("Pending tasks changed. Refresh the count and confirm again.");
      }
      await tx.scanHistoryLogistic.createMany({
        data: chunk.map((item) => ({
          scanHistoryId: item.id,
          shopId: input.shopId,
          orderId: item.orderId,
          clearBatchId: batch.id,
          logisticLocationId: null,
          username: input.actorName,
          eventType: "dismissed" as const,
          description: input.note?.trim() || "Cleared pending task",
        })),
      });
    }
    return { batchId: batch.id, clearedCount: items.length };
  }, { maxWait: 10_000, timeout: 60_000 });

  if (result.batchId) notifyQueueChanged(input.shopId, result.batchId);
  return result;
}

async function requireBatch(shopId: string, batchId: string) {
  const batch = await prisma.logisticTaskClearBatch.findFirst({
    where: { id: batchId, shopId },
  });
  if (!batch) throw new NotFoundError("Clear operation not found for this shop");
  return batch;
}

export async function listTaskClearBatches(shopId: string, cursor?: string) {
  if (cursor) await requireBatch(shopId, cursor);
  const records = await prisma.logisticTaskClearBatch.findMany({
    where: { shopId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 21,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { _count: { select: { currentlyClearedItems: true } } },
  });
  const hasMore = records.length > 20;
  const page = records.slice(0, 20);
  return {
    batches: page.map((batch) => ({
      id: batch.id,
      actorName: batch.actorName,
      createdAt: batch.createdAt,
      note: batch.note,
      clearedCount: batch.clearedCount,
      remainingCount: batch._count.currentlyClearedItems,
    })),
    nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
  };
}

export async function getTaskClearBatchItems(shopId: string, batchId: string, cursor?: string) {
  const batch = await requireBatch(shopId, batchId);
  if (cursor) {
    const belongsToBatch = await prisma.scanHistoryLogistic.findFirst({
      where: { id: cursor, shopId, clearBatchId: batchId, eventType: "dismissed" },
      select: { id: true },
    });
    if (!belongsToBatch) throw new ValidationError("Invalid clear-history cursor");
  }
  const [remainingCount, rows] = await Promise.all([
    prisma.scanHistory.count({ where: { shopId, currentClearBatchId: batchId, lastLogisticEventType: "dismissed" } }),
    prisma.scanHistoryLogistic.findMany({
    where: { shopId, clearBatchId: batchId, eventType: "dismissed" },
    orderBy: { id: "asc" },
    take: 21,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      scanHistory: {
        select: {
          id: true,
          itemSku: true,
          itemTitle: true,
          orderNumber: true,
          intention: true,
          lastLogisticEventType: true,
          currentClearBatchId: true,
        },
      },
    },
    }),
  ]);
  const hasMore = rows.length > 20;
  const page = rows.slice(0, 20);
  return {
    batch: { id: batch.id, actorName: batch.actorName, createdAt: batch.createdAt, note: batch.note, clearedCount: batch.clearedCount, remainingCount },
    items: page.map((event) => ({
      id: event.scanHistory.id,
      sku: event.scanHistory.itemSku,
      title: event.scanHistory.itemTitle,
      orderNumber: event.scanHistory.orderNumber,
      intention: event.scanHistory.intention,
      currentStatus: event.scanHistory.lastLogisticEventType,
      canRestore: event.scanHistory.currentClearBatchId === batchId && event.scanHistory.lastLogisticEventType === "dismissed",
    })),
    nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
  };
}

export async function restoreClearedTasks(input: {
  shopId: string;
  batchId: string;
  scanHistoryId?: string;
  username: string;
}) {
  const batch = await requireBatch(input.shopId, input.batchId);
  if (input.scanHistoryId) {
    const member = await prisma.scanHistoryLogistic.findFirst({
      where: { shopId: input.shopId, clearBatchId: batch.id, scanHistoryId: input.scanHistoryId, eventType: "dismissed" },
      select: { id: true },
    });
    if (!member) throw new NotFoundError("Item is not part of this clear operation");
  }

  const restoredCount = await prisma.$transaction(async (tx) => {
    const where = {
      shopId: input.shopId,
      currentClearBatchId: batch.id,
      lastLogisticEventType: "dismissed" as const,
      logisticsCompletedAt: null,
      ...(input.scanHistoryId ? { id: input.scanHistoryId } : {}),
    };
    const items = await tx.scanHistory.findMany({
      where,
      select: { id: true, orderId: true },
      orderBy: { id: "asc" },
    });
    for (let offset = 0; offset < items.length; offset += CHUNK_SIZE) {
      const chunk = items.slice(offset, offset + CHUNK_SIZE);
      const updated = await tx.scanHistory.updateMany({
        where: { ...where, id: { in: chunk.map((item) => item.id) } },
        data: { lastLogisticEventType: "marked_intention", currentClearBatchId: null },
      });
      if (updated.count !== chunk.length) throw new ConflictError("Tasks changed during restore. Try again.");
      await tx.scanHistoryLogistic.createMany({
        data: chunk.map((item) => ({
          scanHistoryId: item.id,
          shopId: input.shopId,
          orderId: item.orderId,
          clearBatchId: batch.id,
          logisticLocationId: null,
          username: input.username,
          eventType: "marked_intention" as const,
          description: "Restored from cleared tasks",
        })),
      });
    }
    return items.length;
  }, { maxWait: 10_000, timeout: 60_000 });

  if (restoredCount) notifyQueueChanged(input.shopId, batch.id);
  return {
    restoredCount,
    skippedCount: input.scanHistoryId ? 1 - restoredCount : batch.clearedCount - restoredCount,
  };
}
