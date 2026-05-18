import { prisma } from "../../../shared/database/prisma-client.js";
import type { GetLogisticItemsQuery } from "../contracts/logistic.contract.js";
import type {
  LogisticEventType,
  LogisticIntention,
  LogisticItemsPage,
  LogisticItemSummary,
  LogisticZoneType,
} from "../domain/logistic.domain.js";

const toPropertiesObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const DEFAULT_PAGE_SIZE = 20;

export const getLogisticItemsQuery = async (input: {
  shopId: string;
  filters: GetLogisticItemsQuery;
}): Promise<LogisticItemsPage> => {
  const { shopId, filters } = input;
  const usesCompletedStatusRules =
    filters.lastLogisticEventType === "fulfilled";

  const where: any = {
    shopId,
    isSold: true,
    logisticsCompletedAt: usesCompletedStatusRules ? { not: null } : null,
  };

  if (filters.noIntention) {
    where.intention = null;
  } else if (!usesCompletedStatusRules) {
    where.intention = {
      not: null,
      notIn: ["customer_took_it"],
    };
  }

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

  if (filters.q) {
    const orConditions: any[] = [
      { itemSku: { contains: filters.q } },
      { itemBarcode: { contains: filters.q } },
      { itemType: { contains: filters.q } },
      { itemCategory: { contains: filters.q } },
      { itemTitle: { contains: filters.q } },
      { logisticLocation: { location: { contains: filters.q } } },
    ];
    const orderNum = parseInt(filters.q, 10);
    if (!isNaN(orderNum)) {
      orConditions.push({ orderNumber: orderNum });
    }
    where.AND = [...(where.AND ?? []), { OR: orConditions }];
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

  // Cursor-based pagination: cursor format is "<orderNumber|\"null\">|<id>"
  // Sort is orderNumber DESC, id ASC.
  // For non-null cursor orderNumber: next page has lower orderNumber,
  // OR same orderNumber with id > cursorId, OR null orderNumber values.
  // For null cursor orderNumber: next page has null orderNumber with id > cursorId.
  if (filters.cursor) {
    const separatorIndex = filters.cursor.indexOf("|");
    const rawOrderNumber = filters.cursor.slice(0, separatorIndex);
    const cursorId = filters.cursor.slice(separatorIndex + 1);
    const cursorOrderNumber =
      rawOrderNumber === "null" ? null : Number.parseInt(rawOrderNumber, 10);

    if (cursorOrderNumber === null) {
      where.AND = [
        ...(where.AND ?? []),
        {
          AND: [{ orderNumber: null }, { id: { gt: cursorId } }],
        },
      ];
    } else if (!Number.isNaN(cursorOrderNumber)) {
      where.AND = [
        ...(where.AND ?? []),
        {
          OR: [
            { orderNumber: { lt: cursorOrderNumber } },
            {
              AND: [
                { orderNumber: cursorOrderNumber },
                { id: { gt: cursorId } },
              ],
            },
            { orderNumber: null },
          ],
        },
      ];
    }
  }

  const limit = filters.ids
    ? undefined // no pagination limit for targeted id refetches
    : (filters.limit ?? DEFAULT_PAGE_SIZE);

  const records = await prisma.scanHistory.findMany({
    where,
    orderBy: [{ orderNumber: "desc" }, { id: "asc" }],
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
      quantity: record.quantity,
      itemSku: record.itemSku ?? null,
      itemBarcode: record.itemBarcode ?? null,
      itemImageUrl: record.itemImageUrl ?? null,
      properties: toPropertiesObject(record.properties),
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
      logisticsCompletedAt: record.logisticsCompletedAt ?? null,
      lastLogisticEventType:
        record.lastLogisticEventType as LogisticEventType | null,
      updatedAt: record.updatedAt,
      logisticEvent: latestEvent
        ? {
            username: latestEvent.username,
            description: latestEvent.description ?? null,
            eventType: latestEvent.eventType as LogisticEventType,
            location: latestEvent.logisticLocation?.location ?? null,
            zoneType: latestEvent.logisticLocation
              ?.zoneType as LogisticZoneType | null,
            happenedAt: latestEvent.happenedAt,
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
      ? `${lastRecord.orderNumber ?? "null"}|${lastRecord.id}`
      : null;

  return { orders, hasMore, nextCursor };
};
