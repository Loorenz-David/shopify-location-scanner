import type { ScannerLocation } from "../types/scanner.types";

export const fallbackLocations: ScannerLocation[] = [
  { code: "A1", label: "A1" },
  { code: "A2", label: "A2" },
  { code: "B1", label: "B1" },
  { code: "B2", label: "B2" },
  { code: "C1", label: "C1" },
];

export function filterLocationsByQuery(
  locations: ScannerLocation[],
  query: string,
): ScannerLocation[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return locations;
  }

  return locations.filter((location) =>
    location.label.toLowerCase().includes(normalizedQuery),
  );
}
