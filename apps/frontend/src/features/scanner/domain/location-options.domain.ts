import type {
  ScannerLocation,
  ScannerLocationOption,
} from "../types/scanner.types";

export const LOCATION_MANUAL_RESULTS_LIMIT = 50;

export const fallbackLocationOptions: ScannerLocationOption[] = [
  { label: "Rack A", value: "Rack A" },
  { label: "Rack B", value: "Rack B" },
  { label: "Rack C", value: "Rack C" },
  { label: "Rack D", value: "Rack D" },
  { label: "Rack E", value: "Rack E" },
];

export function filterLocationOptionsByQuery(
  options: ScannerLocationOption[],
  query: string,
): ScannerLocationOption[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return options;
  }

  return options.filter((option) =>
    option.label.toLowerCase().includes(normalizedQuery),
  );
}

export function mapLocationOptionsToScannerLocations(
  options: ScannerLocationOption[],
): ScannerLocation[] {
  return options.map((option) => ({
    code: option.value,
    label: option.label,
  }));
}

export function toLimitedLocationResults(
  options: ScannerLocationOption[],
): ScannerLocation[] {
  return mapLocationOptionsToScannerLocations(
    options.slice(0, LOCATION_MANUAL_RESULTS_LIMIT),
  );
}
