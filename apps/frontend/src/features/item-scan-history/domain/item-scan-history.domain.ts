import type {
  ItemScanHistoryEntryDto,
  ItemScanHistoryPayloadDto,
} from "../types/item-scan-history.dto";
import type {
  ItemScanHistoryEvent,
  ItemScanHistoryItem,
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
  };
}

export function normalizeItemScanHistoryItem(
  item: ItemScanHistoryEntryDto,
): ItemScanHistoryItem {
  const events = [...item.events]
    .sort(compareNewestFirst)
    .map((event, index) => ({
      id: `${item.id}-${event.happenedAt}-${index}`,
      location: event.location,
      happenedAt: event.happenedAt,
      happenedAtLabel: formatShortFriendlyDateTime(event.happenedAt),
      username: event.username,
    }));

  const latestEvent = events[0];

  return {
    id: item.id,
    skuLabel: buildSkuLabel(item.itemSku, item.productId),
    title: item.itemTitle,
    imageUrl: normalizeShopifyImageUrl(item.itemImageUrl),
    productId: item.productId,
    itemType: item.itemType,
    lastModifiedAt: item.lastModifiedAt,
    lastModifiedLabel: formatLongFriendlyDateTime(item.lastModifiedAt),
    latestLocationLabel: latestEvent?.location ?? "No scans yet",
    latestUsername: latestEvent?.username ?? item.username,
    events,
  };
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

function compareNewestFirst(
  left: Pick<ItemScanHistoryEvent, "happenedAt">,
  right: Pick<ItemScanHistoryEvent, "happenedAt">,
): number {
  return toTimestamp(right.happenedAt) - toTimestamp(left.happenedAt);
}

function toTimestamp(value: string): number {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}
