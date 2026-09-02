import type { StockCountMode } from "../types/stock.types";

// Labels for the two counts (P7 D3). The current figure follows the mode; the
// missing figure is always items because thresholds are item-based, so in
// units mode its label says so.
export function stockCountLabels(countMode: StockCountMode): { current: string; missing: string } {
  return countMode === "units"
    ? { current: "Units", missing: "Missing items" }
    : { current: "Items", missing: "To normal" };
}

export function countNoun(count: number, countMode: StockCountMode): string {
  const singular = countMode === "units" ? "unit" : "item";
  return count === 1 ? singular : `${singular}s`;
}
