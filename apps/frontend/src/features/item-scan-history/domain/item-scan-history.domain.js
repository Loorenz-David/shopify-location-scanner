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
export function normalizeItemScanHistoryPayload(payload) {
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
export function normalizeItemScanHistoryItem(item) {
    const events = [...item.events]
        .sort(compareNewestFirst)
        .map((event, index) => ({
        id: `${item.id}-${event.happenedAt}-${index}`,
        kind: "scan",
        eventType: event.eventType,
        orderId: event.orderId,
        orderGroupId: event.orderGroupId,
        location: event.location,
        happenedAt: event.happenedAt,
        happenedAtLabel: formatShortFriendlyDateTime(event.happenedAt),
        username: event.username,
    }));
    const logisticEvents = toLogisticEventList({
        logisticEvents: item.logisticEvents,
        logisticEvent: item.logisticEvent,
    })
        .sort(compareNewestFirst)
        .map((event, index) => ({
        id: `${item.id}-logistic-${event.happenedAt}-${index}`,
        kind: "logistic",
        eventType: event.eventType,
        description: event.description,
        location: event.location,
        happenedAt: event.happenedAt,
        happenedAtLabel: formatShortFriendlyDateTime(event.happenedAt),
        username: event.username,
    }));
    const latestEvent = events[0];
    const soldEvent = events.find((event) => event.eventType === "sold_terminal");
    const timelineEvents = mergeNewestFirst(events, logisticEvents);
    const latestTimelineLocation = resolveLatestTimelineLocation(timelineEvents);
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
    const isSold = item.lastSoldChannel != null || events[0]?.eventType === "sold_terminal";
    const timeToSellSeconds = isSold && soldEvent
        ? Math.floor((new Date(soldEvent.happenedAt).getTime() -
            new Date(item.createdAt).getTime()) /
            1000)
        : null;
    return {
        id: item.id,
        categoryLabel: item.itemCategory,
        skuLabel: buildSkuLabel(item.itemSku, item.productId),
        barcodeLabel: item.itemBarcode,
        title: item.itemTitle,
        imageUrl: normalizeShopifyImageUrl(item.itemImageUrl),
        imageUrls: item.itemImageUrl,
        productId: item.productId,
        itemType: item.itemType,
        itemHeight: item.itemHeight,
        itemWidth: item.itemWidth,
        itemDepth: item.itemDepth,
        volume: item.volume,
        properties: item.properties ?? null,
        quantity: item.quantity ?? 1,
        createdAt: item.createdAt,
        isSold,
        timeToSellSeconds,
        lastModifiedAt: item.lastModifiedAt,
        lastModifiedLabel: formatLongFriendlyDateTime(item.lastModifiedAt),
        latestLocationLabel: resolveLatestLocationLabel({
            latestLocation: item.latestLocation,
            lastLogisticLocation: item.lastLogisticLocation,
            latestTimelineLocation,
        }),
        latestUsername: timelineEvents[0]?.username ?? latestEvent?.username ?? item.username,
        lastSoldChannel: item.lastSoldChannel ?? null,
        logisticsCompletedAt: item.logisticsCompletedAt ?? null,
        events: stripTimelineKind(events),
        logisticEvents: stripTimelineKind(logisticEvents),
        timelineEvents,
        priceHistory,
    };
}
export function formatTimeInStock(createdAt) {
    const seconds = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
    const days = Math.floor(seconds / 86400);
    if (days >= 365)
        return `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}mo`;
    if (days >= 30)
        return `${Math.floor(days / 30)}mo ${days % 30}d`;
    if (days > 0)
        return `${days}d`;
    const hours = Math.floor(seconds / 3600);
    if (hours > 0)
        return `${hours}h`;
    return `${Math.floor(seconds / 60)}m`;
}
export function formatSecondsToHumanDuration(seconds) {
    if (seconds === null)
        return "—";
    const days = Math.floor(seconds / 86400);
    if (days > 0)
        return `${days}d`;
    const hours = Math.floor(seconds / 3600);
    if (hours > 0)
        return `${hours}h`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
}
export function formatShortFriendlyDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return shortDateTimeFormatter.format(date);
}
export function formatLongFriendlyDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return fullDateTimeFormatter.format(date);
}
export function buildSkuLabel(itemSku, productId) {
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
function resolveLatestLocationLabel({ latestLocation, lastLogisticLocation, latestTimelineLocation, }) {
    const trimmedLatestLocation = normalizeLocationLabel(latestLocation);
    const trimmedLastLogisticLocation = normalizeLocationLabel(lastLogisticLocation);
    const trimmedLatestTimelineLocation = normalizeLocationLabel(latestTimelineLocation);
    return (trimmedLatestTimelineLocation ||
        trimmedLatestLocation ||
        trimmedLastLogisticLocation ||
        "No scans yet");
}
function normalizeLocationLabel(location) {
    const trimmedLocation = location?.trim();
    if (!trimmedLocation) {
        return null;
    }
    if (trimmedLocation.toLowerCase() === "unknown_position") {
        return "Unknown";
    }
    return trimmedLocation;
}
function toLogisticEventList(value) {
    const fromLogisticEvents = value.logisticEvents ?? [];
    const fromLogisticEvent = !value.logisticEvent
        ? []
        : Array.isArray(value.logisticEvent)
            ? value.logisticEvent
            : [value.logisticEvent];
    const dedupeMap = new Map();
    for (const event of [...fromLogisticEvents, ...fromLogisticEvent]) {
        const dedupeKey = [
            event.happenedAt,
            event.eventType,
            event.location ?? "",
            event.username,
        ].join("|");
        if (!dedupeMap.has(dedupeKey)) {
            dedupeMap.set(dedupeKey, event);
        }
    }
    return [...dedupeMap.values()].map((event, index) => ({
        id: `logistic-${event.happenedAt}-${index}`,
        eventType: event.eventType,
        description: normalizeDescription(event.description),
        location: event.location,
        happenedAt: event.happenedAt,
        happenedAtLabel: formatShortFriendlyDateTime(event.happenedAt),
        username: event.username,
    }));
}
function normalizeDescription(description) {
    const trimmedDescription = description?.trim();
    return trimmedDescription || null;
}
function stripTimelineKind(items) {
    return items.map((item) => {
        const { kind, ...rest } = item;
        void kind;
        return rest;
    });
}
function mergeNewestFirst(scanEvents, logisticEvents) {
    const merged = [];
    let scanIndex = 0;
    let logisticIndex = 0;
    while (scanIndex < scanEvents.length ||
        logisticIndex < logisticEvents.length) {
        const nextScan = scanEvents[scanIndex];
        const nextLogistic = logisticEvents[logisticIndex];
        if (!nextLogistic) {
            merged.push(nextScan);
            scanIndex += 1;
            continue;
        }
        if (!nextScan) {
            merged.push(nextLogistic);
            logisticIndex += 1;
            continue;
        }
        if (compareNewestFirst(nextScan, nextLogistic) <= 0) {
            merged.push(nextScan);
            scanIndex += 1;
        }
        else {
            merged.push(nextLogistic);
            logisticIndex += 1;
        }
    }
    return merged;
}
function resolveLatestTimelineLocation(timelineEvents) {
    for (const event of timelineEvents) {
        if (event.kind === "scan" && event.eventType === "sold_terminal") {
            continue;
        }
        const normalizedLocation = event.kind === "scan"
            ? normalizeScanEventLocationLabel(event)
            : normalizeLocationLabel(event.location);
        if (normalizedLocation) {
            return normalizedLocation;
        }
    }
    return null;
}
function normalizeScanEventLocationLabel(event) {
    if (!event) {
        return null;
    }
    if (event.eventType === "unknown_position") {
        return "Unknown";
    }
    return normalizeLocationLabel(event.location);
}
function compareNewestFirst(left, right) {
    return toTimestamp(right.happenedAt) - toTimestamp(left.happenedAt);
}
function toTimestamp(value) {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
}
