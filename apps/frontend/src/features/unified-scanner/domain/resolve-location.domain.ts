import { findLocationByValue } from "../../logistic-locations/domain/logistic-locations.domain";
import type { LogisticLocationRecord } from "../../logistic-locations/types/logistic-locations.types";
import type {
  LocationScannerMode,
  ResolvedLocation,
  ScannerLocationOption,
} from "../types/unified-scanner.types";

export function resolveShopLocation(
  code: string,
  options: ScannerLocationOption[],
): ResolvedLocation | null {
  const normalizedCode = code.trim().toLowerCase();
  if (!normalizedCode) {
    return null;
  }

  const matchedOption =
    options.find((option) => option.value.trim().toLowerCase() === normalizedCode) ??
    options.find((option) => option.label.trim().toLowerCase() === normalizedCode) ??
    null;

  if (!matchedOption) {
    return null;
  }

  return {
    mode: "shop",
    code: matchedOption.value,
    label: matchedOption.label,
  };
}

export function resolveLogisticLocation(
  value: string,
  locations: LogisticLocationRecord[],
): ResolvedLocation | null {
  const match = findLocationByValue(locations, value);
  if (!match) {
    return null;
  }

  return {
    mode: "logistic",
    id: match.id,
    location: match.location,
    zoneType: match.zoneType,
  };
}

export function resolveLocation(
  value: string,
  mode: LocationScannerMode | null,
  shopOptions: ScannerLocationOption[],
  logisticLocations: LogisticLocationRecord[],
): ResolvedLocation | null {
  if (!mode) {
    return null;
  }

  // The mode is a preference, not a restriction: when a value exists in both
  // sets, the item's preferred set wins.
  if (mode === "shop") {
    return (
      resolveShopLocation(value, shopOptions) ??
      resolveLogisticLocation(value, logisticLocations)
    );
  }

  return (
    resolveLogisticLocation(value, logisticLocations) ??
    resolveShopLocation(value, shopOptions)
  );
}
