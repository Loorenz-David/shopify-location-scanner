import { prisma } from "../../../shared/database/prisma-client.js";
import type { GetLogisticItemsQuery } from "../contracts/logistic.contract.js";
import type {
  LogisticEventType,
  LogisticIntention,
  LogisticItemsPage,
  LogisticItemSummary,
  LogisticZoneType,
} from "../domain/logistic.domain.js";

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

  const records = await prisma.scanHistory.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      logisticEvents: {
        orderBy: { happenedAt: "desc" },
        take: 1,
        include: { logisticLocation: true },
      },
    },
  });

  const items: LogisticItemSummary[] = records.map((record) => {
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
      intention: record.intention as LogisticIntention,
      fixItem: record.fixItem ?? null,
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

  return { orders };
};
