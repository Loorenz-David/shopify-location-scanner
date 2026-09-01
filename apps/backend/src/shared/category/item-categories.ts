/**
 * The closed vocabulary of item categories.
 *
 * These values are Shopify `productType` strings, stored verbatim — they are
 * both the persisted value and the label shown in the UI. Every resolution path
 * (productType matching and title parsing) must produce one of these or the
 * `"unknown"` sentinel; nothing else is ever written to ScanHistory.itemCategory.
 *
 * Ordering is presentational only. Adding a value here is safe; renaming one is
 * a data migration, because the string is also the stats aggregation key.
 */
export const ITEM_CATEGORIES = [
  "Dining Chairs",
  "Easy Chairs",
  "Armchairs",
  "Sofas",
  "Stools",
  "Seating Benches",
  "Serving Trolleys",
  "Dining Tables",
  "Bedside Tables",
  "Coffee Tables",
  "Side Tables",
  "Hall Tables",
  "Writing Desks",
  "Nest Of Tables",
  "Sideboards",
  "Highboards",
  "Bookshelves",
  "Shelving Units",
  "Chest of Drawers",
  "Secretary Cabinets",
  "Bar Cabinets",
  "Wardrobes",
  "Storage Cabinets",
  "Posters",
  "Mirrors",
  "Porcelain",
  "Carpets",
  "Lamps",
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

/**
 * Sentinel for "resolution produced nothing". Deliberately lowercase and
 * outside ITEM_CATEGORIES: the repair scripts use this literal as their
 * "needs re-resolution" marker.
 */
export const UNKNOWN_ITEM_CATEGORY = "unknown";

/**
 * Lookup key for tolerant productType matching.
 *
 * Shopify's productType is free text, and the store contains casing and
 * singular/plural variants of the same category ("Dining table" alongside
 * "Dining Tables", "sideboard" alongside "Sideboards"). Both sides of the
 * comparison run through this so those variants still land on the canonical
 * value instead of silently falling through to title parsing.
 */
const lookupKey = (value: string): string => {
  const normalized = value.toLowerCase().trim().replace(/\s+/g, " ");
  if (/(ch|sh|s|x|z)es$/.test(normalized)) {
    return normalized.slice(0, -2);
  }
  return normalized.endsWith("s") ? normalized.slice(0, -1) : normalized;
};

const CATEGORY_BY_LOOKUP_KEY: ReadonlyMap<string, ItemCategory> = new Map(
  ITEM_CATEGORIES.map((category) => [lookupKey(category), category]),
);

/**
 * Resolves a raw Shopify productType to a vocabulary value, or null when the
 * store uses a type we don't model.
 */
export const matchItemCategory = (
  productType: string | null | undefined,
): ItemCategory | null => {
  const trimmed = productType?.trim();
  if (!trimmed) {
    return null;
  }
  return CATEGORY_BY_LOOKUP_KEY.get(lookupKey(trimmed)) ?? null;
};

/**
 * Seating categories where a "set of N" title implies quantity N.
 * Matches Dining Chairs, Easy Chairs and Armchairs.
 */
export const isSeatingCategory = (itemCategory: string): boolean =>
  itemCategory.toLowerCase().includes("chair");
