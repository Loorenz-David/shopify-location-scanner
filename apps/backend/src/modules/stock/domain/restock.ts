import type { LocationStock } from "../contracts/stock.contract.js";

export const restockTarget = (row: Pick<LocationStock, "thresholds">): number =>
  row.thresholds.reduce((highest, threshold) => Math.max(highest, threshold.thresholdQuantity), 0);

export const missingItems = (row: Pick<LocationStock, "thresholds" | "instanceCount">): number =>
  Math.max(0, restockTarget(row) - row.instanceCount);
