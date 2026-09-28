import type { GetLogisticItemsQuery } from "../contracts/logistic.contract.js";

// Shared by the paginated list and the unpaginated intention totals.
export function buildLogisticItemsWhere(shopId: string, filters: GetLogisticItemsQuery): any {
  const usesCompletedStatusRules = filters.lastLogisticEventType === "fulfilled";
  const where: any = {
    shopId,
    isSold: true,
    logisticsCompletedAt: usesCompletedStatusRules ? { not: null } : null,
  };

  if (filters.noIntention) {
    where.intention = null;
  } else if (!usesCompletedStatusRules) {
    where.intention = { not: null, notIn: ["customer_took_it"] };
  }
  if (typeof filters.fixItem === "boolean") where.fixItem = filters.fixItem;
  if (typeof filters.isItemFixed === "boolean") where.isItemFixed = filters.isItemFixed;
  if (filters.lastLogisticEventType) where.lastLogisticEventType = filters.lastLogisticEventType;
  else where.AND = [{ OR: [{ lastLogisticEventType: null }, { lastLogisticEventType: { not: "dismissed" } }] }];
  if (filters.intention) where.intention = filters.intention;
  if (filters.orderId) where.orderId = filters.orderId;
  if (filters.zoneType) where.logisticLocation = { zoneType: filters.zoneType };

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
    if (!isNaN(orderNum)) orConditions.push({ orderNumber: orderNum });
    where.AND = [...(where.AND ?? []), { OR: orConditions }];
  }

  if (filters.ids) {
    const idList = filters.ids.split(",").map((id) => id.trim()).filter(Boolean);
    if (idList.length > 0) where.id = { in: idList };
  }

  return where;
}
