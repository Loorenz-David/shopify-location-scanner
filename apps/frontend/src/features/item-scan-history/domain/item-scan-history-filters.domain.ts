import type { ItemScanHistoryItem } from "../types/item-scan-history.types";
import type {
  ItemScanHistoryFilters,
  ItemScanHistorySearchField,
  ItemScanHistoryStatusFilter,
} from "../types/item-scan-history-filters.types";

export const itemScanHistorySearchFieldOptions: ItemScanHistorySearchField[] = [
  "sku",
  "barcode",
  "location",
  "itemTitle",
  "itemCategory",
  "username",
];

export const defaultItemScanHistoryFilters: ItemScanHistoryFilters = {
  selectedFields: [],
  includeLocationHistory: false,
  status: "active",
  salesChannel: undefined,
  from: "",
  to: "",
};

const itemScanHistoryStatusOptions = ["active", "sold", "completed"] as const;

function isItemScanHistoryStatusFilter(
  value: unknown,
): value is ItemScanHistoryStatusFilter {
  return (
    typeof value === "string" &&
    itemScanHistoryStatusOptions.includes(
      value as ItemScanHistoryStatusFilter,
    )
  );
}

export function normalizeItemScanHistoryFilters(
  filters: ItemScanHistoryFilters,
): ItemScanHistoryFilters {
  const normalizedFields = filters.selectedFields.filter((field) =>
    itemScanHistorySearchFieldOptions.includes(field),
  );

  return {
    selectedFields: Array.from(new Set(normalizedFields)),
    includeLocationHistory: Boolean(filters.includeLocationHistory),
    status: isItemScanHistoryStatusFilter(filters.status)
      ? filters.status
      : undefined,
    salesChannel: filters.salesChannel,
    from: filters.from.trim(),
    to: filters.to.trim(),
  };
}

export function countActiveItemScanHistoryFilters(
  filters: ItemScanHistoryFilters,
): number {
  const normalized = normalizeItemScanHistoryFilters(filters);
  const hasCustomFields = normalized.selectedFields.length > 0;

  return [
    hasCustomFields ? "1" : "",
    normalized.includeLocationHistory ? "1" : "",
    normalized.status ? "1" : "",
    normalized.salesChannel ?? "",
    normalized.from,
    normalized.to,
  ].filter(Boolean).length;
}

export function serializeItemScanHistoryFiltersForRequest(
  filters: ItemScanHistoryFilters,
): string {
  const normalized = normalizeItemScanHistoryFilters(filters);

  return JSON.stringify(normalized);
}

export function applyItemScanHistoryLiveFilters(
  items: ItemScanHistoryItem[],
  query: string,
  filters: ItemScanHistoryFilters,
): ItemScanHistoryItem[] {
  const normalizedQuery = query.trim().toLowerCase();
  const normalized = normalizeItemScanHistoryFilters(filters);

  return items.filter((item) => {
    if (
      !matchesQueryInSelectedFields(
        item,
        normalizedQuery,
        normalized.selectedFields,
        normalized.includeLocationHistory,
      )
    ) {
      return false;
    }

    if (
      !matchesDateRange(item.lastModifiedAt, normalized.from, normalized.to)
    ) {
      return false;
    }

    if (!matchesStatusFilter(item, normalized.status)) {
      return false;
    }

    if (!matchesSalesChannelFilter(item, normalized.salesChannel)) {
      return false;
    }

    return true;
  });
}

function matchesQueryInSelectedFields(
  item: ItemScanHistoryItem,
  normalizedQuery: string,
  selectedFields: ItemScanHistorySearchField[],
  includeLocationHistory: boolean,
): boolean {
  if (!normalizedQuery) {
    return true;
  }

  const effectiveFields =
    selectedFields.length > 0
      ? selectedFields
      : itemScanHistorySearchFieldOptions;

  return effectiveFields.some((field) => {
    const values = getFieldValuesForSearch(item, field, includeLocationHistory);
    return values.some((value) =>
      value.toLowerCase().includes(normalizedQuery),
    );
  });
}

function matchesDateRange(
  lastModifiedAt: string,
  from: string,
  to: string,
): boolean {
  if (!from && !to) {
    return true;
  }

  const valueTime = new Date(lastModifiedAt).getTime();
  if (Number.isNaN(valueTime)) {
    return false;
  }

  if (from) {
    const fromTime = new Date(`${from}T00:00:00`).getTime();
    if (!Number.isNaN(fromTime) && valueTime < fromTime) {
      return false;
    }
  }

  if (to) {
    const toTime = new Date(`${to}T23:59:59.999`).getTime();
    if (!Number.isNaN(toTime) && valueTime > toTime) {
      return false;
    }
  }

  return true;
}

function matchesStatusFilter(
  item: ItemScanHistoryItem,
  status: ItemScanHistoryFilters["status"],
): boolean {
  const isSold = item.isSold;

  if (!status) {
    return true;
  }

  if (status === "completed") {
    return Boolean(item.logisticsCompletedAt);
  }

  if (status === "sold") {
    return isSold && !item.logisticsCompletedAt;
  }

  return !isSold;
}

function matchesSalesChannelFilter(
  item: ItemScanHistoryItem,
  salesChannel: ItemScanHistoryFilters["salesChannel"],
): boolean {
  if (!salesChannel) {
    return true;
  }

  return item.lastSoldChannel === salesChannel;
}

function getFieldValuesForSearch(
  item: ItemScanHistoryItem,
  field: ItemScanHistorySearchField,
  includeLocationHistory: boolean,
): string[] {
  switch (field) {
    case "sku":
      return [item.skuLabel];
    case "barcode":
      return [item.barcodeLabel ?? ""];
    case "location":
      return includeLocationHistory
        ? [
            item.latestLocationLabel,
            ...item.timelineEvents.flatMap((event) =>
              event.location ? [event.location] : [],
            ),
          ]
        : [item.latestLocationLabel];
    case "itemTitle":
      return [item.title];
    case "itemCategory":
      return [item.categoryLabel ?? ""];
    case "username":
      return [
        item.latestUsername,
        ...item.timelineEvents.map((event) => event.username),
      ];
  }
}
