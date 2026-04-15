import type { LogisticLocationDto } from "../types/logistic-locations.dto";
import type {
  LogisticLocationRecord,
  LogisticZoneType,
} from "../types/logistic-locations.types";
import type { LogisticIntention } from "../../logistic-tasks/types/logistic-tasks.types";

export const LOGISTIC_ZONE_TYPE_LABELS: Record<LogisticZoneType, string> = {
  for_delivery: "For Delivery",
  for_pickup: "For Pickup",
  for_fixing: "For Fixing",
};

export const LOGISTIC_ZONE_TYPES: LogisticZoneType[] = [
  "for_delivery",
  "for_pickup",
  "for_fixing",
];

export function normalizeLogisticLocation(
  dto: LogisticLocationDto,
): LogisticLocationRecord {
  return {
    id: dto.id,
    shopId: dto.shopId,
    location: dto.location,
    zoneType: dto.zoneType,
    createdAt: dto.createdAt,
  };
}

export function normalizeLogisticLocations(
  dtos: LogisticLocationDto[],
): LogisticLocationRecord[] {
  return dtos.map(normalizeLogisticLocation);
}

export function filterLogisticLocations(
  locations: LogisticLocationRecord[],
  query: string,
): LogisticLocationRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return locations;
  return locations.filter((loc) => loc.location.toLowerCase().includes(q));
}

export function sortWithRecentFirst(
  locations: LogisticLocationRecord[],
  recentlyAddedIds: string[],
): LogisticLocationRecord[] {
  if (recentlyAddedIds.length === 0) return locations;
  const recentSet = new Set(recentlyAddedIds);
  return [
    ...locations.filter((l) => recentSet.has(l.id)),
    ...locations.filter((l) => !recentSet.has(l.id)),
  ];
}

export function findLocationByValue(
  locations: LogisticLocationRecord[],
  value: string,
): LogisticLocationRecord | null {
  const q = value.trim().toLowerCase();
  return locations.find((l) => l.location.toLowerCase() === q) ?? null;
}

/**
 * Returns the primary expected zone for a given intention.
 * Returns null if there is no zone restriction.
 */
export function getExpectedZoneForIntention(
  intention: LogisticIntention | null,
): LogisticZoneType | null {
  if (!intention) return null;
  const map: Partial<Record<LogisticIntention, LogisticZoneType>> = {
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
export function hasPlacementZoneMismatch(
  intention: LogisticIntention | null,
  zoneType: LogisticZoneType,
  fixItem: boolean,
): boolean {
  if (zoneType === "for_fixing" && fixItem) return false;
  const expected = getExpectedZoneForIntention(intention);
  if (expected === null) return false;
  return zoneType !== expected;
}
