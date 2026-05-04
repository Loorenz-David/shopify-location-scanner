import type {
  ItemScanHistoryEntryDto,
  ItemScanHistoryPayloadDto,
} from "../types/item-scan-history.dto";
import type {
  ItemScanHistoryEvent,
  ItemScanHistoryItem,
  ItemScanHistoryLogisticEvent,
  ItemScanHistoryPriceHistory,
  ItemScanHistoryTimelineEvent,
} from "../types/item-scan-history.types";
import { normalizeShopifyImageUrl } from "../../shopify/domain/shopify-image.domain";

const shortDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const fullDateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function normalizeItemScanHistoryPayload(
  payload: ItemScanHistoryPayloadDto,
) {
  const items = payload.items.map(normalizeItemScanHistoryItem);

  return {
    items,
    page: payload.page,
    pageSize: payload.pageSize,
    total: payload.total,
    hasMore: payload.hasMore,
    nextCursor: payload.nextCursor,
  };
}

export function normalizeItemScanHistoryItem(
  item: ItemScanHistoryEntryDto,
): ItemScanHistoryItem {
  const events = [...item.events]
    .sort(compareNewestFirst)
    .map((event, index) => ({
      id: `${item.id}-${event.happenedAt}-${index}`,
      kind: "scan" as const,
      eventType: event.eventType,
      orderId: event.orderId,
      orderGroupId: event.orderGroupId,
      location: event.location,
      happenedAt: event.happenedAt,
      happenedAtLabel: formatShortFriendlyDateTime(event.happenedAt),
      username: event.username,
    }));

  const logisticEvents = toLogisticEventList(item.logisticEvent)
    .sort(compareNewestFirst)
    .map((event, index) => ({
      id: `${item.id}-logistic-${event.happenedAt}-${index}`,
      kind: "logistic" as const,
      eventType: event.eventType,
      location: event.location,
      happenedAt: event.happenedAt,
      happenedAtLabel: formatShortFriendlyDateTime(event.happenedAt),
      username: event.username,
    }));

  const latestEvent = events[0];
  const latestPositionEvent =
    events.find((event) => event.eventType !== "sold_terminal") ?? latestEvent;
  const priceHistory = [...item.priceHistory]
    .sort(compareNewestFirst)
    .map((entry, index) => ({
      id: `${item.id}-price-${entry.happenedAt}-${index}`,
      price: entry.price,
      terminalType: entry.terminalType,
      orderId: entry.orderId,
      orderGroupId: entry.orderGroupId,
      happenedAt: entry.happenedAt,
      happenedAtLabel: formatShortFriendlyDateTime(entry.happenedAt),
    }));

  const isSold =
    item.lastSoldChannel != null || events[0]?.eventType === "sold_terminal";
  const soldEvent = events.find((e) => e.eventType === "sold_terminal");
  const timeToSellSeconds =
    isSold && soldEvent
      ? Math.floor(
          (new Date(soldEvent.happenedAt).getTime() -
            new Date(item.createdAt).getTime()) /
            1000,
        )
      : null;
  const timelineEvents = [...events, ...logisticEvents].sort(
    compareNewestFirst,
  );

  return {
    id: item.id,
    categoryLabel: item.itemCategory,
    skuLabel: buildSkuLabel(item.itemSku, item.productId),
    barcodeLabel: item.itemBarcode,
    title: item.itemTitle,
    imageUrl: normalizeShopifyImageUrl(item.itemImageUrl),
    productId: item.productId,
    itemType: item.itemType,
    itemHeight: item.itemHeight,
    itemWidth: item.itemWidth,
    itemDepth: item.itemDepth,
    volume: item.volume,
    createdAt: item.createdAt,
    isSold,
    timeToSellSeconds,
    lastModifiedAt: item.lastModifiedAt,
    lastModifiedLabel: formatLongFriendlyDateTime(item.lastModifiedAt),
    latestLocationLabel: resolveLatestLocationLabel({
      isSold,
      latestLocation: item.latestLocation,
      lastLogisticLocation: item.lastLogisticLocation,
      latestEventLocation: latestPositionEvent?.location,
      latestEventType: latestPositionEvent?.eventType,
    }),
    latestUsername:
      timelineEvents[0]?.username ?? latestEvent?.username ?? item.username,
    lastSoldChannel: item.lastSoldChannel ?? null,
    logisticsCompletedAt: item.logisticsCompletedAt ?? null,
    events: stripTimelineKind(events),
    logisticEvents: stripTimelineKind(logisticEvents),
    timelineEvents,
    priceHistory,
  };
}

