import { formatLongFriendlyDateTime, normalizeItemScanHistoryItem, } from "../domain/item-scan-history.domain";
import { applyItemScanHistoryLiveFilters } from "../domain/item-scan-history-filters.domain";
import { useItemScanHistoryStore } from "../stores/item-scan-history.store";
const OPTIMISTIC_EVENT_USERNAME = "You";
const OPTIMISTIC_SKU_PREFIX = "* ";
export function startOptimisticLocationUpdateController({ item, locationCode, }) {
    const state = useItemScanHistoryStore.getState();
    const nowIso = new Date().toISOString();
    const nextEvent = buildOptimisticEvent(nowIso, locationCode);
    const nextTimelineEvent = { ...nextEvent, kind: "scan" };
    const matchedIndex = findHistoryItemIndex(state.items, item);
    const previousItems = state.items;
    if (matchedIndex >= 0) {
        const matchedItem = state.items[matchedIndex];
        const optimisticItem = {
            ...matchedItem,
            lastModifiedAt: nowIso,
            lastModifiedLabel: formatLongFriendlyDateTime(nowIso),
            latestLocationLabel: locationCode,
            latestUsername: OPTIMISTIC_EVENT_USERNAME,
            events: [nextEvent, ...matchedItem.events],
            timelineEvents: [nextTimelineEvent, ...matchedItem.timelineEvents],
        };
        const reorderedItems = [
            optimisticItem,
            ...state.items.filter((existing) => existing.id !== matchedItem.id),
        ];
        useItemScanHistoryStore.setState({
            items: reorderedItems,
            hasLoaded: true,
            errorMessage: null,
            total: Math.max(state.total, reorderedItems.length),
        });
        return {
            previousItems,
            selectedItem: {
                idType: item.idType,
                itemId: item.itemId,
                sku: item.sku,
            },
            optimisticItemId: matchedItem.id,
        };
    }
    if (item.idType === "handle") {
        const optimisticItem = buildOptimisticHandleItem(item, locationCode, nowIso);
        const dedupedItems = state.items.filter((existing) => existing.id !== optimisticItem.id);
        const nextItems = [optimisticItem, ...dedupedItems];
        useItemScanHistoryStore.setState({
            items: nextItems,
            hasLoaded: true,
            errorMessage: null,
            total: Math.max(state.total, nextItems.length),
        });
        return {
            previousItems,
            selectedItem: {
                idType: item.idType,
                itemId: item.itemId,
                sku: item.sku,
            },
            optimisticItemId: optimisticItem.id,
        };
    }
    return {
        previousItems,
        selectedItem: {
            idType: item.idType,
            itemId: item.itemId,
            sku: item.sku,
        },
        optimisticItemId: null,
    };
}
export function commitOptimisticLocationUpdateController(token, response) {
    const normalizedResponseItem = response.historyItem
        ? normalizeItemScanHistoryItem(toItemScanHistoryEntryDto(response.historyItem))
        : null;
    useItemScanHistoryStore.setState((state) => {
        const nextItems = [...state.items];
        if (normalizedResponseItem) {
            const matchedIndex = findCommitTargetIndex(nextItems, token, normalizedResponseItem);
            if (matchedIndex >= 0) {
                nextItems.splice(matchedIndex, 1);
            }
            nextItems.unshift(normalizedResponseItem);
            return {
                items: dedupeById(nextItems),
                hasLoaded: true,
                errorMessage: null,
                total: Math.max(state.total, nextItems.length),
            };
        }
        const fallbackIndex = findCommitTargetIndex(nextItems, token);
        if (fallbackIndex < 0) {
            return {
                items: nextItems,
                hasLoaded: true,
                errorMessage: null,
            };
        }
        const fallbackCurrent = nextItems[fallbackIndex];
        const fallbackPatched = {
            ...fallbackCurrent,
            latestLocationLabel: response.product.location,
            lastModifiedAt: response.product.updatedAt,
            lastModifiedLabel: formatLongFriendlyDateTime(response.product.updatedAt),
        };
        nextItems.splice(fallbackIndex, 1);
        nextItems.unshift(fallbackPatched);
        return {
            items: dedupeById(nextItems),
            hasLoaded: true,
            errorMessage: null,
            total: Math.max(state.total, nextItems.length),
        };
    });
}
export function rollbackOptimisticLocationUpdateController(token) {
    useItemScanHistoryStore.setState((state) => ({
        ...state,
        items: token.previousItems,
        total: Math.max(state.total, token.previousItems.length),
    }));
}
export function startOptimisticCompletionUpdateController(itemId, completed) {
    const state = useItemScanHistoryStore.getState();
    const previousItems = state.items;
    const previousTotal = state.total;
    const nowIso = new Date().toISOString();
    const nextItems = state.items.map((item) => item.id === itemId
        ? patchItemCompletionState(item, completed, nowIso)
        : item);
    const visibleItems = applyItemScanHistoryLiveFilters(nextItems, state.query, state.filters);
    const removedByFilters = nextItems.length > visibleItems.length;
    useItemScanHistoryStore.setState({
        items: visibleItems,
        total: removedByFilters
            ? Math.max(0, state.total - (nextItems.length - visibleItems.length))
            : state.total,
    });
    return { previousItems, previousTotal };
}
export function rollbackOptimisticCompletionUpdateController(token) {
    useItemScanHistoryStore.setState({
        items: token.previousItems,
        total: token.previousTotal,
    });
}
function buildOptimisticHandleItem(item, locationCode, nowIso) {
    const normalizedHandle = item.itemId.trim();
    const optimisticEvent = buildOptimisticEvent(nowIso, locationCode);
    return {
        id: `optimistic-handle-${normalizedHandle}`,
        categoryLabel: null,
        skuLabel: `${OPTIMISTIC_SKU_PREFIX}${normalizedHandle}`,
        barcodeLabel: null,
        title: item.title?.trim() || normalizedHandle,
        imageUrl: item.imageUrl ?? null,
        imageUrls: item.imageUrls ?? item.imageUrl ?? null,
        productId: normalizedHandle,
        itemType: "handle",
        itemHeight: null,
        itemWidth: null,
        itemDepth: null,
        volume: null,
        properties: null,
        quantity: item.quantity ?? 1,
        createdAt: nowIso,
        isSold: false,
        timeToSellSeconds: null,
        lastModifiedAt: nowIso,
        lastModifiedLabel: formatLongFriendlyDateTime(nowIso),
        latestLocationLabel: locationCode,
        latestUsername: OPTIMISTIC_EVENT_USERNAME,
        lastSoldChannel: null,
        logisticsCompletedAt: null,
        events: [optimisticEvent],
        logisticEvents: [],
        timelineEvents: [{ ...optimisticEvent, kind: "scan" }],
        priceHistory: [],
    };
}
function buildOptimisticEvent(happenedAt, location) {
    return {
        id: `optimistic-event-${happenedAt}`,
        eventType: "location_update",
        orderId: null,
        orderGroupId: null,
        location,
        happenedAt,
        happenedAtLabel: formatLongFriendlyDateTime(happenedAt),
        username: OPTIMISTIC_EVENT_USERNAME,
    };
}
function buildOptimisticLogisticEvent(happenedAt) {
    return {
        id: `optimistic-logistic-${happenedAt}`,
        eventType: "fulfilled",
        description: null,
        location: null,
        happenedAt,
        happenedAtLabel: formatLongFriendlyDateTime(happenedAt),
        username: OPTIMISTIC_EVENT_USERNAME,
    };
}
function patchItemCompletionState(item, completed, happenedAt) {
    if (completed) {
        const nextEvent = buildOptimisticLogisticEvent(happenedAt);
        const nextTimelineEvent = {
            ...nextEvent,
            kind: "logistic",
        };
        return {
            ...item,
            logisticsCompletedAt: happenedAt,
            logisticEvents: [nextEvent, ...item.logisticEvents],
            timelineEvents: [nextTimelineEvent, ...item.timelineEvents].sort(compareNewestFirst),
            latestUsername: OPTIMISTIC_EVENT_USERNAME,
        };
    }
    const logisticEvents = item.logisticEvents.filter((event) => event.eventType !== "fulfilled");
    const timelineEvents = item.timelineEvents.filter((event) => !(event.kind === "logistic" && event.eventType === "fulfilled"));
    return {
        ...item,
        logisticsCompletedAt: null,
        logisticEvents,
        timelineEvents,
        latestUsername: timelineEvents[0]?.username ??
            item.events[0]?.username ??
            item.latestUsername,
    };
}
function findHistoryItemIndex(items, scannerItem) {
    const normalizedItemId = scannerItem.itemId.trim().toLowerCase();
    const normalizedSku = scannerItem.sku.trim().toLowerCase();
    return items.findIndex((item) => {
        const productId = item.productId.trim().toLowerCase();
        const sku = item.skuLabel.trim().toLowerCase();
        if (scannerItem.idType === "product_id") {
            return productId === normalizedItemId;
        }
        return sku === normalizedSku || productId === normalizedItemId;
    });
}
function findCommitTargetIndex(items, token, normalizedResponseItem) {
    const optimisticId = token.optimisticItemId;
    if (optimisticId) {
        const optimisticIndex = items.findIndex((item) => item.id === optimisticId);
        if (optimisticIndex >= 0) {
            return optimisticIndex;
        }
    }
    if (normalizedResponseItem) {
        const responseIndex = items.findIndex((item) => item.id === normalizedResponseItem.id ||
            item.productId === normalizedResponseItem.productId);
        if (responseIndex >= 0) {
            return responseIndex;
        }
    }
    const itemId = token.selectedItem.itemId.trim().toLowerCase();
    const sku = token.selectedItem.sku.trim().toLowerCase();
    return items.findIndex((item) => {
        const productId = item.productId.trim().toLowerCase();
        const skuLabel = item.skuLabel
            .trim()
            .replace(/^\*\s*/, "")
            .toLowerCase();
        if (token.selectedItem.idType === "product_id") {
            return productId === itemId;
        }
        return skuLabel === sku || productId === itemId;
    });
}
function toItemScanHistoryEntryDto(historyItem) {
    return {
        id: historyItem.id,
        shopId: historyItem.shopId,
        userId: historyItem.userId,
        username: historyItem.username,
        productId: historyItem.productId,
        itemCategory: historyItem.itemCategory,
        itemSku: historyItem.itemSku,
        itemBarcode: historyItem.itemBarcode,
        itemType: historyItem.itemType,
        itemTitle: historyItem.itemTitle,
        itemImageUrl: historyItem.itemImageUrl,
        itemHeight: historyItem.itemHeight,
        itemWidth: historyItem.itemWidth,
        itemDepth: historyItem.itemDepth,
        volume: historyItem.volume,
        quantity: historyItem.quantity ?? 1,
        lastModifiedAt: historyItem.lastModifiedAt,
        latestLocation: historyItem.latestLocation,
        lastLogisticLocation: historyItem.lastLogisticLocation,
        logisticsCompletedAt: historyItem.logisticsCompletedAt,
        events: historyItem.events.map((event) => ({
            username: event.username,
            eventType: event.eventType,
            orderId: event.orderId,
            orderGroupId: event.orderGroupId,
            location: event.location,
            happenedAt: event.happenedAt,
        })),
        logisticEvents: historyItem.logisticEvents,
        logisticEvent: historyItem.logisticEvent,
        priceHistory: (historyItem.priceHistory ?? []).map((entry) => ({
            price: entry.price,
            terminalType: entry.terminalType,
            orderId: entry.orderId,
            orderGroupId: entry.orderGroupId,
            happenedAt: entry.happenedAt,
        })),
        createdAt: historyItem.createdAt,
        updatedAt: historyItem.updatedAt,
    };
}
function dedupeById(items) {
    const seen = new Set();
    return items.filter((item) => {
        if (seen.has(item.id)) {
            return false;
        }
        seen.add(item.id);
        return true;
    });
}
function compareNewestFirst(left, right) {
    return toTimestamp(right.happenedAt) - toTimestamp(left.happenedAt);
}
function toTimestamp(value) {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
}
