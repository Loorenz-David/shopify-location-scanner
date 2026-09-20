import type { LocationStock } from "../contracts/stock.contract.js";
import { canonicalCriteriaString, type StockCriteria } from "./property-criteria.js";
import { missingItems } from "./restock.js";

export type DemandEntry = {
  itemCategory: string;
  properties: StockCriteria;
  quantityRequested: number;
};

/**
 * §12A.1: the grouping key is built from the `properties` object that will be
 * sent, not from the stored `propertiesCanonical` column, so two entries of one
 * request can never resolve to the same Manager identity (handoff v2 §3.3 → 422).
 */
export const identityKeyOf = (itemCategory: string, propertiesCanonical: string): string =>
  `${itemCategory} ${propertiesCanonical}`;

export const identityKey = (row: Pick<LocationStock, "itemCategory" | "properties">): string =>
  identityKeyOf(row.itemCategory, canonicalCriteriaString(row.properties));

/**
 * §12A.2: the rule's set size, when it states exactly one. "Any value" and
 * several values can no longer be saved (§12A.11); the fallback to 1 stays as a
 * defence against rows written outside the API.
 */
export const unitsPerItem = (properties: StockCriteria): number => {
  const quantity = properties.quantity;
  if (!Array.isArray(quantity) || quantity.length !== 1) {
    return 1;
  }
  const value = quantity[0] ?? "";
  return /^[1-9][0-9]*$/.test(value) ? Number(value) : 1;
};

/**
 * True when a row states a set size that §12A.11 no longer allows to be saved
 * ("any value", or several values) and `unitsPerItem` therefore fell back to 1.
 * A single legitimate `["1"]` is not ambiguous. Worth one warn per sync.
 */
export const hasAmbiguousSetSize = (properties: StockCriteria): boolean => {
  if (!Object.prototype.hasOwnProperty.call(properties, "quantity")) {
    return false;
  }
  const quantity = properties.quantity;
  if (!Array.isArray(quantity) || quantity.length !== 1) {
    return true;
  }
  return !/^[1-9][0-9]*$/.test(quantity[0] ?? "");
};

/**
 * §12A.2: one entry per identity, summing each row's own gap. A surplus at one
 * location never fills a gap at another, so this is not
 * "sum of targets − sum of counts". Entries come out sorted by identity key, so
 * two runs on the same state send byte-identical bodies.
 */
export const computeStockDemand = (rows: readonly LocationStock[]): DemandEntry[] => {
  const grouped = new Map<string, DemandEntry>();

  for (const row of rows) {
    const key = identityKey(row);
    const entry = grouped.get(key) ?? {
      itemCategory: row.itemCategory,
      properties: row.properties,
      quantityRequested: 0,
    };
    entry.quantityRequested += missingItems(row) * unitsPerItem(row.properties);
    grouped.set(key, entry);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([, entry]) => entry);
};
