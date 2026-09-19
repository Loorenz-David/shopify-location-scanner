import type { LocationStock } from "../contracts/stock.contract.js";
import { canonicalCriteriaString, type StockCriteria } from "./property-criteria.js";
import { missingItems } from "./restock.js";

export type DemandEntry = { itemCategory: string; properties: StockCriteria; quantityRequested: number };
export const identityKey = (row: Pick<LocationStock, "itemCategory" | "properties">): string =>
  `${row.itemCategory}\u0000${canonicalCriteriaString(row.properties)}`;

export const unitsPerItem = (properties: StockCriteria): number => {
  const quantity = properties.quantity;
  if (!Array.isArray(quantity) || quantity.length !== 1 || !/^[1-9][0-9]*$/.test(quantity[0] ?? "")) return 1;
  return Number(quantity[0]);
};

export const computeStockDemand = (rows: readonly LocationStock[]): DemandEntry[] => {
  const grouped = new Map<string, DemandEntry>();
  for (const row of rows) {
    const key = identityKey(row);
    const entry = grouped.get(key) ?? { itemCategory: row.itemCategory, properties: row.properties, quantityRequested: 0 };
    entry.quantityRequested += missingItems(row) * unitsPerItem(row.properties);
    grouped.set(key, entry);
  }
  return [...grouped.entries()].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([, entry]) => entry);
};
