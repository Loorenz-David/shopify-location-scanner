export const itemScanHistorySearchFieldOptions = [
    "sku",
    "barcode",
    "location",
    "itemTitle",
    "itemCategory",
    "username",
];
export const defaultItemScanHistoryFilters = {
    selectedFields: [],
    includeLocationHistory: false,
    status: "active",
    salesChannel: undefined,
    from: "",
    to: "",
};
const itemScanHistoryStatusOptions = ["active", "sold", "completed"];
function isItemScanHistoryStatusFilter(value) {
    return (typeof value === "string" &&
        itemScanHistoryStatusOptions.includes(value));
}
export function normalizeItemScanHistoryFilters(filters) {
    const normalizedFields = filters.selectedFields.filter((field) => itemScanHistorySearchFieldOptions.includes(field));
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
export function countActiveItemScanHistoryFilters(filters) {
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
export function serializeItemScanHistoryFiltersForRequest(filters) {
    const normalized = normalizeItemScanHistoryFilters(filters);
    return JSON.stringify(normalized);
}
export function applyItemScanHistoryLiveFilters(items, query, filters) {
    const normalizedQuery = query.trim().toLowerCase();
    const normalized = normalizeItemScanHistoryFilters(filters);
    return items.filter((item) => {
        if (!matchesQueryInSelectedFields(item, normalizedQuery, normalized.selectedFields, normalized.includeLocationHistory)) {
            return false;
        }
        if (!matchesDateRange(item.lastModifiedAt, normalized.from, normalized.to)) {
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
function matchesQueryInSelectedFields(item, normalizedQuery, selectedFields, includeLocationHistory) {
    if (!normalizedQuery) {
        return true;
    }
    const effectiveFields = selectedFields.length > 0
        ? selectedFields
        : itemScanHistorySearchFieldOptions;
    return effectiveFields.some((field) => {
        const values = getFieldValuesForSearch(item, field, includeLocationHistory);
        return values.some((value) => value.toLowerCase().includes(normalizedQuery));
    });
}
function matchesDateRange(lastModifiedAt, from, to) {
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
function matchesStatusFilter(item, status) {
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
function matchesSalesChannelFilter(item, salesChannel) {
    if (!salesChannel) {
        return true;
    }
    return item.lastSoldChannel === salesChannel;
}
function getFieldValuesForSearch(item, field, includeLocationHistory) {
    switch (field) {
        case "sku":
            return [item.skuLabel];
        case "barcode":
            return [item.barcodeLabel ?? ""];
        case "location":
            return includeLocationHistory
                ? [
                    item.latestLocationLabel,
                    ...item.timelineEvents.flatMap((event) => event.location ? [event.location] : []),
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
