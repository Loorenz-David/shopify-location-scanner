import {
  formatLongFriendlyDateTime,
  normalizeItemScanHistoryItem,
} from "../domain/item-scan-history.domain";
import { useItemScanHistoryStore } from "../stores/item-scan-history.store";
import type { ItemScanHistoryEntryDto } from "../types/item-scan-history.dto";
import type {
  ItemScanHistoryEvent,
  ItemScanHistoryItem,
} from "../types/item-scan-history.types";
import type {
  LinkHistoryItemResponse,
  LinkItemPositionsResponse,
  ScannerItem,
} from "../../scanner/types/scanner.types";

const OPTIMISTIC_EVENT_USERNAME = "You";
const OPTIMISTIC_SKU_PREFIX = "* ";

export interface StartOptimisticLocationUpdateInput {
  item: ScannerItem;
  locationCode: string;
}

export interface ItemScanHistoryOptimisticUpdateToken {
  previousItems: ItemScanHistoryItem[];
  selectedItem: Pick<ScannerItem, "idType" | "itemId" | "sku">;
  optimisticItemId: string | null;
}

export function startOptimisticLocationUpdateController({
  item,
  locationCode,
}: StartOptimisticLocationUpdateInput): ItemScanHistoryOptimisticUpdateToken {
  const state = useItemScanHistoryStore.getState();
  const nowIso = new Date().toISOString();
  const nextEvent = buildOptimisticEvent(nowIso, locationCode);

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
    const optimisticItem = buildOptimisticHandleItem(
      item,
      locationCode,
      nowIso,
    );
    const dedupedItems = state.items.filter(
      (existing) => existing.id !== optimisticItem.id,
    );
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

export function commitOptimisticLocationUpdateController(
  token: ItemScanHistoryOptimisticUpdateToken,
  response: LinkItemPositionsResponse,
): void {
  const normalizedResponseItem = response.historyItem
    ? normalizeItemScanHistoryItem(
        toItemScanHistoryEntryDto(response.historyItem),
      )
    : null;

  useItemScanHistoryStore.setState((state) => {
    const nextItems = [...state.items];

    if (normalizedResponseItem) {
      const matchedIndex = findCommitTargetIndex(
        nextItems,
        token,
        normalizedResponseItem,
      );

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
    const fallbackPatched: ItemScanHistoryItem = {
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

export function rollbackOptimisticLocationUpdateController(
  token: ItemScanHistoryOptimisticUpdateToken,
): void {
  useItemScanHistoryStore.setState((state) => ({
    ...state,
    items: token.previousItems,
    total: Math.max(state.total, token.previousItems.length),
  }));
}

function buildOptimisticHandleItem(
  item: ScannerItem,
  locationCode: string,
  nowIso: string,
): ItemScanHistoryItem {
  const normalizedHandle = item.itemId.trim();

  return {
    id: `optimistic-handle-${normalizedHandle}`,
    categoryLabel: null,
    skuLabel: `${OPTIMISTIC_SKU_PREFIX}${normalizedHandle}`,
    barcodeLabel: null,
    title: item.title?.trim() || normalizedHandle,
    imageUrl: item.imageUrl ?? null,
    productId: normalizedHandle,
    itemType: "handle",
    itemHeight: null,
    itemWidth: null,
    itemDepth: null,
    volume: null,
    createdAt: nowIso,
    isSold: false,
    timeToSellSeconds: null,
    lastModifiedAt: nowIso,
    lastModifiedLabel: formatLongFriendlyDateTime(nowIso),
    latestLocationLabel: locationCode,
    latestUsername: OPTIMISTIC_EVENT_USERNAME,
    lastSoldChannel: null,
    events: [buildOptimisticEvent(nowIso, locationCode)],
    priceHistory: [],
  };
}

function buildOptimisticEvent(
  happenedAt: string,
  location: string,
): ItemScanHistoryEvent {
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

function findHistoryItemIndex(
  items: ItemScanHistoryItem[],
  scannerItem: ScannerItem,
): number {
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

function findCommitTargetIndex(
  items: ItemScanHistoryItem[],
  token: ItemScanHistoryOptimisticUpdateToken,
  normalizedResponseItem?: ItemScanHistoryItem,
): number {
  const optimisticId = token.optimisticItemId;
  if (optimisticId) {
    const optimisticIndex = items.findIndex((item) => item.id === optimisticId);
    if (optimisticIndex >= 0) {
      return optimisticIndex;
    }
  }

  if (normalizedResponseItem) {
    const responseIndex = items.findIndex(
      (item) =>
        item.id === normalizedResponseItem.id ||
        item.productId === normalizedResponseItem.productId,
    );

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

function toItemScanHistoryEntryDto(
  historyItem: LinkHistoryItemResponse,
): ItemScanHistoryEntryDto {
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
    lastModifiedAt: historyItem.lastModifiedAt,
    events: historyItem.events.map((event) => ({
      username: event.username,
      eventType: event.eventType,
      orderId: event.orderId,
      orderGroupId: event.orderGroupId,
      location: event.location,
      happenedAt: event.happenedAt,
    })),
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

function dedupeById(items: ItemScanHistoryItem[]): ItemScanHistoryItem[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}
