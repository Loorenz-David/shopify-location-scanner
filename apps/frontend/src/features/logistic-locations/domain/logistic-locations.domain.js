export const LOGISTIC_ZONE_TYPE_LABELS = {
    for_delivery: "For Delivery",
    for_pickup: "For Pickup",
    for_fixing: "For Fixing",
};
export const LOGISTIC_ZONE_TYPES = [
    "for_delivery",
    "for_pickup",
    "for_fixing",
];
export function normalizeLogisticLocation(dto) {
    return {
        id: dto.id,
        shopId: dto.shopId,
        location: dto.location,
        zoneType: dto.zoneType,
        createdAt: dto.createdAt,
    };
}
export function normalizeLogisticLocations(dtos) {
    return dtos.map(normalizeLogisticLocation);
}
export function normalizeLogisticLocationMatchValue(value) {
    return value
        .replace(/[\u200B-\u200D\uFEFF]/g, "")
        .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, "-")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}
export function filterLogisticLocations(locations, query) {
    const q = normalizeLogisticLocationMatchValue(query);
    if (!q)
        return locations;
    return locations.filter((loc) => normalizeLogisticLocationMatchValue(loc.location).includes(q));
}
export function sortWithRecentFirst(locations, recentlyAddedIds) {
    if (recentlyAddedIds.length === 0)
        return locations;
    const recentSet = new Set(recentlyAddedIds);
    return [
        ...locations.filter((l) => recentSet.has(l.id)),
        ...locations.filter((l) => !recentSet.has(l.id)),
    ];
}
export function findLocationByValue(locations, value) {
    const q = normalizeLogisticLocationMatchValue(value);
    return (locations.find((l) => normalizeLogisticLocationMatchValue(l.location) === q) ?? null);
}
/**
 * Returns the primary expected zone for a given intention.
 * Returns null if there is no zone restriction.
 */
export function getExpectedZoneForIntention(intention) {
    if (!intention)
        return null;
    const map = {
        local_delivery: "for_delivery",
        international_shipping: "for_delivery",
        store_pickup: "for_pickup",
    };
    return map[intention] ?? null;
}
/**
 * Returns true when the scanned zone does not match the item's intention.
 * for_fixing is only allowed without a mismatch warning if the item has fixItem=true.
 */
export function hasPlacementZoneMismatch(intention, zoneType, fixItem) {
    if (zoneType === "for_fixing" && fixItem)
        return false;
    const expected = getExpectedZoneForIntention(intention);
    if (expected === null)
        return false;
    return zoneType !== expected;
}
