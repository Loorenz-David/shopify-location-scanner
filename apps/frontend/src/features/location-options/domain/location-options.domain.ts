import type { LocationOption } from "../types/location-options.types";

export function normalizeLocationOptions(values: string[]): LocationOption[] {
  const unique = Array.from(
    new Set(values.map((value) => value.trim())),
  ).filter(Boolean);

  return unique.map((value) => ({
    label: value,
    value,
  }));
}

export function filterLocationOptions(
  options: LocationOption[],
  query: string,
): LocationOption[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return options;
  }

  return options.filter((option) =>
    option.value.toLowerCase().includes(normalizedQuery),
  );
}
