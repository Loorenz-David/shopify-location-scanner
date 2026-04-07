import type {
  ScannerItem,
  ScannerLinkError,
  ScannerLocation,
} from "../types/scanner.types";

export function buildPairKey(
  item: ScannerItem,
  location: ScannerLocation,
): string {
  return `${item.idType}:${item.itemId}:${location.code}`;
}

export function buildCompactLinkErrorMessage(
  location: ScannerLocation | null,
  item: ScannerItem | null,
): string {
  const position = location?.label ?? "unknown";
  const sku = item?.sku ?? "unknown";
  return `error when setting position "${position}" on item "${sku}"`;
}

export function buildLinkError(
  error: unknown,
  item: ScannerItem | null,
  location: ScannerLocation | null,
): ScannerLinkError {
  const details =
    error instanceof Error
      ? error.message
      : "Unexpected error while linking item position";

  return {
    compactMessage: buildCompactLinkErrorMessage(location, item),
    details,
    sku: item?.sku,
    position: location?.label,
  };
}
