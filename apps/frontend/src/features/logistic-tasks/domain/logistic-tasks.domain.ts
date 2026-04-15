import type { LogisticTaskDefaultFilter } from "../../role-context/types/role-context.types";
import type {
  GetLogisticTasksResponseDto,
  LogisticTaskItemDto,
} from "../types/logistic-tasks.dto";
import type {
  LogisticIntention,
  LogisticOrderGroup,
  LogisticTaskFilters,
  LogisticTaskItem,
} from "../types/logistic-tasks.types";

export const LOGISTIC_INTENTION_LABELS: Record<LogisticIntention, string> = {
  customer_took_it: "Customer Took It",
  store_pickup: "Store Pickup",
  local_delivery: "Local Delivery",
  international_shipping: "International",
};

export const LOGISTIC_INTENTION_ORDER: LogisticIntention[] = [
  "store_pickup",
  "local_delivery",
  "international_shipping",
  "customer_took_it",
];

export function normalizeLogisticTaskItem(
  dto: LogisticTaskItemDto,
): LogisticTaskItem {
  return {
    id: dto.id,
    productId: dto.productId,
    sku: dto.itemSku,
    imageUrl: dto.itemImageUrl,
    itemType: dto.itemType,
    itemTitle: dto.itemTitle,
    location: dto.latestLocation,
    orderId: dto.orderId,
    orderNumber: dto.orderNumber ?? null,
    intention: dto.intention ?? null,
    fixItem: dto.fixItem ?? false,
    scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
    lastEventType: dto.lastLogisticEventType ?? null,
    logisticLocation: dto.logisticEvent?.location ?? null,
    logisticZoneType: dto.logisticEvent?.zoneType ?? null,
    isItemFixed: dto.isItemFixed ?? false,
    fixNotes: dto.fixNotes ?? null,
    updatedAt: new Date(dto.updatedAt),
  };
}

export function normalizeLogisticTasksPage(dto: GetLogisticTasksResponseDto): {
  items: LogisticTaskItem[];
  groups: LogisticOrderGroup[];
} {
  const groups: LogisticOrderGroup[] = dto.orders.map((orderGroup) => ({
    orderId: orderGroup.orderId,
    items: orderGroup.items.map(normalizeLogisticTaskItem),
  }));

  const items = groups.flatMap((g) => g.items);

  return { items, groups };
}

export function flattenOrderGroups(
  groups: LogisticOrderGroup[],
): LogisticTaskItem[] {
  return groups.flatMap((g) => g.items);
}

export function buildOrderGroups(
  items: LogisticTaskItem[],
): LogisticOrderGroup[] {
  const orderMap = new Map<string | null, LogisticTaskItem[]>();

  for (const item of items) {
    const key = item.orderId;
    const existing = orderMap.get(key);
    if (existing) {
      existing.push(item);
    } else {
      orderMap.set(key, [item]);
    }
  }

  // Non-null orderId groups first, then null
  const result: LogisticOrderGroup[] = [];
  for (const [orderId, groupItems] of orderMap) {
    if (orderId !== null) {
      result.push({ orderId, items: groupItems });
    }
  }

  const noOrderItems = orderMap.get(null);
  if (noOrderItems && noOrderItems.length > 0) {
    result.push({ orderId: null, items: noOrderItems });
  }

  return result;
}

export function groupByIntention(
  items: LogisticTaskItem[],
): Map<LogisticIntention, LogisticTaskItem[]> {
  const map = new Map<LogisticIntention, LogisticTaskItem[]>();

  for (const item of items) {
    if (item.intention === null) continue;
    const existing = map.get(item.intention);
    if (existing) {
      existing.push(item);
    } else {
      map.set(item.intention, [item]);
    }
  }

  return map;
}

export function countByIntention(
  items: LogisticTaskItem[],
): Partial<Record<LogisticIntention, number>> {
  const counts: Partial<Record<LogisticIntention, number>> = {};
  for (const item of items) {
    if (item.intention === null) continue;
    counts[item.intention] = (counts[item.intention] ?? 0) + 1;
  }
  return counts;
}

export function buildFiltersFromRoleDefaults(
  defaults: LogisticTaskDefaultFilter[],
): LogisticTaskFilters {
  const filters: LogisticTaskFilters = {};

  for (const { key, value } of defaults) {
    if (value === null) continue;

    if (key === "fixItem" && typeof value === "boolean") {
      filters.fixItem = value;
    } else if (key === "lastLogisticEventType" && typeof value === "string") {
      filters.lastLogisticEventType =
        value as LogisticTaskFilters["lastLogisticEventType"];
    } else if (key === "zoneType" && typeof value === "string") {
      filters.zoneType = value as LogisticTaskFilters["zoneType"];
    } else if (key === "intention" && typeof value === "string") {
      filters.intention = value as LogisticTaskFilters["intention"];
    } else if (key === "orderId" && typeof value === "string") {
      filters.orderId = value;
    } else if (key === "noIntention" && typeof value === "boolean") {
      filters.noIntention = value;
    } else if (key === "isItemFixed" && typeof value === "boolean") {
      filters.isItemFixed = value;
    }
  }

  return filters;
}

export function buildApiQueryParams(
  filters: LogisticTaskFilters,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.fixItem !== undefined) {
    params.set("fixItem", String(filters.fixItem));
  }
  if (filters.lastLogisticEventType !== undefined) {
    params.set("lastLogisticEventType", filters.lastLogisticEventType);
  }
  if (filters.zoneType !== undefined) {
    params.set("zoneType", filters.zoneType);
  }
  if (filters.intention !== undefined) {
    params.set("intention", filters.intention);
  }
  if (filters.orderId !== undefined) {
    params.set("orderId", filters.orderId);
  }
  if (filters.noIntention !== undefined) {
    params.set("noIntention", String(filters.noIntention));
  }
  if (filters.isItemFixed !== undefined) {
    params.set("isItemFixed", String(filters.isItemFixed));
  }

  return params;
}

export function formatScheduledDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Returns false when an item no longer satisfies the currently active
 * server-side filters after an optimistic local mutation.
 * Used to evict items from the store without waiting for a network round-trip.
 */
export function itemMatchesFilters(
  item: LogisticTaskItem,
  filters: LogisticTaskFilters,
): boolean {
  if (filters.noIntention === true && item.intention !== null) return false;
  if (filters.intention !== undefined && item.intention !== filters.intention)
    return false;
  if (
    filters.lastLogisticEventType !== undefined &&
    item.lastEventType !== filters.lastLogisticEventType
  )
    return false;
  if (filters.fixItem !== undefined && item.fixItem !== filters.fixItem)
    return false;
  if (
    filters.zoneType !== undefined &&
    item.logisticZoneType !== filters.zoneType
  )
    return false;
  if (filters.orderId !== undefined && item.orderId !== filters.orderId)
    return false;
  if (
    filters.isItemFixed !== undefined &&
    item.isItemFixed !== filters.isItemFixed
  )
    return false;
  return true;
}
