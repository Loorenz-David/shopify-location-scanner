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
 * §12A.2: one entry per identity, summing each row's own gap. A surplus at one
 * location never fills a gap at another, so this is not
 * "sum of targets − sum of counts". The gap is counted in items, the same
 * currency as the thresholds: a set of 6 chairs is 1, and the set size travels
 * only in `properties.quantity` (Manager handoff v3 §2.1). Entries come out
 * sorted by identity key, so two runs on the same state send byte-identical
 * bodies.
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
    entry.quantityRequested += missingItems(row);
    grouped.set(key, entry);
  }

  return [...grouped.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([, entry]) => entry);
};
