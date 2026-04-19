import { prisma } from "../../../shared/database/prisma-client.js";
import type { GetLogisticItemsQuery } from "../contracts/logistic.contract.js";
import type {
  LogisticEventType,
  LogisticIntention,
  LogisticItemsPage,
  LogisticItemSummary,
  LogisticZoneType,
} from "../domain/logistic.domain.js";

const DEFAULT_PAGE_SIZE = 20;

export const getLogisticItemsQuery = async (input: {
  shopId: string;
  filters: GetLogisticItemsQuery;
}): Promise<LogisticItemsPage> => {
  const { shopId, filters } = input;

  const where: any = {
    shopId,
    isSold: true,
    intention: filters.noIntention
      ? null
      : {
          not: null,
          notIn: ["customer_took_it"],
        },
    logisticsCompletedAt: null,
  };

  if (typeof filters.fixItem === "boolean") {
    where.fixItem = filters.fixItem;
  }

  if (typeof filters.isItemFixed === "boolean") {
    where.isItemFixed = filters.isItemFixed;
  }

  if (filters.lastLogisticEventType) {
    where.lastLogisticEventType = filters.lastLogisticEventType;
  }

  if (filters.intention) {
    where.intention = filters.intention;
  }

  if (filters.orderId) {
    where.orderId = filters.orderId;
  }

  if (filters.zoneType) {
    where.logisticLocation = { zoneType: filters.zoneType };
  }

  if (filters.ids) {
    const idList = filters.ids
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (idList.length > 0) {
      where.id = { in: idList };
    }
  }

  // Cursor-based pagination: cursor format is "<updatedAt ISO>|<id>"
  // Sort is updatedAt DESC, id ASC — next page has updatedAt < cursorDate
  // OR (updatedAt = cursorDate AND id > cursorId)
  if (filters.cursor) {
    const separatorIndex = filters.cursor.indexOf("|");
    const isoStr = filters.cursor.slice(0, separatorIndex);
    const cursorId = filters.cursor.slice(separatorIndex + 1);
    const cursorDate = new Date(isoStr);
    where.AND = [
      ...(where.AND ?? []),
      {
        OR: [
          { updatedAt: { lt: cursorDate } },
          { AND: [{ updatedAt: cursorDate }, { id: { gt: cursorId } }] },
        ],
      },
    ];
  }

  const limit = filters.ids
    ? undefined // no pagination limit for targeted id refetches
    : (filters.limit ?? DEFAULT_PAGE_SIZE);

  const records = await prisma.scanHistory.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    ...(limit !== undefined ? { take: limit + 1 } : {}),
    include: {
      logisticEvents: {
        orderBy: { happenedAt: "desc" },
        take: 1,
        include: { logisticLocation: true },
      },
    },
  });

  const hasMore = limit !== undefined && records.length > limit;
  const pageRecords = hasMore ? records.slice(0, limit) : records;

  const items: LogisticItemSummary[] = pageRecords.map((record) => {
    const latestEvent = record.logisticEvents[0] ?? null;
    return {
      id: record.id,
      productId: record.productId,
      itemSku: record.itemSku ?? null,
      itemBarcode: record.itemBarcode ?? null,
      itemImageUrl: record.itemImageUrl ?? null,
      itemCategory: record.itemCategory ?? null,
      itemType: record.itemType,
      itemTitle: record.itemTitle,
      latestLocation: record.latestLocation ?? null,
      orderId: record.orderId ?? null,
      orderNumber: record.orderNumber ?? null,
      intention: record.intention as LogisticIntention,
      fixItem: record.fixItem ?? null,
      isItemFixed: record.isItemFixed,
      fixNotes: record.fixNotes ?? null,
      scheduledDate: record.scheduledDate ?? null,
      lastLogisticEventType:
        record.lastLogisticEventType as LogisticEventType | null,
      updatedAt: record.updatedAt,
      logisticEvent: latestEvent
        ? {
            username: latestEvent.username,
            eventType: latestEvent.eventType as LogisticEventType,
            location: latestEvent.logisticLocation?.location ?? null,
            zoneType: latestEvent.logisticLocation
              ?.zoneType as LogisticZoneType | null,
          }
        : null,
    };
  });

  // Group by orderId — non-null orderId groups first
  const groupMap = new Map<string | null, LogisticItemSummary[]>();

  for (const item of items) {
    const key = item.orderId;
    const group = groupMap.get(key) ?? [];
    group.push(item);
    groupMap.set(key, group);
  }

  const orders: LogisticItemsPage["orders"] = [];

  // Non-null order groups first
  for (const [orderId, groupItems] of groupMap.entries()) {
    if (orderId !== null) {
      orders.push({ orderId, items: groupItems });
    }
  }

  // Null group last
  const nullGroup = groupMap.get(null);
  if (nullGroup) {
    orders.push({ orderId: null, items: nullGroup });
  }

  const lastRecord = pageRecords[pageRecords.length - 1];
  const nextCursor =
    hasMore && lastRecord
      ? `${lastRecord.updatedAt.toISOString()}|${lastRecord.id}`
      : null;

  return { orders, hasMore, nextCursor };
};