export function formatTimeInStock(createdAt: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / 1000,
  );
  const days = Math.floor(seconds / 86400);
  if (days >= 365)
    return `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}mo`;
  if (days >= 30) return `${Math.floor(days / 30)}mo ${days % 30}d`;
  if (days > 0) return `${days}d`;
  const hours = Math.floor(seconds / 3600);
  if (hours > 0) return `${hours}h`;
  return `${Math.floor(seconds / 60)}m`;
}

export function formatSecondsToHumanDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  const days = Math.floor(seconds / 86400);
  if (days > 0) return `${days}d`;
  const hours = Math.floor(seconds / 3600);
  if (hours > 0) return `${hours}h`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m`;
}

export function formatShortFriendlyDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return shortDateTimeFormatter.format(date);
}

export function formatLongFriendlyDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return fullDateTimeFormatter.format(date);
}

export function buildSkuLabel(
  itemSku: string | null,
  productId: string,
): string {
  const trimmedSku = itemSku?.trim();

  if (trimmedSku) {
    return trimmedSku;
  }

  const trimmedProductId = productId.trim();

  if (trimmedProductId) {
    return trimmedProductId;
  }

  return "Unknown item";
}

function resolveLatestLocationLabel({
  isSold,
  latestLocation,
  lastLogisticLocation,
  latestEventLocation,
  latestEventType,
}: {
  isSold: boolean;
  latestLocation?: string | null;
  lastLogisticLocation?: string | null;
  latestEventLocation?: string | null;
  latestEventType?: ItemScanHistoryEvent["eventType"];
}): string {
  const trimmedLatestLocation = normalizeLocationLabel(latestLocation);
  const trimmedLastLogisticLocation =
    normalizeLocationLabel(lastLogisticLocation);
  const trimmedLatestEventLocation =
    latestEventType === "unknown_position"
      ? "Unknown"
      : normalizeLocationLabel(latestEventLocation);

  if (!isSold) {
    return (
      trimmedLatestLocation || trimmedLatestEventLocation || "No scans yet"
    );
  }

  return (
    trimmedLastLogisticLocation ||
    trimmedLatestLocation ||
    trimmedLatestEventLocation ||
    "No scans yet"
  );
}

function normalizeLocationLabel(location?: string | null): string | null {
  const trimmedLocation = location?.trim();

  if (!trimmedLocation) {
    return null;
  }

  if (trimmedLocation.toLowerCase() === "unknown_position") {
    return "Unknown";
  }

  return trimmedLocation;
}

function toLogisticEventList(
  value: ItemScanHistoryEntryDto["logisticEvent"],
): ItemScanHistoryLogisticEvent[] {
  if (!value) {
    return [];
  }

  const events = Array.isArray(value) ? value : [value];

  return events.map((event, index) => ({
    id: `logistic-${event.happenedAt}-${index}`,
    eventType: event.eventType,
    location: event.location,
    happenedAt: event.happenedAt,
    happenedAtLabel: formatShortFriendlyDateTime(event.happenedAt),
    username: event.username,
  }));
}

function stripTimelineKind<T extends { kind: string }>(
  items: T[],
): Array<Omit<T, "kind">> {
  return items.map(({ kind: _kind, ...item }) => item);
}

function compareNewestFirst(
  left: Pick<
    | ItemScanHistoryEvent
    | ItemScanHistoryLogisticEvent
    | ItemScanHistoryPriceHistory
    | ItemScanHistoryTimelineEvent,
    "happenedAt"
  >,
  right: Pick<
    | ItemScanHistoryEvent
    | ItemScanHistoryLogisticEvent
    | ItemScanHistoryPriceHistory
    | ItemScanHistoryTimelineEvent,
    "happenedAt"
  >,
): number {
  return toTimestamp(right.happenedAt) - toTimestamp(left.happenedAt);
}

function toTimestamp(value: string): number {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}
